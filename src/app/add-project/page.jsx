"use client";
import { motion } from "framer-motion";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { checkCodeValidity, createProject } from "@/utils/api";
import { Check, Loader, X } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { useLayoutContext } from "@/context/LayoutContext";
import AdminSidebarContent from "@/components/AdminSidebar";
import Button from "@/components/Button";
import Switch from "@/components/Switch";

export default function NewProject() {
  const router = useRouter();
  const { loadProjects } = useProjectsContext();
  const { sidebarClosed } = useLayoutContext();

  const [error, setError] = useState("");
  const [codeError, setCodeError] = useState("");
  const [checkingCode, setCheckingCode] = useState(false);
  const [validCode, setValidCode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
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
    } catch {
      setCodeError("Failed to check code availability");
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

    setSubmitting(true);
    try {
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
    } catch {
      setError("Failed to create project. Please try again.");
    }
    setSubmitting(false);
  };

  const handleCancel = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-gray-100 to-blue-50">
      <div className="flex w-full">
        <AdminSidebarContent />

        <div
          className={`flex-1 min-h-screen bg-gray-100 flex flex-col justify-center items-center transition-all duration-400 ease-in-out ${
            !sidebarClosed ? "lg:ml-[300px]" : "lg:ml-16"
          }`}
        >
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
            className="w-full max-w-2xl px-4 sm:px-6 py-8"
          >
            <div className="flex flex-col justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">
                Create New Project
              </h1>
              {error && (
                <span className="block mt-2 text-red-600 text-md">
                  {error}
                </span>
              )}
            </div>

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

              <div>
                <label
                  htmlFor="code"
                  className="block text-sm font-medium text-gray-700"
                >
                  Project Code
                </label>
                <div className="flex items-center gap-2">
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
                  {formData.code && (
                    <div className="mt-2 flex-shrink-0">
                      {checkingCode ? (
                        <Loader className="w-5 h-5 animate-spin text-gray-800" />
                      ) : validCode ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  )}
                </div>
                {codeError && (
                  <span className="block mt-2 text-red-600 text-sm">
                    {codeError}
                  </span>
                )}
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
                />
              </div>

              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.isPublic}
                  onChange={(val) =>
                    setFormData({ ...formData, isPublic: val })
                  }
                />
                <label
                  className="text-sm font-medium text-gray-700 select-none cursor-pointer"
                  onClick={() =>
                    setFormData({ ...formData, isPublic: !formData.isPublic })
                  }
                >
                  Public Project
                </label>
              </div>

              <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-3 pt-4">
                <Button
                  variant="secondary"
                  onClick={handleCancel}
                  className="!w-full sm:!w-auto"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  isLoading={submitting}
                  onClick={() => {}}
                  className="!w-full sm:!w-auto"
                >
                  Save Project
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
