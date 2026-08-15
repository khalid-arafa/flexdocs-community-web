"use client";

import { useProjectsContext } from "@/context/ProjectsContext";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Loader, Plus, RefreshCw } from "lucide-react";
import AdminSidebarContent from "@/components/AdminSidebar";
import LayoutWrapper from "@/components/LayoutWrapper";
import LoadMorePagination from "@/components/LoadMorePagination";

export default function ProjectsPage() {
  const {
    projects,
    loadingProjects,
    loadingMoreProjects,
    loadProjects,
    clearProjects,
    projectsPage,
    setProjectsPage,
    projectsTotalCount,
    error,
  } = useProjectsContext();

  const router = useRouter();

  useEffect(() => {
    loadProjects({ page: 1 });

    return () => clearProjects();
  }, []);

  // The admin endpoint pages at 40 (getAllProjects), so loading page 1 alone
  // made every project past the 40th unreachable. Same page-state-drives-an-
  // effect shape the collections and accounts lists use.
  useEffect(() => {
    if (projectsPage > 1) loadProjects({ page: projectsPage });
  }, [projectsPage]);

  const handleAddProject = () => {
    router.push("/add-project");
  };

  // A failed load must not masquerade as "you have no projects yet".
  const hasFailed = Boolean(error) && !loadingProjects && !loadingMoreProjects;
  const isEmpty = !loadingProjects && !error && projects.length === 0;

  return (
    <LayoutWrapper sidebar={<AdminSidebarContent />}>
      <div className="flex flex-col w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6 mt-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Your Projects</h1>
            <p className="text-gray-500 mt-1">
              Manage and navigate all your database projects in one place.
            </p>
          </div>
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleAddProject}
            className="bg-[#283146] cursor-pointer text-white px-6 py-3 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center w-full sm:w-auto"
          >
            <Plus className="w-5 h-5 mr-2" />
            Add Project
          </motion.button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm text-gray-500">Total projects</p>
            <p className="text-2xl font-semibold text-[#283146] mt-1">
              {projectsTotalCount || projects.length}
            </p>
          </div>
        </div>

        {loadingProjects && (
          <div className="flex justify-center items-center p-8">
            <Loader className="w-6 h-6 animate-spin text-gray-800" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
          {projects.map((project) => {
            return (
              <Link
                key={project._id}
                href={`/${project.code}`}
                className="bg-white rounded-xl shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-gray-100 overflow-hidden group"
              >
                <div className="h-1.5 bg-[#495369]"></div>
                <div className="p-6">
                  <h2 className="text-xl font-semibold text-[#283146] mb-2 line-clamp-1">
                    {project.name}
                  </h2>
                  <p className="text-sm text-gray-500 min-h-10 line-clamp-2">
                    {project.description || "No description provided."}
                  </p>
                  <p className="text-sm text-gray-600 mt-4">
                    Code: <strong>{project.code}</strong>
                  </p>
                </div>
              </Link>
            );
          })}
        </div>

        {hasFailed && projects.length === 0 && (
          <div className="bg-white rounded-xl shadow-md p-10 text-center border border-gray-100 mt-2">
            <div className="bg-red-50 p-4 rounded-full inline-block mb-4">
              <AlertTriangle className="w-12 h-12 text-red-500 mx-auto" />
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">
              Couldn&apos;t load your projects
            </h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">{error}</p>
            <button
              onClick={() => loadProjects({ page: projectsPage })}
              className="inline-flex items-center px-6 py-3 gap-2 cursor-pointer text-base font-medium rounded-lg shadow-md text-white bg-[#0F172A] hover:shadow-lg transition-all duration-300"
            >
              <RefreshCw size={18} />
              Try Again
            </button>
          </div>
        )}

        {hasFailed && projects.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-4 p-4 rounded-lg border border-red-200 bg-red-50 text-sm text-red-700">
            <span className="flex items-center gap-2">
              <AlertTriangle size={18} />
              {error}
            </span>
            <button
              onClick={() => loadProjects({ page: projectsPage })}
              className="inline-flex items-center gap-2 px-3 py-1 rounded cursor-pointer bg-gray-800 text-white hover:bg-gray-900"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        )}

        {loadingMoreProjects && (
          <div className="flex justify-center items-center p-4">
            <Loader className="w-6 h-6 animate-spin text-gray-800" />
          </div>
        )}

        {/* Non-admins get the unpaginated /my/projects list, which returns no
            totalCount — there is nothing more to fetch, so no pager. */}
        {!hasFailed && !loadingMoreProjects && projectsTotalCount > 0 && (
          <LoadMorePagination
            loadMore={() => setProjectsPage(projectsPage + 1)}
            canLoadMore={projectsTotalCount > projects.length}
            showing={projects.length}
            totalCount={projectsTotalCount}
          />
        )}

        {isEmpty && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white rounded-xl shadow-md p-10 text-center border border-gray-100 mt-2"
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
              Create your first database project to start organizing your work
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
    </LayoutWrapper>
  );
}
