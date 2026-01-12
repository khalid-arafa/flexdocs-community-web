"use client";
import { DialogsProvider } from "@/context/DialogsContext";
import React from "react";
import { ToastContainer } from "react-toastify";

export default function layout({ children }) {
  return (
    <div>
      <DialogsProvider>{children}</DialogsProvider>
      <ToastContainer />
    </div>
  );
}
