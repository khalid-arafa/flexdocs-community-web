"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
  const [currentPageTab, setCurrentPageTab] = useState("Loading ...");
  const [sidebarClosed, setSidebarClosed] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("sidebarClosed");
      if (saved !== null) {
        setSidebarClosed(JSON.parse(saved));
      } else {
        setSidebarClosed(window.innerWidth < 1024);
      }
    } catch {
      setSidebarClosed(window.innerWidth < 1024);
    }
  }, []);

  const toggleSidebar = () => {
    setSidebarClosed((prev) => {
      try {
        localStorage.setItem("sidebarClosed", JSON.stringify(!prev));
      } catch { /* localStorage unavailable */ }
      return !prev;
    });
  };

  const setProjectPageTab = (tab) => {
    const url = new URL(window.location);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url);
    setCurrentPageTab(tab);
  };

  return (
    <LayoutContext.Provider
      value={{
        sidebarClosed,
        toggleSidebar,
        currentPageTab,
        setProjectPageTab,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => useContext(LayoutContext);
