import { describe, it, expect, beforeEach, vi } from "vitest";

// Fake socket.io client: every io() call yields a recording stub, so the tests
// can assert exactly which sockets were opened and which were torn down.
const created = [];
const makeSocket = () => {
  const socket = {
    connected: true,
    disconnect: vi.fn(() => {
      socket.connected = false;
    }),
    connect: vi.fn(() => {
      socket.connected = true;
    }),
    removeAllListeners: vi.fn(),
  };
  return socket;
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => {
    const socket = makeSocket();
    created.push(socket);
    return socket;
  }),
}));

let getSocket, disconnectSocket, clearSockets, holdSocket, releaseSocket;

beforeEach(async () => {
  created.length = 0;
  // The module keeps its socket map in module scope — reload it per test so
  // one test's sockets never leak into the next.
  vi.resetModules();
  ({ getSocket, disconnectSocket, clearSockets, holdSocket, releaseSocket } =
    await import("./socket"));
});

describe("getSocket", () => {
  it("shares one socket per project token", () => {
    const first = getSocket("token-a");
    const second = getSocket("token-a");
    expect(second).toBe(first);
    expect(created).toHaveLength(1);
  });

  it("reconnects a socket that dropped instead of opening a second one", () => {
    const socket = getSocket("token-a");
    socket.connected = false;
    expect(getSocket("token-a")).toBe(socket);
    expect(socket.connect).toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });

  it("returns null and opens nothing without a project token", () => {
    expect(getSocket(undefined)).toBeNull();
    expect(created).toHaveLength(0);
  });

  it("disconnects the previous project's socket when the project changes", () => {
    const a = getSocket("token-a");
    const b = getSocket("token-b");
    expect(a.disconnect).toHaveBeenCalled();
    expect(a.removeAllListeners).toHaveBeenCalled();
    expect(b.disconnect).not.toHaveBeenCalled();
  });

  it("opens a fresh socket when a retired project is visited again", () => {
    const a = getSocket("token-a");
    getSocket("token-b");
    const back = getSocket("token-a");
    expect(back).not.toBe(a);
    expect(created).toHaveLength(3);
  });

  it("keeps the active socket when called without a token mid-navigation", () => {
    const a = getSocket("token-a");
    getSocket(undefined);
    getSocket("token-a");
    expect(a.disconnect).not.toHaveBeenCalled();
    expect(created).toHaveLength(1);
  });
});

describe("holdSocket / releaseSocket", () => {
  it("keeps a held socket alive across a project switch", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    getSocket("token-b");
    expect(a.disconnect).not.toHaveBeenCalled();
  });

  it("retires the held socket once the last hold is released", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    holdSocket("token-a");
    getSocket("token-b");
    releaseSocket("token-a");
    expect(a.disconnect).not.toHaveBeenCalled();
    releaseSocket("token-a");
    expect(a.disconnect).toHaveBeenCalled();
  });

  it("does not disconnect the still-active project on release", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    releaseSocket("token-a");
    expect(a.disconnect).not.toHaveBeenCalled();
    expect(getSocket("token-a")).toBe(a);
  });

  it("ignores an unbalanced release", () => {
    const a = getSocket("token-a");
    releaseSocket("token-a");
    releaseSocket("token-a");
    expect(a.disconnect).not.toHaveBeenCalled();
  });
});

describe("disconnectSocket", () => {
  it("closes the socket for the given project token", () => {
    const a = getSocket("token-a");
    disconnectSocket("token-a");
    expect(a.disconnect).toHaveBeenCalled();
    expect(getSocket("token-a")).not.toBe(a);
  });

  it("closes a socket that is still connecting", () => {
    const a = getSocket("token-a");
    a.connected = false; // handshake not finished yet
    disconnectSocket("token-a");
    expect(a.disconnect).toHaveBeenCalled();
  });

  it("force-closes even while held — the project itself is gone", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    disconnectSocket("token-a");
    expect(a.disconnect).toHaveBeenCalled();
  });

  it("leaves other projects' sockets alone", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    const b = getSocket("token-b");
    disconnectSocket("token-b");
    expect(a.disconnect).not.toHaveBeenCalled();
    expect(b.disconnect).toHaveBeenCalled();
  });

  it("is a no-op without a token", () => {
    const a = getSocket("token-a");
    disconnectSocket(undefined);
    expect(a.disconnect).not.toHaveBeenCalled();
  });
});

describe("clearSockets", () => {
  it("closes every open socket, held ones included", () => {
    const a = getSocket("token-a");
    holdSocket("token-a");
    const b = getSocket("token-b");
    clearSockets();
    expect(a.disconnect).toHaveBeenCalled();
    expect(b.disconnect).toHaveBeenCalled();
  });

  it("opens fresh sockets afterwards, and is safe to call twice", () => {
    const a = getSocket("token-a");
    clearSockets();
    expect(() => clearSockets()).not.toThrow();
    expect(getSocket("token-a")).not.toBe(a);
  });
});
