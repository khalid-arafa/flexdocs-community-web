// @vitest-environment jsdom
//
// Regression tests for the DatabaseContext concurrency fixes (W1.6, W1.7).
// These bugs only manifest with real React state and overlapping async loads,
// so they are exercised through the provider rather than as pure functions.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";

vi.mock("@/utils/api", () => ({
  getDatabaseCollections: vi.fn(),
  getCollectionDocuments: vi.fn(),
}));

import { getCollectionDocuments } from "@/utils/api";
import {
  DatabaseContextProvider,
  useDatabaseContext,
} from "@/context/DatabaseContext";

// A promise whose resolution we control, so a load can be held "in flight"
// while we assert intermediate state or start a second, competing load.
function deferred() {
  let resolve;
  const promise = new Promise((r) => (resolve = r));
  return { promise, resolve };
}

function okResponse(docs, totalCount = docs.length) {
  return { ok: true, status: 200, json: async () => ({ docs, totalCount }) };
}

const wrapper = ({ children }) => (
  <DatabaseContextProvider>{children}</DatabaseContextProvider>
);

function setup() {
  return renderHook(() => useDatabaseContext(), { wrapper });
}

describe("loadCollectionDocuments concurrency", () => {
  beforeEach(() => vi.clearAllMocks());

  it("dedupes an identical in-flight request (rapid Load More on the same page)", async () => {
    const d = deferred();
    getCollectionDocuments.mockReturnValue(d.promise);

    const { result } = setup();
    act(() => result.current.setSelectedCollection({ name: "posts" }));

    // Two identical page-2 loads fired before the first resolves.
    await act(async () => {
      result.current.loadCollectionDocuments({ projectCode: "p", page: 2 });
      result.current.loadCollectionDocuments({ projectCode: "p", page: 2 });
    });

    expect(getCollectionDocuments).toHaveBeenCalledTimes(1);

    await act(async () => {
      d.resolve(okResponse([{ _id: "1" }]));
      await d.promise;
    });
  });

  it("shows the first-load spinner (not load-more) on a page-1 load, even with prior docs", async () => {
    // First: fully load collection A so collectionDocuments is non-empty.
    getCollectionDocuments.mockResolvedValueOnce(
      okResponse([{ _id: "a1" }, { _id: "a2" }], 2)
    );
    const { result } = setup();
    act(() => result.current.setSelectedCollection({ name: "A" }));
    await act(async () => {
      await result.current.loadCollectionDocuments({ projectCode: "p", page: 1 });
    });
    expect(result.current.collectionDocuments).toHaveLength(2);

    // Now switch to B and start its page-1 load, holding it in flight.
    const d = deferred();
    getCollectionDocuments.mockReturnValueOnce(d.promise);
    act(() => result.current.setSelectedCollection({ name: "B" }));
    act(() => {
      result.current.loadCollectionDocuments({ projectCode: "p", page: 1 });
    });

    // The bug: it decided the spinner from collectionDocuments.length, which
    // still held A's two docs, so it flipped the LOAD-MORE spinner and left A's
    // rows visible. Page-1 must always be the first-load spinner.
    await waitFor(() =>
      expect(result.current.loadingCollectionDocuments).toBe(true)
    );
    expect(result.current.loadingMoreCollectionDocuments).toBe(false);

    await act(async () => {
      d.resolve(okResponse([{ _id: "b1" }], 1));
      await d.promise;
    });
  });

  it("drops a superseded response so a slow earlier load can't overwrite newer data", async () => {
    const first = deferred();
    const second = deferred();
    getCollectionDocuments
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);

    const { result } = setup();

    // Load A (held), then switch to B and load B.
    act(() => result.current.setSelectedCollection({ name: "A" }));
    act(() => {
      result.current.loadCollectionDocuments({ projectCode: "p", page: 1 });
    });
    act(() => result.current.setSelectedCollection({ name: "B" }));
    act(() => {
      result.current.loadCollectionDocuments({ projectCode: "p", page: 1 });
    });

    // B resolves first (it is the current request), then A resolves late.
    await act(async () => {
      second.resolve(okResponse([{ _id: "b1" }], 1));
      await second.promise;
    });
    await act(async () => {
      first.resolve(okResponse([{ _id: "a1" }, { _id: "a2" }], 2));
      await first.promise;
    });

    // A's late response must have been discarded.
    expect(result.current.collectionDocuments).toEqual([{ _id: "b1" }]);
    expect(result.current.totalCollectionDocumentsCount).toBe(1);
  });
});
