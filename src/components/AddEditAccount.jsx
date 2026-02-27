"use client";

import {
  addAccountUser,
  updateAccountData,
} from "@/utils/api";
import { isValidEmail, isValidPhone } from "@/utils/validations";
import React, { useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import Button from "./Button";

function AddEditAccount({
  title = "Adding Account",
  activeProject,
  user,
  onDone,
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState("");

  const [nameError, setNameError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const onSubmit = async () => {
    try {
      let isValid = true;
      if (!name) {
        setNameError("Name is required!");
        isValid = false;
      }
      if (!email) {
        setEmailError("Email is required!");
        isValid = false;
      }
      if (email && !isValidEmail(email)) {
        setEmailError("Email is not valid!");
        isValid = false;
      }
      if (phone && !isValidPhone(phone)) {
        setPhoneError("Phone is not valid!");
        isValid = false;
      }
      if (!password) {
        setPasswordError("Password is required!");
        isValid = false;
      }
      if (password && password.length < 8) {
        setPasswordError("Password should be at least 8 characters!");
        isValid = false;
      }
      if (!isValid) return;

      if (title.toLowerCase().includes("add")) {
        const result = await addAccountUser({
          projectCode: activeProject.code,
          data: { name, email, password, avatar },
        });
        if (result.ok) {
          toast("Account has been added successfully!");
        } else {
          const body = await result.json();
          return toast(body.message);
        }
      }
      if (title.toLowerCase().includes("edit")) {
        const result = await updateAccountData({
          projectCode: activeProject.code,
          docId: user._id,
          data: { name, email, phone, avatar },
        });
        if (result.ok) {
          toast("Account has been updated successfully!");
        } else {
          const body = await result.json();
          return toast(body.message);
        }
      }
      onDone();
    } catch (error) {
      console.log("Couldn't create account", error);
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
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter account name"
          />
          {nameError && (
            <p className="text-red-500 text-sm mt-1">{nameError}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter email"
          />
          {emailError && (
            <p className="text-red-500 text-sm mt-1">{emailError}</p>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">
            Password <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter password"
          />
          {passwordError && (
            <p className="text-red-500 text-sm mt-1">{passwordError}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Phone</label>
          <input
            type="phone"
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value);
              setPhoneError("");
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter phone"
          />
          {phoneError && (
            <p className="text-red-500 text-sm mt-1">{phoneError}</p>
          )}
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Avatar Url</label>
          <input
            type="text"
            value={avatar}
            onChange={(e) => {
              setAvatar(e.target.value);
            }}
            className={`w-full px-3 py-2 border rounded-lg transition-all duration-200 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none border-gray-300`}
            placeholder="Enter avatar url"
          />
        </div>
      </div>

      <div className="flex w-full justify-end">
        <div className="flex gap-2 mt-4">
          <Button
            variant="cancel"
            onClick={(e) => onDone()}
            className="px-4 py-2 text-black rounded-xl hover:bg-gray-200 transition cursor-pointer max-w-[150px]"
          >
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await onSubmit();
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition cursor-pointer max-w-[150px]"
          >
            Submit
          </Button>
        </div>
      </div>
      <ToastContainer />
    </div>
  );
}

export default AddEditAccount;
