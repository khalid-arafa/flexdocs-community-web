"use client";

import Cookies from "js-cookie";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function UserInfoView({ withSettings = true, sidebarOpen }) {
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let _user = Cookies.get("user");
    if (_user) setUser(JSON.parse(_user));
  }, []);

  if (typeof user == "undefined") return <></>;

  return (
    <div>
      {/* User info */}
      <div className="flex flex-row p-3 mt-18 mb-4 justify-center items-center">
        <div className="flex flex-row flex-1 max-w-80">
          <img
            src={user?.avatar || "https://picsum.photos/80"}
            alt="User avatar"
            className="w-10 h-10 rounded-full"
          />
          {!sidebarOpen && (
            <div className="ml-3">
              <p className="font-medium">{user?.name || "loading ..."}</p>
              <p className="text-sm text-gray-400">Developer</p>
            </div>
          )}
        </div>
        {!sidebarOpen && withSettings && (
          <button
            onClick={() => router.push("/settings")}
            className="text-white cursor-pointer"
          >
            <Settings size={22} color="#ffffff77" />
          </button>
        )}
      </div>
    </div>
  );
}

export default UserInfoView;
