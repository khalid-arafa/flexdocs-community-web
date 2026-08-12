"use client";

import { useEffect, useState } from "react";
import { getUserData, updateUser } from "@/utils/api";
import { Check } from "lucide-react";
import { toast } from "react-toastify";
import { showDialog } from "@/components/CustomDialog";
import ChangePasswordModal from "./ChangePassword";
import Button from "@/components/Button";

const INPUT_CLASS =
  "mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500";

export default function AdminSettings() {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((d) => ({ ...d, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const response = await updateUser({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
      });
      const body = await response.json();
      if (response.ok) toast("Admin settings were updated successfully!");
      else setError(body.message);
    } catch (err) {
      console.error("Error updating admin settings:", err);
      setError("Something went wrong. Please try again.");
    }
    setSaving(false);
  };

  useEffect(() => {
    const getUser = async () => {
      const result = await getUserData();
      const body = await result.json();
      if (result.ok) {
        setFormData({
          name: body.name || "",
          email: body.email || "",
          phone: body.phone || "",
        });
      } else {
        toast(body.message);
      }
    };
    getUser();
  }, []);

  return (
    <div>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
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
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            required
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className={INPUT_CLASS}
          />
        </div>

        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
            Phone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="Phone"
            className={INPUT_CLASS}
          />
        </div>

        <button
          type="button"
          onClick={() => {
            showDialog({ content: ChangePasswordModal, params: { toast } });
          }}
        >
          <span className="text-black underline cursor-pointer select-none">
            Change Password
          </span>
        </button>

        <div className="flex items-center justify-end pt-4 gap-2">
          <Button
            type="submit"
            isLoading={saving}
            className="flex items-center justify-center gap-2 max-w-50"
          >
            <Check size={22} color="white" />
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
