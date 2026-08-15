"use client";

import {
  addAccountUser,
  updateAccountData,
} from "@/utils/api";
import { isValidEmail, isValidPhone } from "@/utils/validations";
import React, { useRef, useState } from "react";
import { toast } from "react-toastify";
import Button from "./Button";

// One rule per field, shared by the on-blur check and the submit gate — so the
// two can never disagree about what "valid" means. Each returns "" for valid.
// Optional fields (phone, avatar) are only checked once something is typed.
const VALIDATORS = {
  name: (value) => (!value.trim() ? "Name is required!" : ""),
  email: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "Email is required!";
    if (!isValidEmail(trimmed)) return "Email is not valid!";
    return "";
  },
  password: (value, { isAdding }) => {
    // Only a new account must carry a password; editing one may leave it blank
    // to keep the existing password.
    if (!value) return isAdding ? "Password is required!" : "";
    if (value.length < 8) return "Password should be at least 8 characters!";
    return "";
  },
  phone: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return isValidPhone(trimmed) ? "" : "Phone is not valid!";
  },
  avatar: (value) => {
    const trimmed = value.trim();
    if (!trimmed) return "";
    return /^https?:\/\/\S+$/i.test(trimmed)
      ? ""
      : "Avatar url must start with http:// or https://";
  },
};

// Submit focuses the first offender in the order the fields appear on screen.
const FIELDS = ["name", "email", "password", "phone", "avatar"];

const EMPTY_ERRORS = {
  name: "",
  email: "",
  password: "",
  phone: "",
  avatar: "",
};

function AddEditAccount({
  title = "Adding Account",
  activeProject,
  user,
  onDone,
}) {
  const isAdding = title.toLowerCase().includes("add");

  // Editing starts from the account being edited — the form used to open blank
  // and would then overwrite the record with those blanks.
  const [values, setValues] = useState({
    name: user?.name || "",
    email: user?.email || "",
    password: "",
    phone: user?.phone || "",
    avatar: user?.avatar || "",
  });
  const [errors, setErrors] = useState(EMPTY_ERRORS);
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refs = {
    name: useRef(null),
    email: useRef(null),
    password: useRef(null),
    phone: useRef(null),
    avatar: useRef(null),
  };

  const validate = (field, value) => VALIDATORS[field](value, { isAdding });

  const handleChange = (field) => (e) => {
    const value = e.target.value;
    setValues((prev) => ({ ...prev, [field]: value }));
    // A visible error disappears as soon as the field becomes valid again,
    // without waiting for another blur.
    setErrors((prev) =>
      prev[field] && !validate(field, value) ? { ...prev, [field]: "" } : prev
    );
  };

  const handleBlur = (field) => () =>
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }));

  // Final gate: re-check everything, then focus the first offending input.
  const validateAll = () => {
    const next = { ...EMPTY_ERRORS };
    for (const field of FIELDS) next[field] = validate(field, values[field]);
    setErrors(next);
    const firstInvalid = FIELDS.find((field) => next[field]);
    if (firstInvalid) {
      refs[firstInvalid].current?.focus();
      return false;
    }
    return true;
  };

  const failWith = async (result) => {
    const body = await result.json().catch(() => null);
    const msg = body?.message || "Error has happen while contacting the api!";
    setFormError(msg);
    toast(msg, { type: "error" });
    return false;
  };

  // Resolves true only when the account was really saved, so the caller knows
  // whether it may close the dialog.
  const onSubmit = async () => {
    setFormError("");
    if (!validateAll()) return false;

    const name = values.name.trim();
    const email = values.email.trim();
    const phone = values.phone.trim();
    const avatar = values.avatar.trim();
    const password = values.password;

    setIsSaving(true);
    try {
      if (isAdding) {
        const result = await addAccountUser({
          projectCode: activeProject.code,
          data: { name, email, password, avatar },
        });
        if (!result.ok) return await failWith(result);
        toast("Account has been added successfully!");
        return true;
      }

      const result = await updateAccountData({
        projectCode: activeProject.code,
        docId: user._id,
        // Password is optional when editing, and only sent when actually
        // retyped — it used to be collected and then silently dropped.
        data: { name, email, phone, avatar, ...(password ? { password } : {}) },
      });
      if (!result.ok) return await failWith(result);
      toast("Account has been updated successfully!");
      return true;
    } catch (error) {
      console.log("Couldn't create account", error);
      const msg = "Error has happen while contacting the api!";
      setFormError(msg);
      toast(msg, { type: "error" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const inputClasses = (field) =>
    `w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
      errors[field] ? "border-red-500" : "border-gray-300"
    }`;

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
            Name <span className="text-red-500">*</span>
          </label>
          <input
            ref={refs.name}
            type="text"
            value={values.name}
            onChange={handleChange("name")}
            onBlur={handleBlur("name")}
            aria-invalid={errors.name ? "true" : undefined}
            className={inputClasses("name")}
            placeholder="Enter account name"
          />
          {errors.name && (
            <p className="text-red-500 text-sm mt-1">{errors.name}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            ref={refs.email}
            type="email"
            value={values.email}
            onChange={handleChange("email")}
            onBlur={handleBlur("email")}
            aria-invalid={errors.email ? "true" : undefined}
            className={inputClasses("email")}
            placeholder="Enter email"
          />
          {errors.email && (
            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Password {isAdding && <span className="text-red-500">*</span>}
          </label>
          <input
            ref={refs.password}
            type="password"
            value={values.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            aria-invalid={errors.password ? "true" : undefined}
            className={inputClasses("password")}
            placeholder={isAdding ? "Enter password" : "Leave blank to keep current"}
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            ref={refs.phone}
            type="phone"
            value={values.phone}
            onChange={handleChange("phone")}
            onBlur={handleBlur("phone")}
            aria-invalid={errors.phone ? "true" : undefined}
            className={inputClasses("phone")}
            placeholder="Enter phone"
          />
          {errors.phone && (
            <p className="text-red-500 text-sm mt-1">{errors.phone}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Avatar Url</label>
          <input
            ref={refs.avatar}
            type="text"
            value={values.avatar}
            onChange={handleChange("avatar")}
            onBlur={handleBlur("avatar")}
            aria-invalid={errors.avatar ? "true" : undefined}
            className={inputClasses("avatar")}
            placeholder="Enter avatar url"
          />
          {errors.avatar && (
            <p className="text-red-500 text-sm mt-1">{errors.avatar}</p>
          )}
        </div>

        {formError && <p className="text-red-500 text-sm">{formError}</p>}
      </div>

      <div className="flex w-full justify-end">
        <div className="flex gap-2 mt-4">
          <Button
            variant="cancel"
            onClick={(e) => onDone()}
            className="px-4 py-2 text-black rounded-xl hover:bg-gray-200 transition cursor-pointer max-w-37.5"
          >
            Cancel
          </Button>
          <Button
            isLoading={isSaving}
            onClick={async () => {
              const saved = await onSubmit();
              if (saved) onDone();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer max-w-37.5"
          >
            Submit
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AddEditAccount;
