import React from "react";

// Deliberately a pass-through. DialogsProvider and the single ToastContainer
// live in the root layout; re-mounting either here gave this subtree its own
// dialog state and made every toast render twice.
export default function layout({ children }) {
  return <div>{children}</div>;
}
