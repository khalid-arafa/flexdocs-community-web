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

  //
  const loadProjects = async ({ page = 1, query = {} }) => {
    if (loadingProjects === true) return;
    if (!projects.length) setLoadingProjects(true);
    else setLoadingMoreProjects(true);
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
    if (!result.ok) console.log(body);
    else {
      setProjects((prev) =>
        Array.from(
          new Map(
            [...prev, ...body.projects].map((doc) => [doc._id, { ...doc }])
          ).values()
        )
      );
      if (body.totalCount) setProjectsTotalCount(body.totalCount);
    }
    setLoadingProjects(false);
    setLoadingMoreProjects(false);
  };

  const clearProjects = () => {
    setLoadingProjects(false);
    setLoadingMoreProjects(false);
    setProjects([]);
    setProjectsPage(1);
    setProjectsTotalCount(0);
  };

  // set Active project
  const loadActiveProject = async (code) => {
    if (loadingActiveProject === true) return;
    setLoadingActiveProject(true);
    const result = await getProjectByCode({
      code,
      select: { name: 1, code: 1 },
    });
    const body = await result.json();
    if (result.ok) setActiveProject(body);
    else console.log(body);
    setLoadingActiveProject(false);
    return result.ok;
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
      }}
    >
      {children}
    </UserDetailsContext.Provider>
  );
};

export const useProjectsContext = () => useContext(UserDetailsContext);
