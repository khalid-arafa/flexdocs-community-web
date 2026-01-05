"use client";
import { useState } from "react";
import { Briefcase, ExternalLink, Menu, Users, X } from "lucide-react";

function AdminSidebar({ activeTabName = "accounts" }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navItems = [
    { name: "accounts", icon: Users, label: "Accounts" },
    { name: "projects", icon: Briefcase, label: "Projects" },
  ];

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 left-0 h-full bg-gradient-to-b from-slate-900 to-slate-800 text-white z-50 shadow-2xl transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-0 lg:w-20"
        } overflow-hidden`}
      >
        {/* Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-slate-700/50">
          <div className={`font-bold text-xl ${!sidebarOpen && "lg:hidden"}`}>
            Admin
          </div>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* User Section */}
        <div className="px-6 py-6 border-b border-slate-700/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center font-semibold">
              A
            </div>
            <div className={`${!sidebarOpen && "lg:hidden"} overflow-hidden`}>
              <div className="font-medium text-sm">Admin User</div>
              <div className="text-xs text-slate-400">admin@example.com</div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-6">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTabName === item.name;
              
              return (
                <li key={item.name}>
                  <button
                    className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 ${
                      isActive
                        ? "bg-blue-600 shadow-lg shadow-blue-600/30"
                        : "hover:bg-slate-700/50"
                    } group`}
                  >
                    <Icon size={22} className={isActive ? "text-white" : "text-slate-300"} />
                    <span
                      className={`ml-4 font-medium ${
                        !sidebarOpen && "lg:hidden"
                      } ${isActive ? "text-white" : "text-slate-300"}`}
                    >
                      {item.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Logout */}
        <div className="px-3 pb-6">
          <button
            className="w-full flex items-center px-4 py-3 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-200"
          >
            <ExternalLink size={22} />
            <span className={`ml-4 font-medium ${!sidebarOpen && "lg:hidden"}`}>
              Logout
            </span>
          </button>
        </div>
      </div>

      {/* Mobile menu button */}
      <button
        onClick={() => setSidebarOpen(true)}
        className="fixed top-4 left-4 z-30 lg:hidden p-2 bg-slate-900 text-white rounded-lg shadow-lg"
      >
        <Menu size={24} />
      </button>
    </>
  );
}

export default AdminSidebar;