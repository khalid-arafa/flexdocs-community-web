"use client"

import React, { createContext, useContext, useState } from 'react';

const StorageContext = createContext();

export const StorageContextProvider = ({ children }) => {

  // uploads
  const [uploadFiles, setUploadFiles] = useState([]);
  const [showUploader, setShowUploader] = useState(false);
  const [bucketPathList, setBucketPathList] = useState([]);
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

    }}>
      {children}
    </StorageContext.Provider>
  );
};

export const useStorageContext = () => useContext(StorageContext);