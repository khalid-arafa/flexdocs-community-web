"use client";

import { useLayoutContext } from "@/context/LayoutContext";
import Cookies from "js-cookie";
import { Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

// Initials fallback for a user with no usable avatar URL. Kept as local markup
// rather than a remote placeholder image: the sidebar renders on every screen of
// an operator console, so it must not fire a third-party request on every page
// view just to draw an empty circle.
const getInitials = (label) => {
  const parts = String(label || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return parts.slice(0, 2).map((p) => p[0].toUpperCase()).join("");
};

function UserInfoView({ withSettings = true, sidebarClosed }) {
  const [user, setUser] = useState(null);
  // Also covers a well-formed avatar URL that 404s or is blocked, which the
  // remote placeholder used to mask.
  const [avatarFailed, setAvatarFailed] = useState(false);
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

  const avatarSrc =
    user.avatar && /^https?:\/\//.test(user.avatar) ? user.avatar : null;

  return (
    <div>
      {/* User info */}
      <div className="flex flex-row p-3 mt-2 mb-2 justify-center items-center">
        <div className="flex flex-row flex-1 max-w-80">
          {avatarSrc && !avatarFailed ? (
            <img
              src={avatarSrc}
              alt="User avatar"
              onError={() => setAvatarFailed(true)}
              className="w-10 h-10 rounded-full shrink-0 object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full shrink-0 bg-white/20 text-white flex items-center justify-center text-sm font-semibold select-none">
              {getInitials(user.name || user.email)}
            </div>
          )}
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
