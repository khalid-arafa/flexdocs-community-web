"use client";

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
      // if (title.toLowerCase().includes("edit"))
      //   await updateStorageBucket({
      //     bucketId: bucket._id,
      //     data: { name, description },
      //   });
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
        <h2 className="font-bold text-black text-xl mb-4">{title}</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
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

      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={(e) => onDone()}
          className="px-4 py-2 text-black rounded-xl hover:bg-gray-200 transition cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={async () => {
            await onSubmit();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

export default AddEditCollection;
