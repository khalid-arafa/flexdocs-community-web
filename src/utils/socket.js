import { API_URL } from "@/constants";
import { io } from "socket.io-client";

let sockets = {};

export const getSocket = (projectToken) => {
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

export const disconnectSocket = (projectToken) => {
  const socket = sockets[projectToken] || null;
  if (socket && socket.connected) {
    socket.disconnect();
  }
  delete sockets[projectToken];
};

export const clearSockets = () => {
  Object.keys(sockets).forEach((token) => {
    const socket = sockets[token];
    if (socket && socket.connected) {
      socket.disconnect();
    }
    delete sockets[token];
  });
};
