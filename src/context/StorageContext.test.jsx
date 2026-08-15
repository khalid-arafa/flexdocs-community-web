// @vitest-environment jsdom
//
// The storage provider is mounted at the ROOT of the tree, so it survives every
// project switch. These tests pin the rule that makes that safe: the browsing
// path is only ever readable under the project it was recorded for.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

// The provider reads the route segment (not activeProject, which can lag a
// switch) — mocked here so a test can move between projects.
let routeParams = { projectCode: "alpha" };
vi.mock("next/navigation", () => ({
  useParams: () => routeParams,
}));

import {
  StorageContextProvider,
  useStorageContext,
} from "@/context/StorageContext";

const wrapper = ({ children }) => (
  <StorageContextProvider>{children}</StorageContextProvider>
);

const setup = () => renderHook(() => useStorageContext(), { wrapper });

describe("StorageContext project scoping", () => {
  beforeEach(() => {
    routeParams = { projectCode: "alpha" };
  });

  it("keeps the bucket path while the project stays the same", () => {
    const { result, rerender } = setup();

    act(() => result.current.setBucketPathList([{ _id: "b1", name: "docs" }]));
    rerender();

    expect(result.current.bucketPathList).toHaveLength(1);
    expect(result.current.getCurrentBucket()._id).toBe("b1");
  });

  it("drops the previous project's path on the very first render after a switch", () => {
    const { result, rerender } = setup();

    act(() => result.current.setBucketPathList([{ _id: "b1", name: "docs" }]));
    rerender();
    expect(result.current.getCurrentBucket()._id).toBe("b1");

    // Switch projects. No effect has run yet — the value must already be empty,
    // because that single stale render is what made the storage screen fetch
    // the old project's bucket id under the new project's code.
    routeParams = { projectCode: "beta" };
    rerender();

    expect(result.current.bucketPathList).toEqual([]);
    expect(result.current.getCurrentBucket()).toBeNull();
  });

  it("does not resurrect the old path when switching back", () => {
    const { result, rerender } = setup();
    act(() => result.current.setBucketPathList([{ _id: "b1", name: "docs" }]));

    routeParams = { projectCode: "beta" };
    rerender();
    act(() => result.current.setBucketPathList([{ _id: "b2", name: "media" }]));
    rerender();
    expect(result.current.getCurrentBucket()._id).toBe("b2");

    routeParams = { projectCode: "alpha" };
    rerender();
    expect(result.current.bucketPathList).toEqual([]);
  });

  it("feeds an updater the current project's path, never the old one", () => {
    const { result, rerender } = setup();
    act(() => result.current.setBucketPathList([{ _id: "b1", name: "docs" }]));

    routeParams = { projectCode: "beta" };
    rerender();

    let seen;
    act(() =>
      result.current.setBucketPathList((prev) => {
        seen = prev;
        return [...prev, { _id: "b9", name: "new" }];
      })
    );
    rerender();

    expect(seen).toEqual([]);
    expect(result.current.bucketPathList).toEqual([
      { _id: "b9", name: "new" },
    ]);
  });

  it("hands out a stable empty path so consumers' effects don't loop", () => {
    const { result, rerender } = setup();
    const first = result.current.bucketPathList;
    rerender();
    expect(result.current.bucketPathList).toBe(first);
  });

  it("survives a route with no project segment (dashboard, login)", () => {
    routeParams = {};
    const { result } = setup();
    expect(result.current.bucketPathList).toEqual([]);
    expect(result.current.getCurrentBucket()).toBeNull();
  });
});
