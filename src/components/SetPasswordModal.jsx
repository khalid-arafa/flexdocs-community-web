import { updateAccountData } from "@/utils/api";
import React, { useState } from "react";
import Button from "./Button";

function SetPasswordModal({
  title = "Setting Password",
  activeProject,
  accountId,
  toast,
  onDone,
}) {
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const onSubmit = async () => {
    try {
      let isValid = true;
      if (!password) {
        setPasswordError("Password is required!");
        isValid = false;
      }
      if (password && password.length < 8) {
        setPasswordError("Password should be at least 8 characters!");
        isValid = false;
      }
      if (!isValid) return;

      const result = await updateAccountData({
        projectCode: activeProject.code,
        docId: accountId,
        data: { password },
      });
      if (result.ok) {
        toast("Account password has been changed successfully!");
      } else {
        const body = await result.json();
        return toast(body.message);
      }

      onDone();
    } catch (error) {
      console.log("Couldn't change password", error);
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
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter New Password"
          />
          {passwordError && (
            <p className="text-red-500 text-sm mt-1">{passwordError}</p>
          )}
        </div>
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
            onClick={async () => {
              await onSubmit();
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
