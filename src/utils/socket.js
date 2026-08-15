import { API_URL } from "@/constants";
import { io } from "socket.io-client";

let sockets = {};

// The console only ever talks to one project at a time — every caller asks for
// `activeProject.projectToken` — so the token handed to getSocket doubles as
// "the project the app is on now". Remembering it lets the module retire the
// previous project's socket itself, instead of accumulating one socket per
// project visited in a session.
let activeProjectToken = null;

// Project tokens whose socket must survive a project switch because work is
// still running on it (an in-flight upload). token -> number of open holds.
let holds = {};

// Close a socket and forget it. Not gated on `socket.connected`: a socket still
// in its handshake is not "connected" yet, and dropping the reference without
// disconnecting left it to finish connecting and then reconnect forever
// (reconnectionAttempts: Infinity) with nobody listening.
const teardown = (projectToken) => {
  const socket = sockets[projectToken];
  delete sockets[projectToken];
  if (!socket) return;
  socket.disconnect();
  // The consumers' listeners go with it — the socket is unreachable now, and
  // leaving them attached keeps their closures (and component state) alive.
  socket.removeAllListeners();
};

// Drop every socket that is neither the active project's nor pinned by a hold.
// Held sockets are torn down by releaseSocket instead, once their work ends.
const pruneInactiveSockets = () => {
  Object.keys(sockets).forEach((token) => {
    if (token === activeProjectToken || holds[token]) return;
    teardown(token);
  });
};

export const getSocket = (projectToken) => {
  // Switching projects retires the sockets of the projects left behind. A
  // falsy token (the brief window where activeProject isn't loaded yet) is not
  // a switch and must not disturb the live socket.
  if (projectToken && projectToken !== activeProjectToken) {
    activeProjectToken = projectToken;
    pruneInactiveSockets();
  }

  let socket = sockets[projectToken] || null;
  if (!socket) {
    if (projectToken) {
      sockets[projectToken] = io(API_URL, {
        // Authenticate the socket with the per-project token only. The admin
        // session token used to be passed here as `token`, but the server reads
        // it under `userToken` — so it was never actually consumed and realtime
        // has always authenticated off the project token alone. In cookie-auth
        // mode the admin JWT isn't in JS to send anyway; withCredentials lets
        // the httpOnly session cookie ride the handshake for any future use.
        auth: { projectToken },
        withCredentials: true,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 30000,
        timeout: 20000,
      });
      socket = sockets[projectToken];
    }
  } else if (!socket.connected) {
    socket.connect();
  }
  return socket;
};

// Pin a project's socket while something long-running uses it (uploads), so a
// project switch can't disconnect it mid-transfer. Every holdSocket must be
// paired with exactly one releaseSocket.
export const holdSocket = (projectToken) => {
  if (!projectToken) return;
  holds[projectToken] = (holds[projectToken] || 0) + 1;
};

export const releaseSocket = (projectToken) => {
  if (!projectToken || !holds[projectToken]) return;
  holds[projectToken] -= 1;
  if (holds[projectToken] > 0) return;
  delete holds[projectToken];
  // If the app has moved on, the hold was the only thing keeping this socket
  // alive — the work it was waiting for is done, so retire it now.
  if (projectToken !== activeProjectToken) teardown(projectToken);
};

// Force-close one project's socket, holds and all. Used when the project itself
// is gone (deleted), where anything still running on it is moot anyway. Keyed
// by the PROJECT TOKEN — the same key getSocket uses, not the project code.
export const disconnectSocket = (projectToken) => {
  if (!projectToken) return;
  delete holds[projectToken];
  if (projectToken === activeProjectToken) activeProjectToken = null;
  teardown(projectToken);
};

// Full teardown — call on logout, where every project's realtime should stop.
// Idempotent: safe to call with nothing open.
export const clearSockets = () => {
  Object.keys(sockets).forEach((token) => teardown(token));
  holds = {};
  activeProjectToken = null;
};
