// @vitest-environment jsdom
//
// Regression: the project layout rendered the 404 "Project Not Found" screen
// for EVERY failed load, because ProjectsContext.loadActiveProject collapses a
// real 404 and an unreachable server into the same falsy result. A user whose
// request never landed was told their project had been deleted. Only an actual
// 404 may claim the project does not exist; anything else is an error with a
// retry.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, act, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({
  usePathname: () => "/proj/database",
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock("@/utils/api", () => ({ getProjectByCode: vi.fn() }));
vi.mock("@/context/LayoutContext", () => ({
  useLayoutContext: () => ({ sidebarClosed: false, toggleSidebar: vi.fn() }),
}));
// Chrome that only renders on the success path; stubbed so the test does not
// drag in the storage/dialog providers.
vi.mock("@/components/FileUploader", () => ({ default: () => null }));
vi.mock("@/components/UserSidebar", () => ({ default: ({ children }) => <div>{children}</div> }));
vi.mock("@/components/LayoutWrapper", () => ({
  default: ({ children }) => <div>{children}</div>,
}));

const setActiveProject = vi.fn();
let activeProject = null;
vi.mock("@/context/ProjectsContext", () => ({
  useProjectsContext: () => ({ activeProject, setActiveProject }),
}));

import { getProjectByCode } from "@/utils/api";
import ProjectLayout from "./layout";

function response({ ok, status, body = {} }) {
  return { ok, status, json: async () => body };
}

async function renderLayout() {
  await act(async () => {
    render(<ProjectLayout>content</ProjectLayout>);
  });
}

describe("project layout load failures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    activeProject = null;
  });
  afterEach(() => cleanup());

  it("shows 404 only for a real 404", async () => {
    getProjectByCode.mockResolvedValue(
      response({ ok: false, status: 404, body: { message: "Project was not found!" } })
    );

    await renderLayout();

    expect(screen.getByText("Project Not Found")).toBeTruthy();
  });

  it("shows an error with a retry — not 404 — when the request never lands", async () => {
    getProjectByCode.mockRejectedValue(new TypeError("Failed to fetch"));

    await renderLayout();

    expect(screen.queryByText("Project Not Found")).toBeNull();
    expect(screen.getByText("Couldn't load this project")).toBeTruthy();

    // Retry re-issues the request and recovers.
    activeProject = { code: "proj", name: "Proj" };
    getProjectByCode.mockResolvedValue(
      response({ ok: true, status: 200, body: { code: "proj", name: "Proj" } })
    );
    await act(async () => {
      fireEvent.click(screen.getByText("Try Again"));
    });

    expect(getProjectByCode).toHaveBeenCalledTimes(2);
    expect(setActiveProject).toHaveBeenCalledWith({ code: "proj", name: "Proj" });
    expect(screen.queryByText("Couldn't load this project")).toBeNull();
  });

  it("shows an error — not 404 — on a server error", async () => {
    getProjectByCode.mockResolvedValue(
      response({ ok: false, status: 500, body: { message: "boom" } })
    );

    await renderLayout();

    expect(screen.queryByText("Project Not Found")).toBeNull();
    expect(screen.getByText("boom")).toBeTruthy();
  });

  it("renders the project once loaded", async () => {
    activeProject = { code: "proj", name: "Proj" };
    getProjectByCode.mockResolvedValue(
      response({ ok: true, status: 200, body: activeProject })
    );

    await renderLayout();

    expect(screen.getByText("content")).toBeTruthy();
  });
});
