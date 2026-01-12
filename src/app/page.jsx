"use client";

import { useProjectsContext } from "@/context/ProjectsContext";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus } from "lucide-react";
import { useLayoutContext } from "@/context/LayoutContext";
import AdminSidebarContent from "@/components/AdminSidebar";

export default function ProjectsPage() {
  const { projects, loadingProjects, loadProjects, clearProjects } =
    useProjectsContext();
  const {sidebarClosed} = useLayoutContext();
  const [isVisible, setIsVisible] = useState(false);

  const router = useRouter();

  useEffect(() => {
    loadProjects({ page: 1 });
    setIsVisible(true);

    return () => clearProjects();
  }, []);

  const handleAddProject = () => {
    router.push("/add-project");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-blue-50">
      <div className="mx-auto flex flex-col lg:flex-row">
        {/* Left Section - Info Panel */}
        <AdminSidebarContent />

        {/* Right Section - Projects List */}
        <div className={`flex justify-between items-center w-full transition-all duration-400 ease-in-out ${!sidebarClosed ? "ml-[300px]" : "ml-16"}`}>
          <div className="">
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, ease: "easeInOut", delay: 0.2 }}
              className="flex flex-col justify-center items-stretch flex-1 p-6 h-[100vh] w-full md:max-w-[800px]"
            >
              <div className="flex justify-center items-center mb-6 gap-8 md:gap-12 flex-col sm:flex-row w-full">
                <h1 className="text-3xl font-bold text-gray-800 flex items-center">
                  <svg
                    className="w-8 h-8 mr-3 text-[#283146]"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M7 3a1 1 0 000 2h6a1 1 0 100-2H7zM4 7a1 1 0 011-1h10a1 1 0 110 2H5a1 1 0 01-1-1zM2 11a2 2 0 012-2h12a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4z" />
                  </svg>
                  Your Projects
                </h1>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleAddProject}
                  className="bg-[#283146] cursor-pointer text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center group"
                >
                  <svg
                    className="w-5 h-5 mr-2 group-hover:rotate-90 transition-transform duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 4v16m8-8H4"
                    ></path>
                  </svg>
                  Add Project
                </motion.button>
              </div>

              {/* Projects Container */}
              <div className="overflow-y-auto pr-2 pt-4 rounded-lg custom-scrollbar w-full">
                {projects.map((project, index) => {
                  return (
                    <div
                      key={project._id}
                      className="bg-white rounded-xl shadow-md hover:shadow-xl hover:translate-x-2 transition-all duration-300 border border-gray-100 overflow-hidden group mb-4"
                    >
                      <Link href={`/${project.code}`}>
                        <div className="h-2 bg-[#495369] hover:scale-110"></div>
                        <div className="p-6">
                          <div className="mb-4">
                            <h2 className="text-2xl font-semibold text-[#283146] mb-1 transition-colors duration-300">
                              {project.name}
                            </h2>
                            {project.description && <p className="text-sm text-gray-500 flex items-center">
                              {project.description}
                            </p>}
                          </div>
                          <p className="text-sm text-gray-500 flex items-center gap-2">
                            <span>Code: </span>
                            <strong>{project.code}</strong>
                          </p>
                        </div>
                      </Link>
                    </div>
                  );
                })}

                {/* Empty state */}
                {!loadingProjects && projects.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="bg-white rounded-xl shadow-md p-10 text-center border border-gray-100"
                  >
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ delay: 0.2, duration: 0.5 }}
                      className="bg-indigo-50 p-4 rounded-full inline-block mb-4"
                    >
                      <svg
                        className="w-16 h-16 text-[#283146] mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        ></path>
                      </svg>
                    </motion.div>
                    <h3 className="text-2xl font-bold text-gray-800 mb-2">
                      No projects yet
                    </h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                      Create your first database project to start organizing
                      your work
                    </p>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleAddProject}
                      className="inline-flex items-center px-6 py-3 gap-2 cursor-pointer border border-transparent text-base font-medium rounded-lg shadow-md text-white bg-[#0F172A] hover:shadow-lg transition-all duration-300"
                    >
                      <Plus size={22} color="white" />
                      Create First Project
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
