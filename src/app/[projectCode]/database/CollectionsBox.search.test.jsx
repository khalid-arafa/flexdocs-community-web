// @vitest-environment jsdom
//
// Regressions for the collections panel:
//
//  1. The magnifier button was `setSearchTerm(searchTerm)` — setting state to
//     the value it already held, so clicking it did nothing whatsoever.
//  2. "Search" was a client-side startsWith over the pages already fetched, so
//     a match on page 2+ was unreachable and a mid-name match never matched.
//     It now goes to the server, which filters every collection.
//  3. A failed load rendered "No collections found", i.e. a failure was
//     indistinguishable from an empty project.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

const fakeSocket = { on: vi.fn(), off: vi.fn(), emit: vi.fn() };
vi.mock("@/utils/socket", () => ({ getSocket: () => fakeSocket }));
vi.mock("react-toastify", () => ({ toast: vi.fn() }));
vi.mock("@/components/CustomDialog", () => ({ showDialog: vi.fn() }));
vi.mock("@/context/LayoutContext", () => ({
  useLayoutContext: () => ({ sidebarClosed: false }),
}));
// Stable identity, like the real context's state — a fresh object per render
// would make every memo downstream of it churn.
const activeProject = { code: "proj", projectToken: "tok" };
vi.mock("@/context/ProjectsContext", () => ({
  useProjectsContext: () => ({ activeProject }),
}));
vi.mock("@/utils/api", () => ({ getDatabaseCollections: vi.fn() }));

// The panel reads searchTerm from DatabaseContext, so the mocked hook holds it
// in real React state — otherwise typing could never re-render the component.
let dbValue = {};
vi.mock("@/context/DatabaseContext", () => ({
  useDatabaseContext: () => {
    const [searchTerm, setSearchTerm] = React.useState("");
    return { ...dbValue, searchTerm, setSearchTerm };
  },
}));

import { getDatabaseCollections } from "@/utils/api";
import CollectionsBox from "./CollectionsBox";

function baseDbValue(overrides = {}) {
  return {
    collections: [],
    setCollections: vi.fn(),
    totalCollectionsCount: 0,
    setTotalCollectionsCount: vi.fn(),
    loadingCollections: false,
    loadCollections: vi.fn(),
    selectedCollection: null,
    setSelectedCollection: vi.fn(),
    selectCollection: vi.fn(),
    documentsPage: 1,
    loadCollectionDocuments: vi.fn(),
    loadingMoreCollections: false,
    collectionsPage: 1,
    setCollectionsPage: vi.fn(),
    error: null,
    ...overrides,
  };
}

function okResponse(collections, totalCount = collections.length) {
  return { ok: true, status: 200, json: async () => ({ collections, totalCount }) };
}

describe("CollectionsBox search", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbValue = baseDbValue();
  });
  // vitest globals are off, so testing-library's auto-cleanup never registers.
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("runs a SERVER search when the search button is clicked (it used to be a no-op)", async () => {
    vi.useFakeTimers();
    getDatabaseCollections.mockResolvedValue(okResponse([{ name: "user_profiles", documentsCount: 3 }]));

    render(<CollectionsBox />);
    fireEvent.change(screen.getByPlaceholderText("Search collections..."), {
      target: { value: "profile" },
    });

    // Still debouncing — nothing has gone out yet.
    expect(getDatabaseCollections).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText("Search collections"));
    await act(async () => {});

    expect(getDatabaseCollections).toHaveBeenCalledWith({
      projectCode: "proj",
      // A mid-name term: the old client-side startsWith would have matched
      // nothing at all here.
      search: "profile",
      page: 1,
    });
    expect(screen.getByText("user_profiles")).toBeTruthy();

    // The click cancelled the pending debounce, so no duplicate request.
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });
    expect(getDatabaseCollections).toHaveBeenCalledTimes(1);
  });

  it("searches on Enter too", async () => {
    vi.useFakeTimers();
    getDatabaseCollections.mockResolvedValue(okResponse([]));

    render(<CollectionsBox />);
    const input = screen.getByPlaceholderText("Search collections...");
    fireEvent.change(input, { target: { value: "orders" } });
    fireEvent.keyDown(input, { key: "Enter" });
    await act(async () => {});

    expect(getDatabaseCollections).toHaveBeenCalledWith({
      projectCode: "proj",
      search: "orders",
      page: 1,
    });
    // An empty result set says so, rather than claiming the project has none.
    expect(screen.getByText('No collections match "orders"')).toBeTruthy();
  });

  it("pages through search results instead of hiding Load More", async () => {
    vi.useFakeTimers();
    getDatabaseCollections
      .mockResolvedValueOnce(okResponse([{ name: "a_log" }], 2))
      .mockResolvedValueOnce(okResponse([{ name: "b_log" }], 2));

    render(<CollectionsBox />);
    fireEvent.change(screen.getByPlaceholderText("Search collections..."), {
      target: { value: "log" },
    });
    fireEvent.click(screen.getByLabelText("Search collections"));
    await act(async () => {});

    fireEvent.click(screen.getByText("Load More"));
    await act(async () => {});

    expect(getDatabaseCollections).toHaveBeenLastCalledWith({
      projectCode: "proj",
      search: "log",
      page: 2,
    });
    expect(screen.getByText("a_log")).toBeTruthy();
    expect(screen.getByText("b_log")).toBeTruthy();
  });

  it("surfaces a failed search with a retry", async () => {
    vi.useFakeTimers();
    getDatabaseCollections.mockRejectedValue(new Error("offline"));

    render(<CollectionsBox />);
    fireEvent.change(screen.getByPlaceholderText("Search collections..."), {
      target: { value: "x" },
    });
    fireEvent.click(screen.getByLabelText("Search collections"));
    await act(async () => {});

    expect(screen.getByText("Failed to search collections")).toBeTruthy();
    expect(screen.queryByText("No collections found")).toBeNull();

    getDatabaseCollections.mockResolvedValue(okResponse([{ name: "xdata" }]));
    fireEvent.click(screen.getByText("Try Again"));
    await act(async () => {});
    expect(screen.getByText("xdata")).toBeTruthy();
  });
});

describe("CollectionsBox load failure", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("renders the error and a retry instead of 'No collections found'", () => {
    const loadCollections = vi.fn();
    dbValue = baseDbValue({
      error: "Failed to load collections",
      loadCollections,
      collectionsPage: 1,
    });

    render(<CollectionsBox />);

    expect(screen.getByText("Failed to load collections")).toBeTruthy();
    expect(screen.queryByText("No collections found")).toBeNull();

    fireEvent.click(screen.getByText("Try Again"));
    expect(loadCollections).toHaveBeenCalledWith({ page: 1, projectCode: "proj" });
  });

  it("still says 'No collections found' when the load genuinely returned nothing", () => {
    dbValue = baseDbValue({ error: null });
    render(<CollectionsBox />);
    expect(screen.getByText("No collections found")).toBeTruthy();
  });
});
