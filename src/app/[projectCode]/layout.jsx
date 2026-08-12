"use client";
import { DialogsProvider } from "@/context/DialogsContext";
import { LayoutProvider, useLayoutContext } from "@/context/LayoutContext";
import { ProjectAuthContextProvider } from "@/context/ProjectAuthContext";
import { ProjectsContextProvider } from "@/context/ProjectsContext";
import { usePathname } from "next/navigation";
import { ToastContainer } from "react-toastify";

import { useEffect, useState } from "react";
import { useProjectsContext } from "@/context/ProjectsContext";
import FileUploader from "@/components/FileUploader";
import UserSidebar from "@/components/UserSidebar";
import { Database, Folder, Loader, Settings, Users } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";

export default function layout({ children }) {
  return (
    <div>
      <DialogsProvider>
        <LayoutProvider>
          <ProjectsContextProvider>
            <ProjectAuthContextProvider>
              <LayoutContent children={children} />
            </ProjectAuthContextProvider>
          </ProjectsContextProvider>
        </LayoutProvider>
      </DialogsProvider>
      <ToastContainer />
    </div>
  );
}

const LayoutContent = ({ children }) => {
  const { sidebarClosed, toggleSidebar } = useLayoutContext();
  const [isLoading, setIsLoading] = useState(true);

  const paths = usePathname();
  const projectCode = paths.split("/")[1];
  const title = paths.split("/")[paths.split("/").length - 1];

  const { loadActiveProject, activeProject } = useProjectsContext();

  useEffect(() => {    
    const load = async () => {
      await loadActiveProject(projectCode);
      setIsLoading(false);
    }
    if(!activeProject) load();    
  }, [setIsLoading, activeProject]);


  if(isLoading) {
    return <div className="flex justify-center items-center p-8 h-screen bg-white text-black">
      <Loader className="w-6 h-6 animate-spin text-gray-800" />
    </div>;
  }

  if(!isLoading && !activeProject) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="bg-foreground/5 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="text-6xl font-bold text-brand mb-4">404</div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Project Not Found
          </h2>
          <p className="text-foreground/50 mb-6">
            The project you are looking for does not exist or has been removed.
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition"
          >
            Go Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <LayoutWrapper sidebar={<UserNavigation title={title} sidebarClosed={sidebarClosed} projectCode={activeProject.code} toggleSidebar={toggleSidebar} />}>
      <div className="flex flex-col">
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-6 py-4">
            <div className={`${sidebarClosed ? "pl-8 md:pl-0" : ""}`}>
              <h1 className={`text-xl font-semibold capitalize text-gray-800`}>
                {title}
              </h1>
            </div>
          </div>
        </header>

        {/* main children section */}
        <main className="flex flex-1">{children}</main>
        <div className="fixed bottom-4 right-4 z-40">
          <FileUploader />
        </div>
      </div>
    </LayoutWrapper>
  );
};


const UserNavigation = ({title, sidebarClosed, toggleSidebar, projectCode}) => {
  const router = useRouter();
  const onClick = (path) => {
    router.push(`/${projectCode}/${path}`);
    if(!sidebarClosed && window.innerWidth < 1024) toggleSidebar();
  }
  return <UserSidebar >
    {/* Navigation */}
    <nav className={`pt-4 w-full mt-4 md:mt-12`}>
      <ul>
        <li>
          <Tooltip text={"Accounts"} className={"w-full"}>
            <button
              onClick={() => onClick("accounts")}
              className={`flex items-center px-5 py-3 w-full cursor-pointer border-l-3 ${
                title === "accounts" ? "bg-[#1e293b] border-l-brand" : "hover:bg-[#1e293b] border-l-transparent"
              }`}
            >
              <Users size={22} color="white" />
              {!sidebarClosed && <span className="ml-3">Accounts</span>}
            </button>
          </Tooltip>
        </li>
        <li>
          <Tooltip text={"Database"} className={"w-full"}>
          <button
            onClick={() => onClick("database")}
            className={`flex items-center px-5 py-3 w-full cursor-pointer border-l-3 ${
              title === "database" ? "bg-[#1e293b] border-l-brand" : "hover:bg-[#1e293b] border-l-transparent"
            }`}
          >
            <Database size={22} color="white" />
            {!sidebarClosed && <span className="ml-3">Database</span>}
          </button>
          </Tooltip>
        </li>
        <li className="pb-6">
          <Tooltip text={"Storage"} className={"w-full"}>
            <button
              onClick={() => onClick("storage")}
              className={`flex items-center px-5 py-3 w-full cursor-pointer border-l-3 ${
                title === "storage" ? "bg-[#1e293b] border-l-brand" : "hover:bg-[#1e293b] border-l-transparent"
              }`}
            >
              <Folder size={22} color="white" />
              {!sidebarClosed && <span className="ml-3">Storage</span>}
            </button>
          </Tooltip>
        </li>
        <li className="pb-6">
          <Tooltip text={"Settings"} className={"w-full"}>
            <button
              onClick={() => onClick("settings")}
              className={`flex items-center px-5 py-3 w-full cursor-pointer border-l-3 ${
                title === "settings" ? "bg-[#1e293b] border-l-brand" : "hover:bg-[#1e293b] border-l-transparent"
              }`}
            >
              <Settings size={22} color="white" />
              {!sidebarClosed && <span className="ml-3">Project Settings</span>}
            </button>
          </Tooltip>
        </li>
      </ul>
    </nav>
  </UserSidebar>;
}