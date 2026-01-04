"use client";

import { useState, useEffect } from "react";

// Dynamically import Monaco Editor to avoid SSR issues
import dynamic from "next/dynamic";
import { validateJSON } from "@/utils/json";
export const MonacoEditor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
});

export const monacoEditorOptions = {
  minimap: { enabled: false },
  automaticLayout: true,
  formatOnPaste: true,
  formatOnType: true,
  scrollBeyondLastLine: false,
  tabSize: 2,
};

function JsonEditor({ jsonData, onSave, onCancel, height = "400px" }) {
  const [isChanged, setIsChanged] = useState(false);
  const [value, setValue] = useState(jsonData);
  const [isValid, setIsValid] = useState(true);

  const handleEditorChange = (newValue) => {
    setValue(newValue);
    if (!isValid) setIsValid(true);
    if (!isChanged) setIsChanged(true);
  };

  const handleSave = () => {    
    if (isValid && onSave) {
      try {
        JSON.parse(value);
        const errors = validateJSON(JSON.stringify(value));
        if (errors) {
          console.log(errors);
          setIsValid(false);
          return;
        }
      } catch (error) {
        setIsValid(false);
        return;
      }
      onSave(value);
    }
  };

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.ctrlKey && event.key === 's') {        
        event.preventDefault();
        handleSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleSave]);

  return (
    <div className="flex flex-col w-full">
      <div className="w-full border overflow-x-hidden border-gray-300">
        <MonacoEditor
          height={height}
          language="json"
          value={value}
          onChange={handleEditorChange}
          options={monacoEditorOptions}
          theme="vs-light"
        />
      </div>

      {!isValid && (
        <div className="bg-red-100 border border-red-300 text-red-700 px-4 py-2 rounded-md mt-2">
          JSON value is not valid!
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-4">
        {onCancel && (
          <button
            onClick={(e) => onCancel()}
            className={`px-4 py-2 rounded-md text-black bg-gray-200 cursor-pointer`}
          >
            Cancel
          </button>
        )}
        {isChanged && (
          <button
            onClick={(e) => {
              setValue(jsonData);
              setIsValid(true);
              setTimeout(() => setIsChanged(false), 200);
            }}
            className={`px-4 py-2 rounded-md text-black bg-gray-200 cursor-pointer`}
          >
            Revert
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={!isValid}
          className={`px-4 py-2 rounded-md text-white cursor-pointer ${
            isValid
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-blue-300 cursor-not-allowed"
          }`}
        >
          Save
        </button>
      </div>
    </div>
  );
}
export default JsonEditor;