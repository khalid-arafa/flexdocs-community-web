"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Button from "./Button";

const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

// `jsonData` is the editor's source text. It is a genuine prop, not just a seed:
// the Rules tabs render the editor immediately and fill `rules` in only once the
// fetch resolves, and DocumentBox re-points it at a different document without
// unmounting. `useState(jsonData)` read the prop exactly once, so any value that
// arrived after mount was silently ignored (DocumentBox papered over this with a
// fake 150ms "loading" flag that forced a remount).
//
// So the source is tracked: local typing owns `value`, but whenever the incoming
// prop CHANGES the editor re-seeds from it. Comparing against the last prop we
// consumed (rather than against `value`) is what keeps an unrelated parent
// re-render from wiping edits in progress.
function JsonEditor({ jsonData, onSave, onCancel, height = "400px", backgroundColor = "#f5f5f5", className}) {
  const source = typeof jsonData === "string" ? jsonData : "";
  const [value, setValue] = useState(source);
  const [isValid, setIsValid] = useState(true);
  const lastSourceRef = useRef(source);

  useEffect(() => {
    if (source === lastSourceRef.current) return;
    lastSourceRef.current = source;
    setValue(source);
    setIsValid(true);
  }, [source]);

  // "Changed" is derived, never stored — that is what makes Revert correct:
  // it simply puts the source text back, and the button disappears because the
  // two are equal again. (It used to call `setValue(jsonData)`; that only ever
  // worked because DocumentBox passed a *function*, which React happened to
  // treat as a state updater.)
  const isChanged = value !== source;

  const handleEditorChange = (evn) => {
    setValue(evn.target.value);
    if (!isValid) setIsValid(true);
  };

  const handleRevert = () => {
    setValue(source);
    setIsValid(true);
  };

  const handleSave = useCallback(() => {
    if (!onSave) return;
    // JSON.parse is the single source of truth for validity. (It already
    // rejects trailing commas and unquoted keys, so no extra regex checks are
    // needed — those produced false "invalid" errors whenever a perfectly valid
    // string value happened to contain characters like `{ key:` or `, }`.)
    try {
      JSON.parse(value);
    } catch {
      setIsValid(false);
      return;
    }
    setIsValid(true);
    onSave(value);
  }, [onSave, value]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === "s") {
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  return (
    <div className={`flex flex-col w-full items-end`}>
      <div className={`w-full border ${className}`}>
        <CodeEditor
          value={value}
          language="json"
          placeholder="Enter JSON here"
          onChange={handleEditorChange}
          padding={15}
          data-color-mode="light"
          style={{
            fontSize: 14,
            backgroundColor: backgroundColor,
            accentColor: "red",
            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
            minHeight: height,
          }}
        />
      </div>

      {!isValid && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-md mt-2">
          JSON value is not valid!
        </div>
      )}

      <div className="flex space-x-2 mt-4 w-[80%] justify-end">
        {onCancel && (
          <Button
            onClick={onCancel}
            variant="cancel"
            className={`max-w-37.5`}
          >
            Cancel
          </Button>
        )}
        {isChanged && (
          <Button onClick={handleRevert} className={`max-w-37.5`}>
            Revert
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={!isValid}
          className={`max-w-37.5`}
        >
          Save
        </Button>
      </div>
    </div>
  );
}

export default JsonEditor;