"use client";

import Button from "@/components/Button";
import { addProjectCreds } from "@/utils/api";
import React, { useState } from "react";
import { toast } from "react-toastify";

function AddEditCreds({
  title = "Adding Credentials",
  activeProject,
  creds,
  onDone,
  onSuccess,
}) {
  const [name, setName] = useState(creds?.name || "");
  const [description, setDescription] = useState(creds?.description || "");
  const [error, setError] = useState("");

  const onCreate = async () => {
    if(!name) return;  
    try {
      let toastMsg = "Error has happen while contacting the api!";
      const result = await addProjectCreds({
        code: activeProject.code,
        data: {
          name,
          description
        }
      });
      const body = await result.json();
      toastMsg = "Credentials has been added!";      
      if (!result.ok) {
        toastMsg = body.message;
      } else {
        onSuccess(body);
        onDone();
      }
      toast(toastMsg);
    } catch (error) {
      console.log("Couldn't create credentials", error);
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
            Name 
            <span className="text-red-500">*</span>
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
            placeholder="Enter name"
          />
          {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
        </div>

        <div className="">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg h-24 resize-none transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            placeholder="Enter description (optional)"
          />
        </div>
      </div>

      <div className="flex justify-end w-full">
        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={(e) => onDone()}
            variant="cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await onCreate();
            }}
          >
            Create
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddEditCreds;
