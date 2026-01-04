"use client";

import { createStorageBucket, updateStorageBucket } from "@/utils/api";
import React, { useState } from "react";
import { toast } from "react-toastify";

function AddEditBucket({
  title = "Adding Bucket",
  parentId,
  bucket,
  activeProject,
  onDone,
}) {
  const [name, setName] = useState(bucket?.name || "");
  const [description, setDescription] = useState(bucket?.description || "");
  const [error, setError] = useState("");

  const onSubmit = async () => {
    try {
      let result;
      let toastMsg = "Error has happen while contacting the api!";
      if (title.toLowerCase().includes("add")) {
        result = await createStorageBucket({
          projectCode: activeProject.code,
          name,
          parentId,
        });
        toastMsg = "Bucket has been added!";
      }
      if (title.toLowerCase().includes("edit")) {
        result = await updateStorageBucket({
          projectCode: activeProject.code,
          bucketId: bucket._id,
          data: { name, description },
        });
        toastMsg = "Bucket has been updated!";
      }
      if (result) {
        if (!result.ok) {
          const body = await result.json();
          toastMsg = body.message;
        }
      }
      toast(toastMsg);
    } catch (error) {
      console.log("Couldn't create bucket", error);
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
            Bucket Name <span className="text-red-500">*</span>
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
            placeholder="Enter bucket name"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <div className="">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter bucket description (optional)"
          />
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
            onDone();
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

export default AddEditBucket;
