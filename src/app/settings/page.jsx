"use client";
import { motion } from "framer-motion";

// pages/new-project.js
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteUser, getUserData, updateUser } from "@/utils/api";
import { Check, Trash } from "lucide-react";
import { toast } from "react-toastify";
import { showDialog } from "@/components/CustomDialog";
import ChangePasswordModal from "./ChangePassword";
import { useDialogs } from "@/context/DialogsContext";
import { logout } from "@/utils/auth";
import { clearSockets} from "@/utils/socket";
import AdminSidebarContent from "@/components/AdminSidebar";
import { useLayoutContext } from "@/context/LayoutContext";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function UserSettings() {
  const router = useRouter();
  const {sidebarClosed} = useLayoutContext();
  const { confirm } = useDialogs();

  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    isPublic: true,
    description: "",
  });

  const handleChange = (e) => {
    const { name, type, checked, value } = e.target;

    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      // Replace with actual API endpoint
      const response = await updateUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      const body = await response.json();
      if (response.ok) {
        toast("User settings were updated successfully!");
      } else {
        setError(body.message);
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };

  const handleDelete = async () => {
    try {
      const confirmed = await confirm({
        msg: "Are you sure you want to delete this account with all its projects, files and data?",
      });
      if (!confirmed) return;
      const result = await deleteUser();
      if (result.ok) {
        clearSockets();
        logout();
        return router.replace("/login");
      }
      const body = await result.json();
      toast(body.message);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    const getUser = async () => {
      const result = await getUserData();
      const body = await result.json();
      if (result.ok) {
        setFormData({
          name: body.name,
          email: body.email || "",
          phone: body.phone || "",
        });
      } else {
        toast(body.message);
      }
    };
    getUser();
  }, []);

  return <LayoutWrapper sidebar={<AdminSidebarContent />}>
    <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[1000px]">
      <div className="flex justify-between items-center my-6">
        <h1 className="text-2xl font-bold text-gray-900">
          User Settings
        </h1>
        {error && (
          <span className="block text-red-600 text-md center">
            {error}
          </span>
        )}
      </div>

      <div className="rounded-lg py-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Name
            </label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Name"
              className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              required
              value={formData.email || ""}
              onChange={handleChange}
              placeholder="Email"
              className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone
            </label>
            <input
              type="phone"
              id="phone"
              name="phone"
              value={formData.phone || ""}
              onChange={handleChange}
              placeholder="Phone"
              className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              showDialog({
                content: ChangePasswordModal,
                params: { toast },
              });
            }}
          >
            <span className="text-black underline cursor-pointer select-none">
              Change Password
            </span>
          </button>

          <div className="flex items-center justify-end space-x-4 pt-4 gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center px-4 py-2 border border-transparent cursor-pointer text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 gap-2"
            >
              <Trash size={22} color="white" />
              Delete Account
            </button>
            <button
              type="submit"
              className="inline-flex items-center px-4 py-2 border border-transparent cursor-pointer text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 gap-2"
            >
              <Check size={22} color="white" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  </LayoutWrapper>
}
