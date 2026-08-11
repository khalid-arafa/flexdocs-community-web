// @vitest-environment jsdom
//
// Regression for the realtime counter bugs (W1.1 drift, W1.2 multi-delete).
// The handler is registered on the socket by an effect; we capture it and drive
// events through it, then assert the total is updated FUNCTIONALLY (prev => …)
// and by the correct amount. A functional updater is what makes the count
// immune to the stale-closure drift, and delete must subtract the batch length,
// not a hardcoded 1.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";

// One shared fake socket whose `.on` captures the handler under test.
const socketHandlers = {};
const fakeSocket = {
  on: vi.fn((room, handler) => {
    socketHandlers[room] = handler;
  }),
  off: vi.fn(),
  emit: vi.fn(),
};

vi.mock("@/utils/socket", () => ({ getSocket: () => fakeSocket }));
vi.mock("react-toastify", () => ({ toast: vi.fn() }));
vi.mock("@/components/CustomDialog", () => ({ showDialog: vi.fn() }));
vi.mock("@/context/LayoutContext", () => ({
  useLayoutContext: () => ({ sidebarClosed: false }),
}));
vi.mock("@/context/ProjectsContext", () => ({
  useProjectsContext: () => ({
    activeProject: { code: "proj", projectToken: "tok" },
  }),
}));
vi.mock("@/context/DialogsContext", () => ({
  useDialogs: () => ({ confirm: vi.fn() }),
}));

const dbValue = {
  selectedCollection: { name: "posts" },
  selectedDocument: null,
  setSelectedDocument: vi.fn(),
  loadingCollectionDocuments: false,
  collectionDocuments: [],
  totalCollectionDocumentsCount: 0,
  loadingMoreCollectionDocuments: false,
  documentsPage: 1,
  setDocumentsPage: vi.fn(),
  setCollectionDocuments: vi.fn(),
  setTotalCollectionDocumentsCount: vi.fn(),
  setCollections: vi.fn(),
  setTotalCollectionsCount: vi.fn(),
  setSelectedCollection: vi.fn(),
};
vi.mock("@/context/DatabaseContext", () => ({
  useDatabaseContext: () => dbValue,
}));

import DocumentsBox from "./DocumentsBox";

function captureHandler() {
  render(<DocumentsBox />);
  const room = "update:proj/posts";
  const handler = socketHandlers[room];
  expect(handler).toBeTypeOf("function");
  return handler;
}

// Apply the functional-updater that was passed to a setState spy.
function appliedFrom(spy, base) {
  const arg = spy.mock.calls.at(-1)[0];
  expect(arg).toBeTypeOf("function"); // must be functional, not a bare value
  return arg(base);
}

describe("DocumentsBox realtime counters", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
  });

  it("adds by the batch length, functionally", async () => {
    const handler = captureHandler();
    await handler({ add: [{ _id: "1" }, { _id: "2" }, { _id: "3" }] });

    // prev 10 -> 13, and it must be a function (so two events don't both read a
    // stale base and drift).
    expect(appliedFrom(dbValue.setTotalCollectionDocumentsCount, 10)).toBe(13);
  });

  it("subtracts the FULL batch length on delete, not 1", async () => {
    const handler = captureHandler();
    await handler({ delete: [{ _id: "1" }, { _id: "2" }, { _id: "3" }] });

    // The old code did `total - 1` regardless of batch size. prev 10 -> 7.
    expect(appliedFrom(dbValue.setTotalCollectionDocumentsCount, 10)).toBe(7);
  });

  it("composes successive events without drift", async () => {
    const handler = captureHandler();
    // Two adds in a row: with functional updaters the second builds on the
    // first (12 -> 14 -> 15), which is exactly what the stale closure broke.
    await handler({ add: [{ _id: "a" }, { _id: "b" }] });
    let total = appliedFrom(dbValue.setTotalCollectionDocumentsCount, 12);
    expect(total).toBe(14);
    await handler({ add: [{ _id: "c" }] });
    total = appliedFrom(dbValue.setTotalCollectionDocumentsCount, total);
    expect(total).toBe(15);
  });
});
