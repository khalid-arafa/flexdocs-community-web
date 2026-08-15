"use client"

import { useParams } from "next/navigation";
import React, { createContext, useCallback, useContext, useState } from 'react';

const StorageContext = createContext();

// Stable identity for "no path". `bucketPathList` is a useEffect dependency in
// StorageTabContent, so handing out a fresh [] on every render would retrigger
// that effect endlessly.
const EMPTY_PATH_LIST = [];

// The route segment is the source of truth for "which project's screen is on
// screen". `activeProject` is NOT usable here: the project layout only loads it
// when it is still null, so it can lag behind — or never follow — a switch from
// one project to another, which is exactly the transition we must not miss.
const readProjectCode = (params) => {
  const raw = params?.projectCode;
  if (Array.isArray(raw)) return raw[0] ?? null;
  return raw ?? null;
};

export const StorageContextProvider = ({ children }) => {

  // uploads
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showUploader, setShowUploader] = useState(false);

  // This provider is mounted at the ROOT of the tree, so it outlives every
  // project switch. The browsing path is therefore stored TOGETHER with the
  // project it belongs to and read back only when the two agree, so a stale
  // path is unobservable — not even for the single render that an effect-based
  // reset would leave open (during which the storage screen used to fetch the
  // PREVIOUS project's bucket id under the NEW project's code).
  const params = useParams();
  const projectCode = readProjectCode(params);

  const [pathState, setPathState] = useState({
    projectCode: null,
    list: EMPTY_PATH_LIST,
  });

  const bucketPathList =
    pathState.projectCode === projectCode ? pathState.list : EMPTY_PATH_LIST;

  // Accepts a value or an updater, like the raw setState it replaces. The
  // updater is always fed the path of the CURRENT project (empty after a
  // switch), never the leftovers of the previous one.
  const setBucketPathList = useCallback(
    (update) => {
      setPathState((prev) => {
        const base =
          prev.projectCode === projectCode ? prev.list : EMPTY_PATH_LIST;
        const list = typeof update === "function" ? update(base) : update;
        if (prev.projectCode === projectCode && list === prev.list) return prev;
        return { projectCode, list };
      });
    },
    [projectCode]
  );

  const getCurrentBucket = () => {
    const activeBucket = bucketPathList.length
      ? bucketPathList[bucketPathList.length - 1]
      : null;
    return activeBucket;
  }

  return (
    <StorageContext.Provider value={{
      uploadFiles,
      setUploadFiles,
      showUploader,
      setShowUploader,
      bucketPathList,
      setBucketPathList,
      getCurrentBucket,
      // The project this storage state belongs to, so consumers can tell a
      // fresh screen from a stale one.
      storageProjectCode: projectCode,

    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorageContext = () => useContext(StorageContext);
