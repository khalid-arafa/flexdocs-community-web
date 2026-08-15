"use client";

import Button from "@/components/Button";
import { createStorageBucket, updateStorageBucket } from "@/utils/api";
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";

// One rule per field, shared by the on-blur check and the submit gate — so the
// two can never disagree about what "valid" means. Each returns "" for valid.
const VALIDATORS = {
  name: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Bucket name is required!";
    if (trimmed.length > 64) return "Bucket name must be 64 characters or less!";
    return "";
  },
  // Optional: only checked once something has been typed.
  description: (value) =>
    value.trim().length > 500
      ? "Description must be 500 characters or less!"
      : "",
};

// Submit focuses the first offender in the order the fields appear on screen.
const FIELDS = ["name", "description"];

function AddEditBucket({
  title = "Adding Bucket",
  parentId,
  bucket,
  activeProject,
  onDone,
}) {
  const [values, setValues] = useState({
    name: bucket?.name || "",
    description: bucket?.description || "",
  });
  const [errors, setErrors] = useState({ name: "", description: "" });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refs = {
    name: useRef(null),
    description: useRef(null),
  };

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    // A visible error disappears as soon as the field becomes valid again,
    // without waiting for another blur.
    setErrors((prev) =>
      prev[field] && !VALIDATORS[field](value)
        ? { ...prev, [field]: "" }
        : prev
    );
  };

  const handleBlur = (field) => () =>
    setErrors((prev) => ({ ...prev, [field]: VALIDATORS[field](values[field]) }));

  // Final gate: re-check everything, then focus the first offending input.
  const validateAll = () => {
    const next = {};
    for (const field of FIELDS) next[field] = VALIDATORS[field](values[field]);
    setErrors(next);
    const firstInvalid = FIELDS.find((field) => next[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return false;
    }
    return true;
  };

  // Resolves true only when the bucket was really persisted, so the caller
  // knows whether it may close the dialog.
  const onSubmit = async () => {
    setFormError("");
    if (!validateAll()) return false;

    const name = values.name.trim();
    const description = values.description.trim();

    setIsSaving(true);
    try {
      let result;
      let successMsg = "";
      if (title.toLowerCase().includes("add")) {
        result = await createStorageBucket({
          projectCode: activeProject.code,
          name,
          // Was dropped on create: the dialog collected a description and then
          // never sent it.
          description,
          parentId,
        });
        successMsg = "Bucket has been added!";
      }
      if (title.toLowerCase().includes("edit")) {
        result = await updateStorageBucket({
          projectCode: activeProject.code,
          bucketId: bucket._id,
          data: { name, description },
        });
        successMsg = "Bucket has been updated!";
      }
      if (!result) return false;

      const body = await result.json().catch(() => null);
      if (!result.ok) {
        const msg = body?.message || "Error has happen while contacting the api!";
        setFormError(msg);
        toast(msg, { type: "error" });
        return false;
      }
      toast(successMsg, { type: "success" });
      return true;
    } catch (error) {
      console.log("Couldn't create bucket", error);
      const msg = "Error has happen while contacting the api!";
      setFormError(msg);
      toast(msg, { type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = (field) =>
    `w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
      ${errors[field] ? "border-red-500" : "border-gray-300"}`;

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
            ref={refs.name}
            type="text"
            value={values.name}
            onChange={handleChange("name")}
            onBlur={handleBlur("name")}
            aria-invalid={errors.name ? "true" : undefined}
            className={inputClasses("name")}
            placeholder="Enter bucket name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div className="">
          <label className="block text-sm font-medium mb-1">Description</label>
          <textarea
            ref={refs.description}
            value={values.description}
            onChange={handleChange("description")}
            onBlur={handleBlur("description")}
            aria-invalid={errors.description ? "true" : undefined}
            className={`${inputClasses("description")} h-24 resize-none`}
            placeholder="Enter bucket description (optional)"
          />
          {errors.description && (
            <p className="text-red-500 text-sm mt-1">{errors.description}</p>
          )}
        </div>

        {formError && (
          <p className="text-red-500 text-sm mt-3">{formError}</p>
        )}
      </div>

      <div className="flex w-full justify-end">
        <div className="flex gap-2 mt-4">
          <Button
            variant="cancel"
            onClick={(e) => onDone()}
            className="px-4 py-2 text-black rounded-xl hover:bg-gray-200 transition cursor-pointer max-w-30"
          >
            Cancel
          </Button>
          <Button
            isLoading={isSaving}
            onClick={async () => {
              // Only close once the API actually accepted it — closing
              // regardless made a failed create look like a successful one.
              const saved = await onSubmit();
              if (saved) onDone();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer max-w-30"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddEditBucket;
