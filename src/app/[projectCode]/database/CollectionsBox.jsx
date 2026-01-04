"use client";

import { useEffect, useRef } from "react";
import { ChevronRight, Database, Loader, Plus, Search } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { showDialog } from "@/components/CustomDialog";
import { getSocket } from "@/utils/socket";

import AddEditCollection from "./AddEditCollection";
import { useDatabaseContext } from "@/context/DatabaseContext";
import { toast } from "react-toastify";

function CollectionsBox() {
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

  //

  const handleData = async (data) => {
    console.log(data);
    
    if (data.add)
      setCollections((prev) =>
        Array.from(
          new Map(
            [...prev, ...data.add].map((doc) => [doc.name, { ...doc }])
          ).values()
        )
      );
    if (data.delete) {
      setCollections((prev) =>
        prev.filter((i) => !data.delete.some((d) => d.name === i.name))
      );
      setTotalCollectionsCount(totalCollectionsCount - data.delete.length);
      if (
        selectedCollectionRef.current &&
        data.delete.map((i) => selectedCollectionRef.current.name == i.name)
      ) {
        setSelectedCollection(null);
      }
    }
  };

  useEffect(() => {
    if (!activeProject?.code) return;
    const room = `update:${activeProject.code}/collections`;
    getSocket(activeProject.projectToken).on(room, handleData);
    getSocket(activeProject.projectToken).emit("watch-collections", {});
    return () => {
      getSocket(activeProject.projectToken).off(room, handleData);
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

  return (
    <div>
      <div className="md:w-65 bg-white rounded-lg shadow overflow-hidden flex flex-col">
        <div className="p-4 border-b border-gray-200">
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
          <div className="relative">
            <input
              type="text"
              placeholder="Search collections..."
              className="w-full px-4 py-2 border rounded-lg pr-10 text-sm text-black"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute right-3 top-2.5 text-gray-400 w-4 h-4" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto min-h-120 max-h-160">
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
                      ? "bg-blue-50 border-l-4 border-l-blue-400"
                      : ""
                  }`}
                  onClick={() => setSelectedCollection(collection)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800 text-md">
                        {collection.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {collection.documentsCount} documents
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
