import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const cookieStore = {};
vi.mock("js-cookie", () => ({
  default: {
    set: vi.fn((key, value) => { cookieStore[key] = value; }),
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
});

describe("logoutAndRedirect", () => {
  it("removes the cookie without touching window when window is undefined (SSR/node)", () => {
    // vitest's configured environment is "node" — no window global exists,
    // exercising the exact branch a server-rendered call would take.
    expect(() => logoutAndRedirect()).not.toThrow();
    expect(Cookies.remove).toHaveBeenCalledWith("user", { sameSite: "Lax" });
  });
});
