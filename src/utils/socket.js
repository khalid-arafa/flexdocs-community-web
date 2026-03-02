import { API_URL } from "@/constants";
import { io } from "socket.io-client";
import Cookies from "js-cookie";

let sockets = {};

function getUserToken() {
  try {
    const user = JSON.parse(Cookies.get("user") || "{}");
    return user.token || null;
  } catch {
    return null;
  }
}

export const getSocket = (projectToken) => {
  let socket = sockets[projectToken] || null;
  if (!socket) {
    if (projectToken) {
      sockets[projectToken] = io(API_URL, {
        auth: { projectToken, token: getUserToken() },
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
