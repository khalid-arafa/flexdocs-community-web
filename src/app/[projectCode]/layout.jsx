"use client";
import { useLayoutContext } from "@/context/LayoutContext";
import { usePathname } from "next/navigation";

import { useCallback, useEffect, useRef, useState } from "react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { getProjectByCode } from "@/utils/api";
import FileUploader from "@/components/FileUploader";
import UserSidebar from "@/components/UserSidebar";
import { AlertTriangle, Database, Folder, Loader, RefreshCw, Settings, Users } from "lucide-react";
import Tooltip from "@/components/Tooltip";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LayoutWrapper from "@/components/LayoutWrapper";

// No providers here on purpose: Dialogs/Layout/Projects/ProjectAuth are all
// mounted once in the root layout. Re-mounting them here gave this subtree its
// own Projects/ProjectAuth state while its pages still read the ROOT
// Storage/Database state, and put a second LayoutProvider on the same
// `sidebarClosed` localStorage key.
export default function layout({ children }) {
  return <LayoutContent>{children}</LayoutContent>;
}

const LayoutContent = ({ children }) => {
  const { sidebarClosed, toggleSidebar } = useLayoutContext();

  const paths = usePathname();
  const projectCode = paths.split("/")[1];
  const title = paths.split("/")[paths.split("/").length - 1];

  const { activeProject, setActiveProject } = useProjectsContext();

  // "loading" | "ready" | "notfound" | "failed"
  //
  // The fetch is driven here rather than through ProjectsContext's
  // loadActiveProject because that helper collapses every failure into one
  // `error` string, so the layout could not tell "this project does not exist"
  // (a real 404) from "the request never landed" — and rendered the 404 screen
  // for both. A user whose network blipped was told their project was deleted.
  const [status, setStatus] = useState("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const reqIdRef = useRef(0);

  const loadProject = useCallback(async () => {
    if (!projectCode) return;
    const reqId = ++reqIdRef.current;
    setStatus("loading");
    setErrorMessage("");
    try {
      const result = await getProjectByCode({ code: projectCode });
      const body = await result.json().catch(() => ({}));
      if (reqId !== reqIdRef.current) return; // superseded by a newer project
      if (result.ok) {
        setActiveProject(body);
        setStatus("ready");
        return;
      }
      setActiveProject(null);
      if (result.status === 404) {
        setStatus("notfound");
        return;
      }
      setErrorMessage(body.message || "The project could not be loaded.");
      setStatus("failed");
    } catch {
      if (reqId !== reqIdRef.current) return;
      setActiveProject(null);
      setErrorMessage(
        "We could not reach the server. Check your connection and try again."
      );
      setStatus("failed");
    }
  }, [projectCode, setActiveProject]);

  // Keyed on the code, not on `activeProject` being falsy: a layout is NOT
  // remounted when only a dynamic segment changes, so the old condition left
  // the previous project's data on screen after navigating from /a to /b.
  useEffect(() => {
    if (!projectCode) return;
    if (activeProject && activeProject.code === projectCode) {
      setStatus("ready");
      return;
    }
    loadProject();
  }, [projectCode]);

  if (status === "failed") {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4">
        <div className="bg-foreground/5 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <AlertTriangle className="w-12 h-12 text-brand mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Couldn&apos;t load this project
          </h2>
          <p className="text-foreground/50 mb-6">{errorMessage}</p>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={loadProject}
              className="inline-flex items-center gap-2 px-6 py-2 bg-brand text-white rounded-lg hover:opacity-90 transition cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
            <Link
              href="/"
              className="inline-block px-6 py-2 border border-foreground/20 text-foreground rounded-lg hover:bg-foreground/5 transition"
            >
              Go Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (status === "notfound") {
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

  // Also covers the brief window where another screen clears activeProject (a
  // project delete) before the router has navigated away.
  if (!activeProject || activeProject.code !== projectCode) {
    return <div className="flex justify-center items-center p-8 h-screen bg-white text-black">
      <Loader className="w-6 h-6 animate-spin text-gray-800" />
    </div>;
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