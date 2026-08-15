// @vitest-environment jsdom
//
// The editor's source text is a live prop, not a seed. The Rules tabs mount the
// editor before their fetch resolves, so a `jsonData` that arrives later has to
// land in the textarea — that used to depend on the editor happening to mount
// after the fetch, and DocumentBox forced it with a fake 150ms remount.
// Revert is covered too: it used to "work" only because DocumentBox passed a
// function that React mistook for a state updater.

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import JsonEditor from "./JsonEditor";

// vitest runs without `globals`, so testing-library's auto-cleanup never
// registers itself; unmount explicitly or the renders pile up in the document.
afterEach(cleanup);

// The real editor is a `next/dynamic` wrapper around a CodeMirror-ish textarea;
// swap it for a plain textarea so the test exercises JsonEditor's own logic.
vi.mock("next/dynamic", () => ({
  default: () =>
    function CodeEditorStub({ value, onChange }) {
      return <textarea data-testid="editor" value={value} onChange={onChange} />;
    },
}));

const editor = () => screen.getByTestId("editor");
const button = (name) => screen.queryByRole("button", { name });

describe("JsonEditor", () => {
  it("shows jsonData that arrives after mount", () => {
    const { rerender } = render(<JsonEditor jsonData={undefined} />);
    expect(editor().value).toBe("");

    rerender(<JsonEditor jsonData={'{\n  "read": true\n}'} />);
    expect(editor().value).toBe('{\n  "read": true\n}');
  });

  it("re-seeds when the prop is pointed at a different document", () => {
    const { rerender } = render(<JsonEditor jsonData={'{"a":1}'} />);
    rerender(<JsonEditor jsonData={'{"b":2}'} />);
    expect(editor().value).toBe('{"b":2}');
  });

  it("keeps edits in progress across an unrelated re-render", () => {
    const { rerender } = render(<JsonEditor jsonData={'{"a":1}'} />);
    fireEvent.change(editor(), { target: { value: '{"a":2}' } });

    // Same prop value, new render (e.g. a parent state change elsewhere).
    rerender(<JsonEditor jsonData={'{"a":1}'} />);
    expect(editor().value).toBe('{"a":2}');
  });

  it("offers Revert only while dirty and restores the source text", () => {
    render(<JsonEditor jsonData={'{"a":1}'} />);
    expect(button("Revert")).toBeNull();

    fireEvent.change(editor(), { target: { value: '{"a":2}' } });
    expect(button("Revert")).not.toBeNull();

    fireEvent.click(button("Revert"));
    expect(editor().value).toBe('{"a":1}');
    expect(button("Revert")).toBeNull();
  });

  it("saves the current text and rejects invalid JSON", () => {
    const onSave = vi.fn();
    render(<JsonEditor jsonData={'{"a":1}'} onSave={onSave} />);

    fireEvent.change(editor(), { target: { value: "{ not json" } });
    fireEvent.click(button("Save"));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("JSON value is not valid!")).toBeTruthy();

    fireEvent.change(editor(), { target: { value: '{"a":2}' } });
    fireEvent.click(button("Save"));
    expect(onSave).toHaveBeenCalledWith('{"a":2}');
  });
});