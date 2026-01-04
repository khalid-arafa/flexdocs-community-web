import { API_URL } from "@/constants";
import { io } from "socket.io-client";

let sockets = {};

export const getSocket = (projectToken) => {
  let socket = sockets[projectToken] || null;
  if (!socket) {
    if (projectToken) {
      sockets[projectToken] = io(API_URL, { auth: { projectToken } });
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
