"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  AlertTriangle,
  ChevronRight,
  Database,
  Loader,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { showDialog } from "@/components/CustomDialog";
import { getSocket } from "@/utils/socket";
import { getDatabaseCollections } from "@/utils/api";

import AddEditCollection from "./AddEditCollection";
import { useDatabaseContext } from "@/context/DatabaseContext";
import { toast } from "react-toastify";
import { useLayoutContext } from "@/context/LayoutContext";
import Tooltip from "@/components/Tooltip";
import { mergeAdd, mergeUpdate, mergeDelete } from "@/utils/realtimeMerge";

const compactNumberFormatter = new Intl.NumberFormat("en", {
  notation: "compact",
  compactDisplay: "short",
  maximumFractionDigits: 1,
});

function CollectionsBox() {
  const { sidebarClosed } = useLayoutContext();
  const { activeProject } = useProjectsContext();

  const {
    collections,
    setCollections,
    totalCollectionsCount,
    setTotalCollectionsCount,
    searchTerm,
    setSearchTerm,
    loadingCollections,
    loadCollections,
    selectedCollection,
    setSelectedCollection,
    selectCollection,
    documentsPage,
    loadCollectionDocuments,
    loadingMoreCollections,
    collectionsPage,
    setCollectionsPage,
    error,
  } = useDatabaseContext();

  const selectedCollectionRef = useRef(selectedCollection);
  const [flashingItems, setFlashingItems] = useState(new Set());
  const flashTimeouts = useRef({});

  const flashItems = useCallback((names) => {
    setFlashingItems((prev) => new Set([...prev, ...names]));
    names.forEach((name) => {
      if (flashTimeouts.current[name]) clearTimeout(flashTimeouts.current[name]);
      flashTimeouts.current[name] = setTimeout(() => {
        setFlashingItems((prev) => {
          const next = new Set(prev);
          next.delete(name);
          return next;
        });
        delete flashTimeouts.current[name];
      }, 1500);
    });
  }, []);

  //

  const handleData = async (data) => {
    if (data.add) {
      setCollections((prev) => mergeAdd(prev, data.add, "name"));
      flashItems(data.add.map((d) => d.name));
    }
    if (data.update) {
      setCollections((prev) => mergeUpdate(prev, data.update, "name"));
      flashItems(data.update.map((d) => d.name));
    }
    if (data.delete) {
      setCollections((prev) => mergeDelete(prev, data.delete, "name"));
      // Functional update: this handler is bound once per effect, so reading
      // totalCollectionsCount from the closure went stale after any earlier
      // event and the count drifted.
      setTotalCollectionsCount((prev) => prev - data.delete.length);
      if (
        selectedCollectionRef.current &&
        data.delete.some((i) => selectedCollectionRef.current.name === i.name)
      ) {
        setSelectedCollection(null);
      }
    }
  };

  useEffect(() => {
    if (!activeProject?.code) return;
    // Guard against a null socket (project without a token) — see DocumentsBox.
    const socket = getSocket(activeProject.projectToken);
    if (!socket) return;
    const room = `update:${activeProject.code}/collections`;
    socket.on(room, handleData);
    socket.emit("watch-collections", {});
    return () => {
      socket.off(room, handleData);
      socket.emit("unwatch-collections", {});
    };
  }, [activeProject]);

  //

  useEffect(() => {
    if (!activeProject) return;
    selectCollection({ projectCode: activeProject.code });
    selectedCollectionRef.current = selectedCollection;
  }, [selectedCollection]);

  useEffect(() => {
    // for loading more documents
    if (documentsPage > 1)
      loadCollectionDocuments({
        page: documentsPage,
        projectCode: activeProject.code,
      });
  }, [documentsPage]);

  useEffect(() => {
    // for loading more collections
    if (collectionsPage > 1)
      loadCollections({
        page: collectionsPage,
        projectCode: activeProject.code,
      });
  }, [collectionsPage]);

  // Collection search runs on the SERVER.
  //
  // The magnifier button used to be `setSearchTerm(searchTerm)` — a literal
  // no-op — and the only filtering was a client-side `startsWith` over the
  // pages already fetched, so on a project with more than one page of
  // collections nothing past page 1 was findable and a mid-name match never
  // matched at all. POST /db/collections forwards `where` straight to MongoDB's
  // listCollections and returns a totalCount computed from the same filter, so
  // a name regex searches every collection and stays pageable. api.js escapes
  // and length-bounds the term (see buildCollectionSearchFilter).
  //
  // Search results are a separate list from `collections`, which means live
  // socket updates land on the unfiltered list only; re-running the search
  // picks them up.
  const [searchResults, setSearchResults] = useState([]);
  const [searchTotalCount, setSearchTotalCount] = useState(0);
  const [searchPage, setSearchPage] = useState(1);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [loadingMoreSearch, setLoadingMoreSearch] = useState(false);
  const [searchError, setSearchError] = useState(null);
  const searchReqIdRef = useRef(0);
  const searchInFlightRef = useRef(new Set());
  const searchDebounceRef = useRef(null);

  const trimmedSearch = searchTerm.trim();
  const isSearching = trimmedSearch.length > 0;

  const runSearch = useCallback(
    async (term, page) => {
      if (!activeProject?.code || !term) return;
      const requestKey = `${term}#${page}`;
      if (searchInFlightRef.current.has(requestKey)) return;
      searchInFlightRef.current.add(requestKey);
      const reqId = ++searchReqIdRef.current;

      const isFirstPage = page === 1;
      if (isFirstPage) setLoadingSearch(true);
      else setLoadingMoreSearch(true);
      setSearchError(null);

      try {
        const result = await getDatabaseCollections({
          projectCode: activeProject.code,
          search: term,
          page,
        });
        const body = await result.json();
        // A stale response (the term changed while this was in flight) must not
        // overwrite fresher results or clear the newer request's spinner.
        if (reqId !== searchReqIdRef.current) return;
        if (result.ok) {
          setSearchResults((prev) =>
            isFirstPage ? body.collections : [...prev, ...body.collections]
          );
          setSearchTotalCount(body.totalCount);
          setSearchPage(page);
        } else {
          setSearchError(body.message || "Failed to search collections");
        }
      } catch {
        if (reqId === searchReqIdRef.current)
          setSearchError("Failed to search collections");
      } finally {
        searchInFlightRef.current.delete(requestKey);
        if (reqId === searchReqIdRef.current) {
          setLoadingSearch(false);
          setLoadingMoreSearch(false);
        }
      }
    },
    [activeProject]
  );

  // Debounced so typing does not fire a request per keystroke. The button and
  // Enter run the same search immediately; the in-flight key keeps the two from
  // turning into a duplicate call.
  useEffect(() => {
    if (!isSearching) {
      searchReqIdRef.current++; // discard anything still in flight
      // Every reset below is a no-op once the state is already clear (note the
      // functional form for the array — `setSearchResults([])` would hand React
      // a fresh array every time). React then bails out of the re-render, so
      // this effect cannot re-trigger itself when `runSearch`'s identity
      // changes on a parent re-render.
      setSearchResults((prev) => (prev.length ? [] : prev));
      setSearchTotalCount(0);
      setSearchPage(1);
      setSearchError(null);
      setLoadingSearch(false);
      setLoadingMoreSearch(false);
      return;
    }
    searchDebounceRef.current = setTimeout(
      () => runSearch(trimmedSearch, 1),
      300
    );
    return () => clearTimeout(searchDebounceRef.current);
  }, [trimmedSearch, isSearching, runSearch]);

  // Enter / the magnifier: search now instead of waiting out the debounce, and
  // cancel the pending timer so the two don't both fire the same request.
  const submitSearch = () => {
    clearTimeout(searchDebounceRef.current);
    runSearch(trimmedSearch, 1);
  };

  // One set of props for the panel, whether it is showing the full list or a
  // search result set.
  const displayedCollections = isSearching ? searchResults : collections;
  const listLoading = isSearching ? loadingSearch : loadingCollections;
  const listLoadingMore = isSearching
    ? loadingMoreSearch
    : loadingMoreCollections;
  const listTotalCount = isSearching ? searchTotalCount : totalCollectionsCount;
  // DatabaseContext keeps ONE `error` for collections and documents alike, so
  // this is scoped to the empty list: a documents failure implies a selected
  // collection, which implies a non-empty list, and cannot show up here.
  const listError = isSearching ? searchError : error;

  const retryLoad = () => {
    if (isSearching) return runSearch(trimmedSearch, searchPage);
    if (activeProject?.code)
      loadCollections({ page: collectionsPage, projectCode: activeProject.code });
  };

  const loadMore = () => {
    if (isSearching) return runSearch(trimmedSearch, searchPage + 1);
    setCollectionsPage(collectionsPage + 1);
  };

  const getLayoutClassnames = () => {
    let classnames = "bg-white rounded-lg shadow overflow-hidden flex flex-col h-[77vh] ";
    classnames += "w-full md:w-[calc((100vw-280px-7em)/2)] xl:w-65 "
    if(sidebarClosed) classnames += "md:w-[calc(50vw-62px-1em)]"
    return classnames;
  }

  return (
    <div>
      <div className={getLayoutClassnames()}>
        <div className="p-4 border-b border-gray-200 h-30">
          <h2 className="text-lg font-semibold mb-3 flex items-center justify-between text-black">
            <span className="flex items-center">
              <Database className="w-5 h-5 mr-2 text-gray-800" />
              Collections
            </span>
            <button
              className="p-2 hover:bg-gray-200 rounded cursor-pointer"
              onClick={(e) => {
                showDialog({
                  content: AddEditCollection,
                  params: { 
                    activeProject, 
                    toast,
                    onSuccess: (newCol => handleData({add: [newCol]}))  
                  },
                });
              }}
            >
              <Plus className="w-4 h-4 text-gray-800" />
            </button>
          </h2>

          <SearchBox
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            onClear={() => setSearchTerm("")}
            onSubmit={submitSearch}
          />

        </div>
        <div className="flex-1 overflow-y-auto">
          {listLoading ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          ) : listError && !displayedCollections.length ? (
            <div className="flex flex-col justify-center items-center h-44 px-4 text-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <p className="text-sm text-red-600">{listError}</p>
              <button
                onClick={retryLoad}
                className="inline-flex items-center gap-2 cursor-pointer px-3 py-1 rounded bg-gray-800 text-white hover:bg-gray-900 text-sm"
              >
                <RefreshCw className="w-4 h-4" />
                Try Again
              </button>
            </div>
          ) : !displayedCollections.length ? (
            <div className="flex justify-center items-center h-44 px-4 text-center text-gray-400 text-sm">
              {isSearching
                ? `No collections match "${trimmedSearch}"`
                : "No collections found"}
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {displayedCollections.map((collection) => (
                <li
                  key={collection.name}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    selectedCollection?.name === collection.name
                      ? "bg-brand/10 border-l-4 border-l-brand"
                      : ""
                  } ${flashingItems.has(collection.name) ? "flash-green" : ""}`}
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800 text-md">
                        {collection.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        <Tooltip
                          text={`${(collection.documentsCount || 0).toLocaleString()} documents`}
                        >
                          <span>
                            {compactNumberFormatter.format(
                              collection.documentsCount || 0
                            )}{" "}
                            documents
                          </span>
                        </Tooltip>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {listLoadingMore && (
            <div className="flex justify-center items-center h-5">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          )}
          {/* Search results page too, now that the filter is applied server-side
              and totalCount reflects it — the old `!searchTerm.length` gate hid
              the button because a client-side filter had nothing to page. */}
          {!listLoading &&
            !listLoadingMore &&
            listTotalCount > displayedCollections.length && (
              <div className="p-3 text-center">
                <button
                  className="cursor-pointer px-3 py-1 rounded hover:bg-gray-900 bg-gray-800 text-white"
                  onClick={loadMore}
                >
                  Load More
                </button>
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

export default CollectionsBox;

const SearchBox = ({ searchTerm, setSearchTerm, onClear, onSubmit }) => {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onClear()}
        className={`absolute left-3 top-2 overflow-hidden transition-all duration-150 ease-in-out cursor-pointer w-0 h-0 ${searchTerm ? "w-6 h-6 z-10": ""}`}
        >
        <X className="text-gray-700 w-6 h-6" />
      </button>
      <input
        type="text"
        placeholder="Search collections..."
        className={`w-full px-4 py-2 border border-gray-400 rounded-lg text-sm text-black transition-all duration-150 ease-in-out ${searchTerm ? "pl-9" : ""}`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSubmit();
        }}
      />
      {searchTerm && (
        // Was `setSearchTerm(searchTerm)` — setting state to the value it
        // already holds, so the button did nothing at all.
        <button type="button" aria-label="Search collections" onClick={() => onSubmit()}>
          <Search className="absolute right-3 top-2.5 text-gray-800 w-5 h-5 cursor-pointer" />
        </button>
      )}
    </div>
  );
}
