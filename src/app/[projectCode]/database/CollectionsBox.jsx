"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronRight, Database, Loader, Plus, Search, X } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { showDialog } from "@/components/CustomDialog";
import { getSocket } from "@/utils/socket";

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
    getCollections,
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

  const getLayoutClassnames = () => {
    let classnames = "bg-white rounded-lg shadow overflow-hidden flex flex-col h-[77vh] ";
    classnames += "w-full md:w-[calc((100vw-280px-7em)/2)] xl:w-[260px] "
    if(sidebarClosed) classnames += "md:w-[calc(50vw-62px-1em)]"
    return classnames;
  }

  return (
    <div>
      <div className={getLayoutClassnames()}>
        <div className="p-4 border-b border-gray-200 h-[120px]">
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
          />
          
        </div>
        <div className="flex-1 overflow-y-auto">
          {loadingCollections ? (
            <div className="flex justify-center items-center p-8">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          ) : !getCollections().length ? (
            <div className="flex justify-center items-center h-44 text-gray-400 text-sm">
              No collections found
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {getCollections().map((collection) => (
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
          {loadingMoreCollections && (
            <div className="flex justify-center items-center h-5">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          )}
          {!searchTerm.length &&
            !loadingMoreCollections &&
            totalCollectionsCount > collections.length && (
              <div className="p-3 text-center">
                <button
                  className="w-30s cursor-pointer px-3 py-1 rounded hover:bg-gray-900 bg-gray-800 text-white"
                  onClick={() => setCollectionsPage(collectionsPage + 1)}
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

const SearchBox = ({searchTerm, setSearchTerm, onClear}) => {
  return (
    <div className="relative">
      <button
        onClick={() => onClear()}
        className={`absolute left-3 top-2 overflow-hidden transition-all duration-150 ease-in-out cursor-pointer w-0 h-0 ${searchTerm ? "w-6 h-6 z-10": ""}`}
        >
        <X className="text-gray-700 w-6 h-6" />
      </button>
      <input
        type="text"
        placeholder="Search collections..."
        className={`w-full px-[16px] py-2 border border-gray-400 rounded-lg text-sm text-black transition-all duration-150 ease-in-out ${searchTerm ? "pl-[36px]" : ""}`}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      {searchTerm && (
        <button
          onClick={() => setSearchTerm(searchTerm)}
          >
          <Search className="absolute right-3 top-2.5 text-gray-800 w-5 h-5 cursor-pointer" />
        </button>
      )}
    </div>
  );
}
