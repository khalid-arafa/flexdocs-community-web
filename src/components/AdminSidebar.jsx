"use client";
import { useDialogs } from "@/context/DialogsContext";
import { useLayoutContext } from "@/context/LayoutContext";
import { logout } from "@/utils/auth";
import { Briefcase, ExternalLink, Menu, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import UserInfoView from "./UserInfoView";

function AdminSidebar({ activeTabName }) {
  const { sidebarOpen, toggleSidebar } = useLayoutContext();
  const router = useRouter();
  const { confirm } = useDialogs();

  return (
    <div
      className={`bg-gray-800 fixed bottom-0 top-0 text-white z-10 ${
        sidebarOpen ? "w-16" : "w-64"
      } flex flex-col transition-all duration-300`}
    >
      {/* Toggle button */}
      <button
        onClick={toggleSidebar}
        className="absolute top-4 left-4 z-10 text-white cursor-pointer"
      >
        <Menu size={29} color="white" />
      </button>

      <UserInfoView sidebarOpen={sidebarOpen} />

      {/* Navigation */}
      <nav className="pt-4">
        <ul>
          <li>
            <button
              onClick={() => router.push("/admin/accounts")}
              className={`flex items-center px-4 py-3 w-full cursor-pointer ${
                activeTabName === "accounts"
                  ? "bg-gray-700"
                  : "hover:bg-gray-700"
              }`}
            >
              <Users size={22} color="white" />
              {!sidebarOpen && <span className="ml-3">Accounts</span>}
            </button>
          </li>
          <li>
            <button
              onClick={() => router.push("/admin/projects")}
              className={`flex items-center px-4 py-3 w-full cursor-pointer ${
                activeTabName === "projects"
                  ? "bg-gray-700"
                  : "hover:bg-gray-700"
              }`}
            >
              <Briefcase size={22} color="white" />
              {!sidebarOpen && <span className="ml-3">Projects</span>}
            </button>
          </li>
        </ul>
      </nav>

      {/* Logout button */}
      <div className="p-4 border-t border-gray-700">
        <button
          className="flex items-center text-white w-full cursor-pointer opacity-60 hover:opacity-100 transition-opacity duration-300"
          onClick={async (e) => {
            const confirmed = await confirm({
              title: "Logout",
              msg: "Are you sure you want to logout?",
            });
            if (!confirmed) return;
            logout();
            router.replace("/login");
          }}
        >
          <ExternalLink size={22} color="white" />
          {!sidebarOpen && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default AdminSidebar;
