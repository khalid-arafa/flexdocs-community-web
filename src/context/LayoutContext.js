"use client"

import React, { createContext, useContext, useState } from 'react';

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
  const [sidebarOpen, setSidbarOpen] = useState(false);
  const [currentPageTab, setCurrentPageTab] = useState("Loading ...");

  const toggleSidebar = () => {
    setSidbarOpen((prev) => !prev);
  }

  const setProjectPageTab = (tab) => {
    const url = new URL(window.location);
    url.searchParams.set('tab', tab);
    window.history.pushState({}, '', url);
    setCurrentPageTab(tab);
  }

  return (
    <LayoutContext.Provider value={{
      sidebarOpen,
      toggleSidebar,
      currentPageTab,
      setProjectPageTab
    }}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayoutContext = () => useContext(LayoutContext);