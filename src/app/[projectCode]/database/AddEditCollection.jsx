"use client";

import Button from "@/components/Button";
import { createNewCollection } from "@/utils/api";
import React, { useState } from "react";

function AddEditCollection({
  title = "Add Collection",
  collection,
  onDone,
  onSuccess,
  toast,
  activeProject,
}) {
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    if (!activeProject) return;
    try {
      if (title.toLowerCase().includes("add")) {
        const result = await createNewCollection({
          projectCode: activeProject.code,
          collectionName: name,
        });
        const body = await result.json(); 
        if (result.ok) {
          onSuccess({name, documentsCount: 0});
          return onDone();
        }
        toast(body.message);
      }
    } catch (error) {
      console.log("Couldn't create collection", error);
    }
  };

  return (
    <div
      className={`gap-2 flex flex-col items-center justify-center transition-all duration-300 ease-in-out`}
    >
      <div
        className={`bg-white rounded-3xl text-black transition-all duration-300 ease-in-out max-w-md w-full`}
      >
        <h2 className="font-bold text-black text-2xl mb-4">{title}</h2>

        <div className="">
          <label className="block text-md font-medium mb-2">
            Collection Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              ${error ? "border-red-500" : "border-gray-300"}`}
            placeholder="Enter collection name"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>
      </div>

      <div className="flex flex-1 justify-end mt-4 w-full">
        <div className="flex w-full/2 gap-2">
          <Button
          onClick={(e) => onDone()}
          variant="cancel"
        >
          Cancel
        </Button>
        <Button
          onClick={async () => {
            await onSubmit();
          }}
          className=""
        >
          Submit
        </Button>
        </div>
      </div>
    </div>
  );
}

export default AddEditCollection;
