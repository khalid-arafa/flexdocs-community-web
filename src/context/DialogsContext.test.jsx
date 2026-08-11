// @vitest-environment jsdom
//
// Confirm dialog accessibility (W5): it exposes a dialog role, resolves false on
// Escape, and puts initial focus on Cancel so a reflexive keypress can't confirm
// a destructive action.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, act } from "@testing-library/react";
import { DialogsProvider, useDialogs } from "@/context/DialogsContext";

// Small harness that exposes confirm() and records how the promise resolves.
let confirmApi;
let lastResult;
function Harness() {
  confirmApi = useDialogs().confirm;
  return null;
}

function mount() {
  lastResult = undefined;
  render(
    <DialogsProvider>
      <Harness />
    </DialogsProvider>
  );
}

async function openConfirm() {
  await act(async () => {
    confirmApi({ title: "Delete collection", msg: "Delete \"posts\"?" }).then(
      (v) => {
        lastResult = v;
      }
    );
  });
}

describe("ConfirmDialog accessibility", () => {
  beforeEach(() => mount());

  it("renders as a modal dialog naming itself", async () => {
    await openConfirm();
    const dialog = screen.getByRole("dialog");
    // Native DOM assertions (no jest-dom dependency).
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const titleId = dialog.getAttribute("aria-labelledby");
    expect(document.getElementById(titleId)?.textContent).toBe("Delete collection");
  });

  it("puts initial focus on the safe (No) button", async () => {
    await openConfirm();
    expect(document.activeElement?.textContent).toBe("No");
  });

  it("resolves false when Escape is pressed", async () => {
    await openConfirm();
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" });
      // The close animation waits 200ms before resolving.
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(lastResult).toBe(false);
  });

  it("resolves true when Yes is clicked", async () => {
    await openConfirm();
    await act(async () => {
      fireEvent.click(screen.getByText("Yes"));
      await new Promise((r) => setTimeout(r, 250));
    });
    expect(lastResult).toBe(true);
  });
});
