import { describe, it, expect } from "vitest";
import { mergeAdd, mergeUpdate, mergeDelete } from "./realtimeMerge";

describe("mergeAdd", () => {
  it("appends new items to the list", () => {
    const prev = [{ _id: "a", v: 1 }];
    const result = mergeAdd(prev, [{ _id: "b", v: 2 }]);
    expect(result).toEqual([
      { _id: "a", v: 1 },
      { _id: "b", v: 2 },
    ]);
  });

  it("does not mutate the lists it was given", () => {
    const prev = [{ _id: "a", v: 1 }];
    const added = [{ _id: "b", v: 2 }];
    mergeAdd(prev, added);
    expect(prev).toEqual([{ _id: "a", v: 1 }]);
    expect(added).toEqual([{ _id: "b", v: 2 }]);
  });

  it("on a colliding key, the added copy wins but keeps the original row's position", () => {
    // Regression guard for the Map-ordering quirk mergeAdd relies on: a
    // re-sent/duplicate "add" event must overwrite in place, not jump to
    // the end of the list (which would visibly reorder the UI).
    const prev = [
      { _id: "a", v: 1 },
      { _id: "b", v: 2 },
    ];
    const result = mergeAdd(prev, [
      { _id: "a", v: 99 },
      { _id: "c", v: 3 },
    ]);
    expect(result).toEqual([
      { _id: "a", v: 99 },
      { _id: "b", v: 2 },
      { _id: "c", v: 3 },
    ]);
  });

  it("supports a custom key field", () => {
    const prev = [{ name: "users", documentsCount: 5 }];
    const result = mergeAdd(
      prev,
      [{ name: "orders", documentsCount: 0 }],
      "name"
    );
    expect(result.map((c) => c.name)).toEqual(["users", "orders"]);
  });

  it("handles an empty starting list", () => {
    expect(mergeAdd([], [{ _id: "a", v: 1 }])).toEqual([{ _id: "a", v: 1 }]);
  });
});

describe("mergeUpdate", () => {
  it("shallow-merges matching updates onto existing items", () => {
    const prev = [
      { _id: "a", name: "foo", count: 1 },
      { _id: "b", name: "bar", count: 2 },
    ];
    const result = mergeUpdate(prev, [{ _id: "a", count: 10 }]);
    expect(result).toEqual([
      { _id: "a", name: "foo", count: 10 },
      { _id: "b", name: "bar", count: 2 },
    ]);
  });

  it("leaves items with no matching update untouched", () => {
    const prev = [{ _id: "a", v: 1 }];
    const result = mergeUpdate(prev, [{ _id: "z", v: 999 }]);
    expect(result).toEqual([{ _id: "a", v: 1 }]);
  });

  it("is not an upsert: an update for an id not already in the list is dropped, not inserted", () => {
    const prev = [{ _id: "a", v: 1 }];
    const result = mergeUpdate(prev, [{ _id: "b", v: 2 }]);
    expect(result).toEqual([{ _id: "a", v: 1 }]);
    expect(result).toHaveLength(1);
  });

  it("preserves list order", () => {
    const prev = [
      { _id: "a", v: 1 },
      { _id: "b", v: 2 },
      { _id: "c", v: 3 },
    ];
    const result = mergeUpdate(prev, [{ _id: "c", v: 30 }, { _id: "a", v: 10 }]);
    expect(result.map((i) => i._id)).toEqual(["a", "b", "c"]);
    expect(result.map((i) => i.v)).toEqual([10, 2, 30]);
  });

  it("supports a custom key field", () => {
    const prev = [{ name: "users", documentsCount: 5 }];
    const result = mergeUpdate(
      prev,
      [{ name: "users", documentsCount: 6 }],
      "name"
    );
    expect(result).toEqual([{ name: "users", documentsCount: 6 }]);
  });
});

describe("mergeDelete", () => {
  it("removes items whose key matches an entry in the deleted list", () => {
    const prev = [
      { _id: "a", v: 1 },
      { _id: "b", v: 2 },
    ];
    const result = mergeDelete(prev, [{ _id: "a" }]);
    expect(result).toEqual([{ _id: "b", v: 2 }]);
  });

  it("removes multiple items in one call", () => {
    const prev = [{ _id: "a" }, { _id: "b" }, { _id: "c" }];
    const result = mergeDelete(prev, [{ _id: "a" }, { _id: "c" }]);
    expect(result).toEqual([{ _id: "b" }]);
  });

  it("is a no-op when nothing matches", () => {
    const prev = [{ _id: "a", v: 1 }];
    const result = mergeDelete(prev, [{ _id: "z" }]);
    expect(result).toEqual([{ _id: "a", v: 1 }]);
  });

  it("supports a custom key field", () => {
    const prev = [{ name: "users" }, { name: "orders" }];
    const result = mergeDelete(prev, [{ name: "orders" }], "name");
    expect(result).toEqual([{ name: "users" }]);
  });
});
