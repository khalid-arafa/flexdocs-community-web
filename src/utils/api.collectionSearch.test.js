// Wire contract for server-side collection search.
//
// The collections panel used to "search" with a client-side startsWith over the
// pages it had already fetched, so nothing past the first page was findable.
// POST /db/collections forwards `where` to MongoDB's listCollections, so the
// filter must arrive as a NAME REGEX and the term must be escaped: an unescaped
// "." would match any character and "(" would be an invalid pattern the API
// rejects outright.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("js-cookie", () => ({
  default: { get: () => JSON.stringify({ token: "t" }), set: vi.fn(), remove: vi.fn() },
}));
vi.mock("./auth", () => ({ logout: vi.fn(), logoutAndRedirect: vi.fn() }));

import { buildCollectionSearchFilter, getDatabaseCollections } from "./api";

function sentBody() {
  const [, opts] = global.fetch.mock.calls[0];
  return JSON.parse(opts.body);
}

describe("buildCollectionSearchFilter", () => {
  it("builds a case-insensitive name regex", () => {
    expect(buildCollectionSearchFilter("posts")).toEqual({
      name: { $regex: "posts", $options: "i" },
    });
  });

  it("escapes regex metacharacters so the term matches literally", () => {
    expect(buildCollectionSearchFilter("a.b+c(d)").name.$regex).toBe(
      "a\\.b\\+c\\(d\\)"
    );
  });

  it("trims and treats a blank term as no filter", () => {
    expect(buildCollectionSearchFilter("   ")).toEqual({});
    expect(buildCollectionSearchFilter("")).toEqual({});
    expect(buildCollectionSearchFilter(undefined)).toEqual({});
    expect(buildCollectionSearchFilter("  posts  ").name.$regex).toBe("posts");
  });

  it("bounds the term so the escaped pattern stays under the API's 250-char cap", () => {
    // Escaping can at most double the length, so the worst case is 100 * 2.
    const pattern = buildCollectionSearchFilter("(".repeat(500)).name.$regex;
    expect(pattern.length).toBeLessThanOrEqual(250);
  });
});

describe("getDatabaseCollections", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ collections: [], totalCount: 0 }),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("sends the search term as a where filter and keeps paging", async () => {
    await getDatabaseCollections({ projectCode: "p", search: "user", page: 2 });

    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("/projects/p/db/collections");
    expect(sentBody()).toEqual({
      where: { name: { $regex: "user", $options: "i" } },
      page: 2,
      limit: 40,
    });
  });

  it("sends an empty filter when there is no search (unchanged list behaviour)", async () => {
    await getDatabaseCollections({ projectCode: "p", page: 1 });
    expect(sentBody().where).toEqual({});
  });

  it("lets an explicit where override the search shorthand", async () => {
    await getDatabaseCollections({
      projectCode: "p",
      where: { name: "exact" },
      search: "ignored",
    });
    expect(sentBody().where).toEqual({ name: "exact" });
  });
});