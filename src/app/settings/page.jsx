"use client";

import Tabs from "@/components/Tabs";
import AdminSettings from "./AdminSettings";
import EmailSettings from "./EmailSettings";
import AdminSidebarContent from "@/components/AdminSidebar";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function SettingsPage() {
  const tabs = [
    { label: "Admin Settings", content: <AdminSettings /> },
    { label: "Email Settings", content: <EmailSettings /> },
  ];

  return (
    <LayoutWrapper sidebar={<AdminSidebarContent />}>
      <div className="px-4 sm:px-6 lg:px-8 py-8 w-full max-w-[1000px]">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Settings</h1>
        <Tabs tabs={tabs} />
      </div>
    </LayoutWrapper>
  );
}
