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
import { Loader } from "lucide-react";

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
  const { sidebarOpen } = useLayoutContext();
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
    return <div className="flex justify-center items-center p-8 h-screen bg-white text-black">404</div>;
  }

  return (
    <div className="flex bg-gray-100">
      <UserSidebar activeTabName={title} projectCode={projectCode} />
      <div
        className={`flex-1 ${
          sidebarOpen ? "ml-16" : "ml-64"
        } transition-all duration-400 ease-in-out`}
      >
        {/* Topbar */}
        <header className="bg-white shadow-sm">
          <div className="flex justify-between items-center px-6 py-4">
            <div>
              <h1 className="text-xl font-semibold capitalize text-gray-800">
                {title}
              </h1>
            </div>
          </div>
        </header>

        {/* main children section */}
        <main>{children}</main>
        <div className="fixed bottom-4 right-4 z-40">
          <FileUploader />
        </div>
      </div>
    </div>
  );
};
