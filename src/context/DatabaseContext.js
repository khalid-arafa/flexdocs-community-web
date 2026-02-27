"use client";

import { getCollectionDocuments, getDatabaseCollections } from "@/utils/api";
import React, { createContext, useContext, useState } from "react";

const DatabaseContext = createContext();

export const DatabaseContextProvider = ({ children }) => {
  // database
  // collections
  const [collections, setCollections] = useState([]);
  const [collectionsPage, setCollectionsPage] = useState(1);
  const [totalCollectionsCount, setTotalCollectionsCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingCollections, setLoadingCollections] = useState(false);
  const [loadingMoreCollections, setLoadingMoreCollections] = useState(false);

  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionDocuments, setCollectionDocuments] = useState([]);
  const [documentsPage, setDocumentsPage] = useState(1);
  const [totalCollectionDocumentsCount, setTotalCollectionDocumentsCount] =
    useState(0);
  const [loadingCollectionDocuments, setLoadingCollectionDocuments] =
    useState(false);
  const [loadingMoreCollectionDocuments, setLoadingMoreCollectionDocuments] =
    useState(false);

  const [selectedDocument, setSelectedDocument] = useState(null);
  const [error, setError] = useState(null);

  const getCollections = () => {
    if (searchTerm)
      return collections.filter((i) => i.name.startsWith(searchTerm));
    return collections;
  };

  const loadCollections = async ({ projectCode, page }) => {
    if (loadingCollections || !projectCode) return;
    if (!collections.length) setLoadingCollections(true);
    else setLoadingMoreCollections(true);
    setError(null);

    try {
      const result = await getDatabaseCollections({
        projectCode,
        page,
      });
      const body = await result.json();
      if (result.ok) {
        setCollections((prev) =>
          Array.from(
            new Map(
              [...prev, ...body.collections].map((doc) => [doc.name, doc])
            ).values()
          )
        );
        setTotalCollectionsCount(body.totalCount);
      } else {
        setError(body.message || "Failed to load collections");
      }
    } catch (err) {
      setError("Failed to load collections");
    } finally {
      setLoadingCollections(false);
      setLoadingMoreCollections(false);
    }
  };

  const selectCollection = ({ projectCode }) => {
    setDocumentsPage(1);
    setCollectionDocuments([]);
    setLoadingCollectionDocuments(false);
    setLoadingMoreCollectionDocuments(false);
    setTotalCollectionDocumentsCount(0);
    setSelectedDocument(null);
    loadCollectionDocuments({ projectCode, page: 1 });
  };

  const loadCollectionDocuments = async ({ projectCode, page }) => {
    if (!projectCode) return;
    if (loadingCollectionDocuments === true || !selectedCollection) return;
    if (!collectionDocuments.length) setLoadingCollectionDocuments(true);
    else setLoadingMoreCollectionDocuments(true);
    setError(null);

    try {
      const result = await getCollectionDocuments({
        projectCode,
        page,
        collectionName: selectedCollection.name,
      });
      const body = await result.json();
      if (result.ok) {
        setCollectionDocuments((prev) =>
          Array.from(
            new Map([...prev, ...body.docs].map((doc) => [doc._id, doc])).values()
          )
        );
        setTotalCollectionDocumentsCount(body.totalCount);
      } else {
        setError(body.message || "Failed to load documents");
      }
    } catch (err) {
      setError("Failed to load documents");
    } finally {
      setLoadingCollectionDocuments(false);
      setLoadingMoreCollectionDocuments(false);
    }
  };

  return (
    <DatabaseContext.Provider
      value={{
        collections,
        getCollections,
        setCollections,
        totalCollectionsCount,
        setTotalCollectionsCount,
        searchTerm,
        setSearchTerm,
        loadingCollections,
        loadingMoreCollections,
        loadCollections,
        selectedCollection,
        setSelectedCollection,
        loadCollectionDocuments,
        collectionDocuments,
        totalCollectionDocumentsCount,
        selectedDocument,
        setSelectedDocument,
        setCollectionDocuments,
        setTotalCollectionDocumentsCount,

        selectCollection,
        documentsPage,
        setDocumentsPage,
        loadingMoreCollectionDocuments,
        collectionsPage,
        setCollectionsPage,
        error,
      }}
    >
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => useContext(DatabaseContext);
