import { updateAccountData } from "@/utils/api";
import React, { useRef, useState } from "react";
import Button from "./Button";

// One rule per field, shared by the on-blur check and the submit gate — so the
// two can never disagree about what "valid" means. Returns "" for valid.
const VALIDATORS = {
  password: (value) => {
    if (!value) return "Password is required!";
    if (value.length < 8) return "Password should be at least 8 characters!";
    return "";
  },
};

const FIELDS = ["password"];

function SetPasswordModal({
  title = "Setting Password",
  activeProject,
  accountId,
  toast,
  onDone,
}) {
  const [values, setValues] = useState({ password: "" });
  const [errors, setErrors] = useState({ password: "" });
  const [formError, setFormError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const refs = { password: useRef(null) };

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

  // Resolves true only when the password was really changed, so the caller
  // knows whether it may close the dialog.
  const onSubmit = async () => {
    setFormError("");
    if (!validateAll()) return false;

    setIsSaving(true);
    try {
      const result = await updateAccountData({
        projectCode: activeProject.code,
        docId: accountId,
        data: { password: values.password },
      });
      if (!result.ok) {
        const body = await result.json().catch(() => null);
        const msg = body?.message || "Error has happen while contacting the api!";
        setFormError(msg);
        toast(msg, { type: "error" });
        return false;
      }
      toast("Account password has been changed successfully!");
      return true;
    } catch (error) {
      console.log("Couldn't change password", error);
      const msg = "Error has happen while contacting the api!";
      setFormError(msg);
      toast(msg, { type: "error" });
      return false;
    } finally {
      setIsSaving(false);
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
            New Password <span className="text-red-500">*</span>
          </label>
          <input
            ref={refs.password}
            type="password"
            value={values.password}
            onChange={handleChange("password")}
            onBlur={handleBlur("password")}
            aria-invalid={errors.password ? "true" : undefined}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none ${
              errors.password ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Enter New Password"
          />
          {errors.password && (
            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
          )}
        </div>
        {formError && <p className="text-red-500 text-sm">{formError}</p>}
      </div>
      <div className="flex justify-end w-full">
        <div className="flex gap-2 mt-4">
          <Button
            onClick={(e) => onDone()}
            variant="cancel"
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

export default SetPasswordModal;
