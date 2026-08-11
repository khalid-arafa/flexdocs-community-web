// Regression for the deleteCollection trap.
//
// The API's DELETE /:col drops the whole collection ONLY on the admin path with
// NO filter in the body; ANY filter — including {} — is treated as a bulk
// document delete that empties the collection and emits no collection-delete
// event. deleteCollection must therefore send NO body. It previously passed
// `data: { filter: {} }`, which worked only by accident (del() reads `body`,
// not `data`, so the filter was dropped). This pins that no body is sent, so a
// well-meaning rename of the param to `body` can't silently change the feature
// from "drop collection" to "empty collection".

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("js-cookie", () => ({
  default: { get: () => JSON.stringify({ token: "t" }), set: vi.fn(), remove: vi.fn() },
}));
vi.mock("./auth", () => ({ logout: vi.fn(), logoutAndRedirect: vi.fn() }));

import { deleteCollection } from "./api";

describe("deleteCollection wire contract", () => {
  beforeEach(() => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ message: "Collection was deleted successfully" }),
    });
  });
  afterEach(() => vi.restoreAllMocks());

  it("issues a DELETE with NO body (so the API drops the collection, not empties it)", async () => {
    await deleteCollection({ projectCode: "p", collectionName: "posts" });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    const [url, opts] = global.fetch.mock.calls[0];
    expect(url).toContain("/projects/p/db/posts");
    expect(opts.method).toBe("DELETE");
    // The whole point: no body, and therefore no JSON content-type header.
    expect(opts.body).toBeUndefined();
    expect(opts.headers["Content-Type"]).toBeUndefined();
  });

  it("encodes the collection name into the path", async () => {
    await deleteCollection({ projectCode: "p", collectionName: "a b/c" });
    const [url] = global.fetch.mock.calls[0];
    expect(url).toContain("/db/a%20b%2Fc");
  });
});
