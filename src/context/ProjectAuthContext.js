"use client";

import { getAuthAccounts } from "@/utils/api";
import React, { createContext, useContext, useState } from "react";

const ProjectAuthContext = createContext();

export const ProjectAuthContextProvider = ({ children }) => {
  // authentication
  const [accounts, setAccounts] = useState([]);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsTotalCount, setAccountsTotalCount] = useState(0);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [loadingMoreAccounts, setLoadingMoreAccounts] = useState(false);

  const loadAccounts = async ({ projectCode, page }) => {
    if (loadingAccounts) return;
    if (accounts.length == 0) setLoadingAccounts(true);
    else setLoadingMoreAccounts(true);

    const result = await getAuthAccounts({ projectCode, page });
    const body = await result.json();
    if (result.ok) {
      setAccounts((prev) =>
        Array.from(
          new Map(
            [...prev, ...body.accounts].map((doc) => [doc._id, doc])
          ).values()
        )
      );
      setAccountsTotalCount(body.totalCount);
    }
    setLoadingAccounts(false);
    setLoadingMoreAccounts(false);
  };

  const clearAccounts = () => {
    setAccounts([]);
    setAccountsTotalCount(0);
    setAccountsPage(1);
  };

  return (
    <ProjectAuthContext.Provider
      value={{
        // auth
        accounts,
        setAccounts,
        accountsPage,
        setAccountsPage,
        accountsTotalCount,
        setAccountsTotalCount,
        loadAccounts,
        loadingAccounts,
        loadingMoreAccounts,
        clearAccounts,
      }}
    >
      {children}
    </ProjectAuthContext.Provider>
  );
};

export const useProjectAuthContext = () => useContext(ProjectAuthContext);
