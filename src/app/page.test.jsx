// @vitest-environment jsdom
//
// Regressions for the projects dashboard:
//
//  1. It loaded page 1 and stopped. The admin endpoint pages at 40, so an admin
//     with more than 40 projects could not reach the rest at all.
//  2. A failed load fell through to the "No projects yet / Create First
//     Project" empty state, which reads as data loss.

import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/AdminSidebar", () => ({ default: () => null }));
vi.mock("@/components/LayoutWrapper", () => ({
  default: ({ children }) => <div>{children}</div>,
}));
// framer-motion's props are animation directives, not DOM attributes — drop
// them so React does not warn about unknown attributes.
vi.mock("framer-motion", () => ({
  motion: new Proxy(
    {},
    {
      get:
        (_target, tag) =>
        ({ children, whileHover, whileTap, initial, animate, transition, ...rest }) =>
          React.createElement(tag, rest, children),
    }
  ),
}));

let ctx = {};
vi.mock("@/context/ProjectsContext", () => ({
  useProjectsContext: () => ctx,
}));

import ProjectsPage from "./page";

function baseCtx(overrides = {}) {
  return {
    projects: [],
    loadingProjects: false,
    loadingMoreProjects: false,
    loadProjects: vi.fn(),
    clearProjects: vi.fn(),
    projectsPage: 1,
    setProjectsPage: vi.fn(),
    projectsTotalCount: 0,
    error: null,
    ...overrides,
  };
}

const project = (n) => ({ _id: String(n), code: `p${n}`, name: `Project ${n}` });

describe("projects dashboard pagination", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("offers Load More while the server has more than the loaded page", () => {
    const setProjectsPage = vi.fn();
    ctx = baseCtx({
      projects: Array.from({ length: 40 }, (_, i) => project(i)),
      projectsTotalCount: 97,
      setProjectsPage,
    });

    render(<ProjectsPage />);

    const loadMore = screen.getByText("Load More");
    expect(loadMore.parentElement.textContent).toMatch(/Showing\s*40\s*of\s*97/);
    fireEvent.click(loadMore);
    expect(setProjectsPage).toHaveBeenCalledWith(2);
  });

  it("loads the next page when the page number advances", () => {
    const loadProjects = vi.fn();
    ctx = baseCtx({
      projects: Array.from({ length: 40 }, (_, i) => project(i)),
      projectsTotalCount: 97,
      projectsPage: 2,
      loadProjects,
    });

    render(<ProjectsPage />);

    expect(loadProjects).toHaveBeenCalledWith({ page: 2 });
  });

  it("hides the pager once everything is loaded", () => {
    ctx = baseCtx({
      projects: [project(1), project(2)],
      projectsTotalCount: 2,
    });

    render(<ProjectsPage />);

    expect(screen.queryByText("Load More")).toBeNull();
    // The total still comes from the server, not the loaded slice.
    expect(screen.getByText("Total projects").nextSibling.textContent).toBe("2");
  });

  it("shows no pager for the unpaginated non-admin list (no totalCount)", () => {
    ctx = baseCtx({ projects: [project(1)], projectsTotalCount: 0 });
    render(<ProjectsPage />);
    expect(screen.queryByText("Load More")).toBeNull();
    expect(screen.queryByText("Showing")).toBeNull();
  });
});

describe("projects dashboard load failure", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => cleanup());

  it("reports the failure instead of claiming there are no projects", () => {
    const loadProjects = vi.fn();
    ctx = baseCtx({ error: "Failed to load projects", loadProjects });

    render(<ProjectsPage />);

    expect(screen.getByText("Couldn't load your projects")).toBeTruthy();
    expect(screen.queryByText("No projects yet")).toBeNull();

    loadProjects.mockClear();
    fireEvent.click(screen.getByText("Try Again"));
    expect(loadProjects).toHaveBeenCalledWith({ page: 1 });
  });

  it("keeps the loaded projects and offers a retry when a later page fails", () => {
    ctx = baseCtx({
      projects: [project(1)],
      projectsTotalCount: 97,
      projectsPage: 2,
      error: "Failed to load projects",
    });

    render(<ProjectsPage />);

    expect(screen.getByText("Project 1")).toBeTruthy();
    expect(screen.getByText("Try Again")).toBeTruthy();
    // The pager is replaced by the retry so a click can't skip the failed page.
    expect(screen.queryByText("Load More")).toBeNull();
  });

  it("still shows the empty state when the load genuinely returned nothing", () => {
    ctx = baseCtx();
    render(<ProjectsPage />);
    expect(screen.getByText("No projects yet")).toBeTruthy();
  });
});
