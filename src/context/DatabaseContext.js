"use client"

import { getCollectionDocuments, getDatabaseCollections } from '@/utils/api';
import React, { createContext, useContext, useState } from 'react';

const DatabaseContext = createContext();

export const DatabaseContextProvider = ({ children }) => {

  // dataabse
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
  const [totalCollectionDoumentsCount, setTotalCollectionDoumentsCount] = useState(0);
  const [loadingCollectionDocuments, setLoadingCollectionDocuments] = useState(false);
  const [loadingMoreCollectionDocuments, setLoadingMoreCollectionDocuments] = useState(false);

  const [selectedDocument, setSelectedDocument] = useState(null);


  const getCollections = () => {
    if (searchTerm) return collections.filter(i => i.name.startsWith(searchTerm));
    return collections;
  }

  const loadCollections = async ({ projectCode, page }) => {
    if (loadingCollections || !projectCode) return;
    if (!collections.length) setLoadingCollections(true);
    else setLoadingMoreCollections(true);

    const result = await getDatabaseCollections({
      projectCode,
      page
    });
    const body = await result.json();
    if (result.ok) {
      setCollections((prev) => Array.from(
        new Map(
          [...prev, ...body.collections].map((doc) => [doc.name, doc])
        ).values()
      ));
      setTotalCollectionsCount(body.totalCount);
    }
    setLoadingCollections(false);
    setLoadingMoreCollections(false);
  }

  const selectCollection = ({ projectCode }) => {
    setLoadingCollectionDocuments(false);
    setDocumentsPage(1);
    setCollectionDocuments([]);
    setLoadingMoreCollectionDocuments(false);
    setTotalCollectionDoumentsCount(0);
    setSelectedDocument(null);
    loadCollectionDocuments({ projectCode, page: 1 });
  }


  const loadCollectionDocuments = async ({ projectCode, page }) => {
    if (!projectCode) return;
    if (loadingCollectionDocuments || !selectedCollection) return;
    if (!collectionDocuments.length) setLoadingCollectionDocuments(true);
    else setLoadingMoreCollectionDocuments(true);

    const result = await getCollectionDocuments({
      projectCode,
      page,
      collectionName: selectedCollection.name,
    });
    const body = await result.json();
    if (result.ok) {
      setCollectionDocuments((prev) => Array.from(
        new Map(
          [...prev, ...body.docs].map((doc) => [doc._id, doc])
        ).values()
      ));
      setTotalCollectionDoumentsCount(body.totalCount);
    }
    setLoadingCollectionDocuments(false);
    setLoadingMoreCollectionDocuments(false);
  }

  return (
    <DatabaseContext.Provider value={{
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
      totalCollectionDoumentsCount,
      selectedDocument,
      setSelectedDocument,
      setCollectionDocuments,
      setTotalCollectionDoumentsCount,

      selectCollection,
      documentsPage,
      setDocumentsPage,
      loadingMoreCollectionDocuments,
      collectionsPage,
      setCollectionsPage,
    }}>
      {children}
    </DatabaseContext.Provider>
  );
};

export const useDatabaseContext = () => useContext(DatabaseContext);