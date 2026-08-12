import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cookieStore = {};
vi.mock("js-cookie", () => ({
  default: {
    set: vi.fn((key, value) => { cookieStore[key] = value; }),
    get: vi.fn((key) => cookieStore[key]),
    remove: vi.fn((key) => { delete cookieStore[key]; }),
  },
}));

import Cookies from "js-cookie";
import { login, register, logout, logoutAndRedirect } from "./auth";

function mockFetchOnce(ok, body) {
  global.fetch = vi.fn().mockResolvedValue({
    ok,
    json: vi.fn().mockResolvedValue(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(cookieStore)) delete cookieStore[key];
  // Default fetch so logout()'s best-effort /logout call never throws; the
  // per-test mockFetchOnce overrides it where the response matters.
  global.fetch = vi.fn().mockResolvedValue({ ok: true, json: vi.fn().mockResolvedValue({}) });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("login", () => {
  it("stores the returned user in a cookie and reports ok on success", async () => {
    mockFetchOnce(true, { uid: "u1", token: "jwt" });
    const result = await login("a@b.com", "pw");
    expect(result).toEqual({ ok: true, body: { uid: "u1", token: "jwt" } });
    expect(Cookies.set).toHaveBeenCalledWith(
      "user",
      JSON.stringify({ uid: "u1", token: "jwt" }),
      expect.objectContaining({ expires: 7, sameSite: "Lax" }),
    );
  });

  it("sends email/password as the JSON body", async () => {
    mockFetchOnce(true, {});
    await login("a@b.com", "secret");
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ email: "a@b.com", password: "secret" });
  });

  it("does not set a cookie when the server rejects the login", async () => {
    mockFetchOnce(false, { message: "Invalid email or password" });
    const result = await login("a@b.com", "wrong");
    expect(result.ok).toBe(false);
    expect(Cookies.set).not.toHaveBeenCalled();
  });

  it("returns { ok: false } instead of throwing when the network call itself fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("network down"));
    const result = await login("a@b.com", "pw");
    expect(result).toEqual({ ok: false });
  });
});

describe("register", () => {
  it("stores the returned user in a cookie and reports ok on success", async () => {
    mockFetchOnce(true, { uid: "u2" });
    const result = await register("Ada", "a@b.com", "pw");
    expect(result).toEqual({ ok: true, body: { uid: "u2" } });
    expect(Cookies.set).toHaveBeenCalled();
  });

  it("sends name/email/password as the JSON body", async () => {
    mockFetchOnce(true, {});
    await register("Ada", "a@b.com", "pw");
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ name: "Ada", email: "a@b.com", password: "pw" });
  });

  it("does not set a cookie when registration fails", async () => {
    mockFetchOnce(false, { message: "Email already exists!" });
    await register("Ada", "a@b.com", "pw");
    expect(Cookies.set).not.toHaveBeenCalled();
  });
});

describe("logout", () => {
  it("removes the user cookie", () => {
    logout();
    expect(Cookies.remove).toHaveBeenCalledWith("user", { sameSite: "Lax" });
  });

  it("also clears the csrf cookie", () => {
    logout();
    expect(Cookies.remove).toHaveBeenCalledWith("csrf", { sameSite: "Lax" });
  });

  it("posts to /logout with the csrf header to tear down the httpOnly session", () => {
    cookieStore.csrf = "csrf123";
    logout();
    const call = global.fetch.mock.calls.find(([u]) => String(u).endsWith("/logout"));
    expect(call).toBeTruthy();
    const [, opts] = call;
    expect(opts.method).toBe("POST");
    expect(opts.credentials).toBe("include");
    expect(opts.headers["x-csrf-token"]).toBe("csrf123");
  });
});

describe("login (cookie-auth / HTTPS mode)", () => {
  beforeEach(() => {
    // Simulate an https page so usesCookieAuth() takes the cookie branch.
    vi.stubGlobal("window", { location: { protocol: "https:", pathname: "/" } });
  });
  afterEach(() => vi.unstubAllGlobals());

  it("persists a TOKENLESS profile (+exp) and the csrf token — never the JWT", async () => {
    // base64url JWT payload carrying an exp claim.
    const payload = btoa(JSON.stringify({ exp: 1893456000 }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    const jwt = `h.${payload}.s`;
    mockFetchOnce(true, { uid: "u1", token: jwt, csrfToken: "c1", name: "Ada" });

    await login("a@b.com", "pw");

    const userCall = Cookies.set.mock.calls.find(([k]) => k === "user");
    const stored = JSON.parse(userCall[1]);
    expect(stored.token).toBeUndefined(); // the JWT is never written to JS storage
    expect(stored.uid).toBe("u1");
    expect(stored.name).toBe("Ada");
    expect(stored.exp).toBe(1893456000); // exp kept for the edge middleware gate
    expect(Cookies.set).toHaveBeenCalledWith("csrf", "c1", expect.anything());
  });
});

describe("logoutAndRedirect", () => {
  it("removes the cookie without touching window when window is undefined (SSR/node)", () => {
    // vitest's configured environment is "node" — no window global exists,
    // exercising the exact branch a server-rendered call would take.
    expect(() => logoutAndRedirect()).not.toThrow();
    expect(Cookies.remove).toHaveBeenCalledWith("user", { sameSite: "Lax" });
  });
});
