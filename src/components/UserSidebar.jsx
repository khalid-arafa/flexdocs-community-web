"use client";
import { useDialogs } from "@/context/DialogsContext";
import { useLayoutContext } from "@/context/LayoutContext";
import { logout } from "@/utils/auth";
import {
  ExternalLink,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import UserInfoView from "./UserInfoView";
import Image from "next/image";

function UserSidebar({ children }) {
  const { sidebarClosed, toggleSidebar } = useLayoutContext();

  const router = useRouter();
  const { confirm } = useDialogs();

  const getClassnames = () => {
    let classnames = "bg-[#0F172A] fixed bottom-0 top-0 text-white z-10 flex flex-col transition-all duration-300 border-r border-[#1e293b] ";
    classnames += sidebarClosed ? "-left-[62px] md:left-0 w-[62px]" : "w-[300px]";
    return classnames;
  }

  return (
    <div
      className={getClassnames()}
    >
      {/* Toggle button */}
      <div className="flex flex-row relative">
        <button
          onClick={() => {            
            toggleSidebar();
          }}
          className={`absolute top-0 z-10 cursor-pointer ${!sidebarClosed ? "right-0" : "-right-[62px] md:right-0"} w-[62px] h-[62px] flex justify-center items-center`}
        >
          <Menu size={29} className={`${!sidebarClosed ? "text-white" : "text-[#0F172A] md:text-white"}`} />
        </button>
      </div>

      {!sidebarClosed && <div className="flex-flex-col mt-12 md:mt-24">
        <div className="flex w-[200px] h-[70px] mx-auto mb-8">
          <button 
            className="relative hover:scale-110 transition-all ease-in-out overflow-auto cursor-pointer" 
            onClick={() => {
              router.push("/");
              if(!sidebarClosed && window.innerWidth < 768) toggleSidebar();
            }}
          >
            <Image src={"/images/logo-white.png"} alt="Logo" className="overflow-auto" width={200} height={70} />
          </button>
        </div>
        <p className="text-lg leading-relaxed text-center text-[#ddd]">
          Build, manage, and scale databases effortlessly.
        </p>
      </div>}

      <div className="flex flex-col flex-1">
        {children}
      </div>

      <div className="z-10 px-0">
        <UserInfoView sidebarClosed={ sidebarClosed } withSettings={true} />
      </div>
        
      <div className="p-4 md:border-t md:border-gray-700 w-full">
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
          {!sidebarClosed && <span className="ml-3">Logout</span>}
        </button>
      </div>
    </div>
  );
}

export default UserSidebar;