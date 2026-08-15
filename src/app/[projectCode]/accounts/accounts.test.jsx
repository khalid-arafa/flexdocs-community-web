// @vitest-environment jsdom
//
// Regressions for the accounts tab:
//   * AuthenticationTab realtime — `update` events were ignored entirely, and
//     the total count only ever moved on delete, so it drifted away from the
//     list it is supposed to gate "Load More" with. Same class of bug as the
//     one fixed in DocumentsBox.realtime.test.jsx, asserted the same way: the
//     count must be changed FUNCTIONALLY and by the batch length.
//   * AuthRulesTab — a failed load left `rules` null and the render read
//     `rules[key]`, throwing into the error boundary. It must render an error
//     state with a retry instead.

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";

// vitest runs without `globals`, so testing-library's automatic per-test cleanup
// is not registered — without this every render stacks up in the same document
// and queries match elements left over from earlier tests.
afterEach(cleanup);

// One shared fake socket whose `.on` captures the handler under test.
const socketHandlers = {};
const fakeSocket = {
  on: vi.fn((room, handler) => {
    socketHandlers[room] = handler;
  }),
  off: vi.fn(),
  emit: vi.fn(),
};
let socketToReturn = fakeSocket;

vi.mock("@/utils/socket", () => ({ getSocket: () => socketToReturn }));
vi.mock("react-toastify", () => ({
  toast: vi.fn(),
  ToastContainer: () => null,
}));
vi.mock("@/components/CustomDialog", () => ({ showDialog: vi.fn() }));
vi.mock("@/utils/api", () => ({
  loadAuthRules: vi.fn(),
  saveAuthRules: vi.fn(),
  deleteAccount: vi.fn(),
  updateAccountData: vi.fn(),
  addAccountUser: vi.fn(),
}));
// The project object must keep a stable identity across renders, exactly as the
// real provider's useState value does — both the socket effect and the rules
// load effect key off it, so a fresh object per render would re-subscribe and
// re-fetch forever.
vi.mock("@/context/ProjectsContext", () => {
  const activeProject = { code: "proj", projectToken: "tok" };
  return { useProjectsContext: () => ({ activeProject }) };
});
vi.mock("@/context/DialogsContext", () => ({
  useDialogs: () => ({ confirm: vi.fn() }),
}));

const authValue = {
  accounts: [],
  setAccounts: vi.fn(),
  accountsPage: 1,
  setAccountsPage: vi.fn(),
  loadAccounts: vi.fn(),
  clearAccounts: vi.fn(),
  loadingAccounts: false,
  loadingMoreAccounts: false,
  accountsTotalCount: 0,
  setAccountsTotalCount: vi.fn(),
};
vi.mock("@/context/ProjectAuthContext", () => ({
  useProjectAuthContext: () => authValue,
}));

import { loadAuthRules } from "@/utils/api";
import AuthenticationTab from "./AuthenticationTab";
import AuthRulesTab from "./AuthRulesTab";

// The rules tab is rendered alongside the accounts tab; keep its fetch resolved
// so it never leaks an unhandled rejection into the realtime tests.
function stubRulesLoad() {
  loadAuthRules.mockResolvedValue({ ok: true, json: async () => ({}) });
}

function captureHandler() {
  render(<AuthenticationTab />);
  const handler = socketHandlers["proj/_auth"];
  expect(handler).toBeTypeOf("function");
  return handler;
}

// Apply the functional updater that was passed to a setState spy.
function appliedFrom(spy, base) {
  const arg = spy.mock.calls.at(-1)[0];
  expect(arg).toBeTypeOf("function"); // must be functional, not a bare value
  return arg(base);
}

describe("AuthenticationTab realtime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    socketToReturn = fakeSocket;
    stubRulesLoad();
    for (const k of Object.keys(socketHandlers)) delete socketHandlers[k];
  });

  it("increments the total by the batch length on add, functionally", async () => {
    const handler = captureHandler();
    await act(async () => {
      await handler({ add: [{ uid: "1" }, { uid: "2" }] });
    });

    // Adds used to leave the total untouched, so a list grown by realtime
    // inserts outgrew the total that gates "Load More".
    expect(appliedFrom(authValue.setAccountsTotalCount, 10)).toBe(12);
    expect(appliedFrom(authValue.setAccounts, [])).toEqual([
      { uid: "1" },
      { uid: "2" },
    ]);
  });

  it("merges update events into the loaded list", async () => {
    const handler = captureHandler();
    await act(async () => {
      await handler({ update: [{ uid: "1", name: "New Name" }] });
    });

    // There was no `update` branch at all: edits from other clients never
    // appeared until a full reload.
    const merged = appliedFrom(authValue.setAccounts, [
      { uid: "1", name: "Old Name", email: "a@b.c" },
      { uid: "2", name: "Other" },
    ]);
    expect(merged).toEqual([
      { uid: "1", name: "New Name", email: "a@b.c" },
      { uid: "2", name: "Other" },
    ]);
  });

  it("leaves the total alone on update", async () => {
    const handler = captureHandler();
    await act(async () => {
      await handler({ update: [{ uid: "1", name: "New Name" }] });
    });

    // An update changes a row, not how many rows exist.
    expect(authValue.setAccountsTotalCount).not.toHaveBeenCalled();
  });

  it("removes and decrements on a delete event keyed only by _id", async () => {
    const handler = captureHandler();
    // The API emits the delete query it ran — `{ _id }`, with no `uid` — while
    // the list is keyed by `uid`. Matching on `uid` alone removed nothing while
    // the count still dropped.
    await act(async () => {
      await handler({ delete: [{ _id: "1" }, { _id: "2" }] });
    });

    expect(
      appliedFrom(authValue.setAccounts, [
        { uid: "1" },
        { uid: "2" },
        { uid: "3" },
      ])
    ).toEqual([{ uid: "3" }]);
    expect(appliedFrom(authValue.setAccountsTotalCount, 10)).toBe(8);
  });

  it("composes successive events without drift", async () => {
    const handler = captureHandler();
    await act(async () => {
      await handler({ add: [{ uid: "a" }, { uid: "b" }] });
    });
    let total = appliedFrom(authValue.setAccountsTotalCount, 12);
    expect(total).toBe(14);
    await act(async () => {
      await handler({ delete: [{ _id: "a" }] });
    });
    total = appliedFrom(authValue.setAccountsTotalCount, total);
    expect(total).toBe(13);
  });

  it("does not subscribe when the project has no socket", async () => {
    socketToReturn = null;
    // getSocket returns null for a project without a token; calling .on() on it
    // would crash the whole accounts screen.
    expect(() => render(<AuthenticationTab />)).not.toThrow();
    expect(fakeSocket.on).not.toHaveBeenCalled();
  });
});

describe("AuthRulesTab load failure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders an error state with a retry instead of crashing", async () => {
    loadAuthRules.mockResolvedValue({
      ok: false,
      json: async () => ({ message: "Not allowed" }),
    });

    render(<AuthRulesTab />);

    // Before the fix this threw a TypeError on `rules[key]`.
    expect(await screen.findByText("Not allowed")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Try Again" })).toBeTruthy();
    // Crucially not a silent empty state: no rule switches are shown.
    expect(screen.queryByText("Allow Anonymous Login")).toBeNull();
  });

  it("shows the error state when the request itself throws", async () => {
    loadAuthRules.mockRejectedValue(new Error("network down"));

    render(<AuthRulesTab />);

    expect(await screen.findByText("Failed to load auth rules")).toBeTruthy();
  });

  it("retry re-runs the load and renders the rules on success", async () => {
    loadAuthRules
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ allowAnonymousLogin: true }),
      });

    render(<AuthRulesTab />);
    const retry = await screen.findByRole("button", { name: "Try Again" });

    await act(async () => {
      retry.click();
    });

    await waitFor(() =>
      expect(screen.getByText("Allow Anonymous Login")).toBeTruthy()
    );
    expect(loadAuthRules).toHaveBeenCalledTimes(2);
    // The reloaded rule is reflected in its switch.
    const switches = screen.getAllByRole("switch");
    expect(
      switches.some((s) => s.getAttribute("aria-checked") === "true")
    ).toBe(true);
  });
});
