"use client";

import { useLayoutContext } from "@/context/LayoutContext";
import Cookies from "js-cookie";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

function UserInfoView({ withSettings = true, sidebarClosed }) {
  const [user, setUser] = useState(null);
  const router = useRouter();
  const {toggleSidebar} = useLayoutContext();

  useEffect(() => {
    const raw = Cookies.get("user");
    if (raw) {
      try {
        setUser(JSON.parse(raw));
      } catch {
        setUser(null);
      }
    }
  }, []);

  if (!user) return <></>;

  const avatarSrc = user.avatar && /^https?:\/\//.test(user.avatar)
    ? user.avatar
    : "https://picsum.photos/80";

  return (
    <div>
      {/* User info */}
      <div className="flex flex-row p-3 mt-2 mb-2 justify-center items-center">
        <div className="flex flex-row flex-1 max-w-80">
          <img
            src={avatarSrc}
            alt="User avatar"
            className="w-10 h-10 rounded-full"
          />
          {!sidebarClosed && (
            <div className="ml-3">
              <p className="font-medium">{user?.name || "loading ..."}</p>
              <p className="text-sm text-gray-400">Developer</p>
            </div>
          )}
        </div>
        {!sidebarClosed && withSettings && (
          <button
            onClick={() => {
              router.push("/settings");
              if(!sidebarClosed && window.innerWidth < 768) toggleSidebar();
            }}
            className="text-white cursor-pointer hover:scale-110 rounded-full transition-all duration-200 ease-in-out"
          >
            <Settings size={22} className={"m-2 text-white"} />
          </button>
        )}
      </div>
    </div>
  );
}

export default UserInfoView;
