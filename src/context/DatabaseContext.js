"use client";

import { getCollectionDocuments, getDatabaseCollections } from "@/utils/api";
import React, { createContext, useContext, useRef, useState } from "react";

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

  // Concurrency guards. State flags (loadingCollections etc.) can't gate
  // re-entrancy because setState is async: a second Load-More click, or a
  // collection switch, fires before the flag it should have seen has committed.
  //
  // - `inFlight` sets dedupe an identical request already running (rapid clicks
  //   on the same page), keyed by request identity.
  // - `reqId` counters mark the most-recent request. A response whose id is no
  //   longer current has been superseded (the user switched collection/project)
  //   and is dropped, so a slow earlier response can't overwrite fresher data
  //   or clear the spinner the newer request is still showing.
  const colsReqIdRef = useRef(0);
  const colsInFlightRef = useRef(new Set());
  const docsReqIdRef = useRef(0);
  const docsInFlightRef = useRef(new Set());

  const getCollections = () => {
    if (searchTerm)
      return collections.filter((i) => i.name.startsWith(searchTerm));
    return collections;
  };

  const loadCollections = async ({ projectCode, page }) => {
    if (!projectCode) return;
    const requestKey = `${projectCode}#${page}`;
    if (colsInFlightRef.current.has(requestKey)) return;
    colsInFlightRef.current.add(requestKey);
    const reqId = ++colsReqIdRef.current;

    const isFirstPage = page === 1;
    if (isFirstPage) setLoadingCollections(true);
    else setLoadingMoreCollections(true);
    setError(null);

    try {
      const result = await getDatabaseCollections({
        projectCode,
        page,
      });
      const body = await result.json();
      if (reqId !== colsReqIdRef.current) return; // superseded
      if (result.ok) {
        // Page 1 is a fresh load (e.g. after switching projects) so it must
        // replace the existing list; later pages append for "Load More".
        setCollections((prev) =>
          Array.from(
            new Map(
              [...(isFirstPage ? [] : prev), ...body.collections].map((doc) => [
                doc.name,
                doc,
              ])
            ).values()
          )
        );
        setTotalCollectionsCount(body.totalCount);
      } else {
        setError(body.message || "Failed to load collections");
      }
    } catch (err) {
      if (reqId === colsReqIdRef.current) setError("Failed to load collections");
    } finally {
      colsInFlightRef.current.delete(requestKey);
      if (reqId === colsReqIdRef.current) {
        setLoadingCollections(false);
        setLoadingMoreCollections(false);
      }
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
    if (!projectCode || !selectedCollection) return;
    const collectionName = selectedCollection.name;
    const requestKey = `${collectionName}#${page}`;
    if (docsInFlightRef.current.has(requestKey)) return;
    docsInFlightRef.current.add(requestKey);
    const reqId = ++docsReqIdRef.current;

    // Decide the spinner from the PAGE, not from collectionDocuments.length.
    // selectCollection resets the list then calls this synchronously, so the
    // length still read the PREVIOUS collection's docs — picking the "load
    // more" spinner and leaving the old rows on screen during the switch.
    const isFirstPage = page === 1;
    if (isFirstPage) setLoadingCollectionDocuments(true);
    else setLoadingMoreCollectionDocuments(true);
    setError(null);

    try {
      const result = await getCollectionDocuments({
        projectCode,
        page,
        collectionName,
      });
      const body = await result.json();
      if (reqId !== docsReqIdRef.current) return; // superseded by a newer load
      if (result.ok) {
        setCollectionDocuments((prev) =>
          Array.from(
            new Map(
              [...(isFirstPage ? [] : prev), ...body.docs].map((doc) => [
                doc._id,
                doc,
              ])
            ).values()
          )
        );
        setTotalCollectionDocumentsCount(body.totalCount);
      } else {
        setError(body.message || "Failed to load documents");
      }
    } catch (err) {
      if (reqId === docsReqIdRef.current) setError("Failed to load documents");
    } finally {
      docsInFlightRef.current.delete(requestKey);
      if (reqId === docsReqIdRef.current) {
        setLoadingCollectionDocuments(false);
        setLoadingMoreCollectionDocuments(false);
      }
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
