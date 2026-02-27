"use client";

import { updateUser } from "@/utils/api";
import React, { useState } from "react";
import Button from "@/components/Button";

function ChangePasswordModal({ toast, onDone }) {
  const [oldPassword, setOldPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      let isValid = true;
      if (!oldPassword) {
        setPasswordError("Old password is required!");
        isValid = false;
      }
      if (oldPassword && oldPassword.length < 8) {
        setPasswordError("Old password should be at least 8 characters!");
        isValid = false;
      }
      if (!password) {
        setPasswordError("New Password is required!");
        isValid = false;
      }
      if (password && password.length < 8) {
        setPasswordError("New Password should be at least 8 characters!");
        isValid = false;
      }
      if (!confirmPassword) {
        setPasswordError("Password is required!");
        isValid = false;
      }
      if (confirmPassword && confirmPassword !== password) {
        setPasswordError("Password and confirm don't match!");
        isValid = false;
      }
      if (!isValid) return;

      const result = await updateUser({ password, oldPassword });
      if (result.ok) {
        toast("Your password has been changed successfully!");
      } else {
        const body = await result.json();
        return setPasswordError(body.message);
      }

      onDone();
    } catch {
      setPasswordError("Failed to change password. Please try again.");
    }
  };

  return (
    <div className={` transition-all duration-300 ease-in-out`}>
      <form
        onSubmit={onSubmit}
        className="gap-2 flex flex-col items-center justify-center"
      >
        <div
          className={`bg-white rounded-3xl text-black transition-all duration-300 ease-in-out max-w-md w-full`}
        >
          <h2 className="font-bold text-black text-xl mb-4">Change Password</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Old Password <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={oldPassword}
              onChange={(e) => {
                setOldPassword(e.target.value);
                setPasswordError("");
              }}
              className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
              placeholder="Enter New Password"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              New Password <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setPasswordError("");
              }}
              className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
              placeholder="Enter New Password"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Confirm Password <span className="text-red-500">*</span>
            </label>
            <input
              required
              type="password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setPasswordError("");
              }}
              className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
              placeholder="Enter New Password"
            />
          </div>
          {passwordError && (
            <p className="text-red-500 text-sm mt-1">{passwordError}</p>
          )}
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button
            onClick={(e) => onDone()}
            variant="cancel"
          >
            Cancel
          </Button>
          <Button type="submit">
            Submit
          </Button>
        </div>
      </form>
    </div>
  );
}

export default ChangePasswordModal;
