"use client";
import { motion } from "framer-motion";

// pages/new-project.js
import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkCodeValidity, createProject } from "@/utils/api";
import UserSideSection from "../UserSideSection";
import { Check, Loader, X } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";

export default function NewProject() {
  const router = useRouter();
  const { loadProjects } = useProjectsContext();

  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [validCode, setValidCode] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isPublic: true,
    description: "",
  });

  const handleChange = async (e) => {
    const { name, type, checked, value } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
    if (name == "code") await handleCheckCode(value);
  };

  const handleCheckCode = async (code) => {
    if (!code) return;
    setValidCode(false);
    setCodeError("");
    const validation = validateCode(code);
    if (!validation.isValid) return setCodeError(validation.error);
    setCheckingCode(true);
    await new Promise((res) => setTimeout(() => res(), 100));
    try {
      const result = await checkCodeValidity({ code });
      const body = await result.json();
      if (result.ok && body.success) setValidCode(true);
    } catch (error) {
      console.log(error);
    }
    setCheckingCode(false);
  };

  function validateCode(str) {
    const regex = /^[a-z0-9-]+$/;
    if (!regex.test(str))
      return {
        isValid: false,
        error: "Only lowercase letters, numbers, and dashes are allowed",
      };
    return { isValid: true, error: "" };
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validCode) {
      return setCodeError("Please make sure you enter a valid project code.");
    }

    try {
      // Replace with actual API endpoint
      const response = await createProject({
        name: formData.name,
        code: formData.code,
        description: formData.description,
        isPublic: formData.isPublic,
      });
      const body = await response.json();
      if (response.ok) {
        loadProjects({ page: 1 });
        router.push("/");
      } else {
        setError(body.message);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-100 to-blue-50">
      <div className="max-w-8xl mx-auto flex flex-col lg:flex-row">
        {/* left */}
        <UserSideSection withBack />

        <div className="min-h-screen bg-gray-100 max-w-3xl w-full flex flex-col justify-center">
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
            className="p-6"
          >
            <div className="px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex flex-col justify-between mb-6">
                <h1 className="text-2xl font-bold text-gray-900">
                  Create New Project
                </h1>
                {error && (
                  <span className="block text-red-600 text-md center">
                    {error}
                  </span>
                )}
              </div>

              <div className="rounded-lg p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Project Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      required
                      value={formData.name}
                      placeholder="Enter project name"
                      onChange={handleChange}
                      className="mt-2 text-md bg-white px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex flex-row">
                    <div className="flex flex-1 flex-col">
                      <label
                        htmlFor="code"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Project Code
                      </label>
                      <div className="flex flex-row gap-4 items-end">
                        <input
                          type="text"
                          id="code"
                          name="code"
                          required
                          value={formData.code}
                          placeholder="Examples: project-db, books123, chatsapp"
                          onChange={handleChange}
                          className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        />
                        {validCode && formData.code && (
                          <div className="my-3 mx-3">
                            <div className="flex justify-center items-center h-5">
                              <Check className="w-6 h-6 text-green-500" />
                            </div>
                          </div>
                        )}
                        {!checkingCode && !validCode && formData.code && (
                          <div className="my-3 mx-3">
                            <div className="flex justify-center items-center h-5">
                              <X className="w-6 h-6 text-red-500" />
                            </div>
                          </div>
                        )}
                        {checkingCode && formData.code && (
                          <div className="my-3 mx-3">
                            <div className="flex justify-center items-center h-5">
                              <Loader className="w-6 h-6 animate-spin text-gray-800" />
                            </div>
                          </div>
                        )}
                      </div>
                      {codeError && (
                        <span className="block mt-2 text-red-600 text-md center">
                          {codeError}
                        </span>
                      )}
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="description"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Description
                    </label>
                    <textarea
                      id="description"
                      name="description"
                      rows="4"
                      value={formData.description}
                      onChange={handleChange}
                      placeholder="Enter project description"
                      className="mt-2 text-md bg-white px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  <div className="flex flex-row-reverse align-center items-center justify-end gap-2">
                    <label
                      htmlFor="isPublic"
                      className="block mt-2 text-md font-medium text-gray-700 select-none cursor-pointer"
                    >
                      Is Public
                    </label>
                    <input
                      type="checkbox"
                      id="isPublic"
                      name="isPublic"
                      checked={formData.isPublic}
                      onChange={handleChange}
                      className="mt-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                  </div>

                  <div className="flex items-center justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={handleCancel}
                      className="px-4 py-2 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600"
                    >
                      <svg
                        className="w-5 h-5 mr-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M5 13l4 4L19 7"
                        ></path>
                      </svg>
                      Save Project
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
