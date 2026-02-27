"use client";

import { getAllProjects, getProjectByCode, getUserProjects } from "@/utils/api";
import Cookies from "js-cookie";
import React, { createContext, useContext, useState } from "react";

const UserDetailsContext = createContext();

export const ProjectsContextProvider = ({ children }) => {
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingMoreProjects, setLoadingMoreProjects] = useState(false);
  const [projects, setProjects] = useState([]);
  const [projectsPage, setProjectsPage] = useState(1);
  const [projectsTotalCount, setProjectsTotalCount] = useState(0);

  const [loadingActiveProject, setLoadingActiveProject] = useState(false);
  const [activeProject, setActiveProject] = useState(null);
  const [error, setError] = useState(null);

  const loadProjects = async ({ page = 1, query = {} }) => {
    if (loadingProjects === true) return;
    if (!projects.length) setLoadingProjects(true);
    else setLoadingMoreProjects(true);
    setError(null);

    try {
      let user = null;
      const userCookie = Cookies.get("user");
      if (userCookie) {
        try {
          user = JSON.parse(userCookie);
        } catch {
          user = null;
        }
      }
      const isAdmin =
        user &&
        user.roles &&
        ["admin", "superadmin"].some((role) => user.roles.includes(role));
      const result = isAdmin
        ? await getAllProjects({ page, query })
        : await getUserProjects();
      const body = await result.json();
      if (result.ok) {
        setProjects((prev) =>
          Array.from(
            new Map(
              [...prev, ...body.projects].map((doc) => [doc._id, { ...doc }])
            ).values()
          )
        );
        if (body.totalCount) setProjectsTotalCount(body.totalCount);
      } else {
        setError(body.message || "Failed to load projects");
      }
    } catch (err) {
      setError("Failed to load projects");
    } finally {
      setLoadingProjects(false);
      setLoadingMoreProjects(false);
    }
  };

  const clearProjects = () => {
    setLoadingProjects(false);
    setLoadingMoreProjects(false);
    setProjects([]);
    setProjectsPage(1);
    setProjectsTotalCount(0);
  };

  const loadActiveProject = async (code) => {
    if (loadingActiveProject === true) return;
    setLoadingActiveProject(true);
    setError(null);

    try {
      const result = await getProjectByCode({
        code,
        select: { name: 1, code: 1 },
      });
      const body = await result.json();
      if (result.ok) setActiveProject(body);
      else setError(body.message || "Failed to load project");
      setLoadingActiveProject(false);
      return result.ok;
    } catch (err) {
      setError("Failed to load project");
      setLoadingActiveProject(false);
      return false;
    }
  };

  return (
    <UserDetailsContext.Provider
      value={{
        loadingProjects,
        projects,
        loadProjects,
        projectsTotalCount,
        projectsPage,
        setProjectsPage,
        loadingMoreProjects,
        clearProjects,
        //
        setProjects,
        activeProject,
        setActiveProject,
        loadingActiveProject,
        loadActiveProject,
        error,
      }}
    >
      {children}
    </UserDetailsContext.Provider>
  );
};

export const useProjectsContext = () => useContext(UserDetailsContext);
