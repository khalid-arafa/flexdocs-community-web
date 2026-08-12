"use client";

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import Button from "./Button";

const CodeEditor = dynamic(
  () => import("@uiw/react-textarea-code-editor").then((mod) => mod.default),
  { ssr: false }
);

function JsonEditor({ jsonData, onSave, onCancel, height = "400px", backgroundColor = "#f5f5f5", className}) {
  const [isChanged, setIsChanged] = useState(false);
  const [value, setValue] = useState(jsonData);
  const [isValid, setIsValid] = useState(true);

  const handleEditorChange = (evn) => {
    const newValue = evn.target.value;
    setValue(newValue);
    if (!isValid) setIsValid(true);
    if (!isChanged) setIsChanged(true);
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
          <Button
            onClick={() => {
              setValue(jsonData);
              setIsValid(true);
              setTimeout(() => setIsChanged(false), 200);
            }}
            className={`max-w-37.5`}
          >
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