"use client";

import { ChevronRight, Loader, MoreVerticalIcon, Plus, X } from "lucide-react";
import React, { useEffect, useRef } from "react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { formatDate } from "@/utils/datetime";
import DropdownButton from "@/components/DropdownButton";
import { useDialogs } from "@/context/DialogsContext";
import { deleteCollection } from "@/utils/api";
import { toast } from "react-toastify";
import { getSocket } from "@/utils/socket";
import { useDatabaseContext } from "@/context/DatabaseContext";
import { useLayoutContext } from "@/context/LayoutContext";

function DocumentsBox() {
  const { sidebarClosed } = useLayoutContext();
  const { activeProject } = useProjectsContext();

  const {
    selectedCollection,
    selectedDocument,
    setSelectedDocument,
    loadingCollectionDocuments,
    collectionDocuments,
    totalCollectionDoumentsCount,
    loadingMoreCollectionDocuments,
    documentsPage,
    setDocumentsPage,
    setCollectionDocuments,
    setTotalCollectionDoumentsCount,
    setCollections,
    setTotalCollectionsCount,
    setSelectedCollection,
  } = useDatabaseContext();

  const { confirm } = useDialogs();

  const selectedDocumentRef = useRef(selectedDocument);

  const loadMore = () => {
    setDocumentsPage(documentsPage + 1);
  };

  const getMenuChoices = () => {
    let result = [];
    if (selectedCollection) {
      result = [
        {
          label: "Add Document",
          icon: <Plus size={18} />,
          onClick: async () => {
            setSelectedDocument({});
          },
        },
        {
          label: "Delete Collection",
          icon: <X size={18} />,
          onClick: async () => {
            const confirmed = await confirm({
              msg: "Are you sure, you want to delete this?",
            });
            if (!confirmed) return;
            try {
              const result = await deleteCollection({
                projectCode: activeProject.code,
                collectionName: selectedCollection.name,
              });
              const body = await result.json();
              if (result.ok) {
                toast("Collection was deleted successfully!");
                setCollections(prev => prev.filter(i => i.name != selectedCollection.name))
                setCollectionDocuments([]);
                setSelectedCollection(null);
                setTotalCollectionsCount(prev => prev - 1);
                setTotalCollectionDoumentsCount(0);
                setSelectedDocument(null);
                return;
              }
              toast(body.message);
            } catch (error) {
              console.log(error);
            }
          },
        },
      ];
    }

    return result;
  };

  const handleData = async (data) => {
    if (data.add) {
      // add the documents
      setCollectionDocuments((prev) =>
        Array.from(
          new Map(
            [...prev, ...data.add].map((doc) => [doc._id, { ...doc }])
          ).values()
        )
      );
      // change documents total count
      setTotalCollectionDoumentsCount(
        totalCollectionDoumentsCount + data.add.length
      );

      // change documents count in collections list
      setCollections((prev) =>
        prev.map((col) =>
          col.name === selectedCollection.name
            ? {
                ...col,
                documentsCount: (col.documentsCount || 0) + data.add.length,
              }
            : col
        )
      );

      // update the selected document if it's selected
      if (
        selectedDocumentRef.current &&
        selectedDocumentRef.current?._id &&
        data.add.map((i) => i._id).includes(selectedDocumentRef.current._id)
      ) {
        setSelectedDocument(
          data.add.find((i) => i._id == selectedDocumentRef.current._id)
        );
      }
    }
    if (data.update) {
      setCollectionDocuments((prev) =>
        Array.from(
          new Map(
            prev
              .map((doc) => {
                const updated = data.update.find((u) => u._id === doc._id);
                return updated ? { ...doc, ...updated } : doc;
              })
              .map((doc) => [doc._id, doc])
          ).values()
        )
      );
      // update the selected document if it's selected
      if (
        selectedDocumentRef.current &&
        selectedDocumentRef.current?._id &&
        data.update.map((i) => i._id).includes(selectedDocumentRef.current._id)
      ) {
        setSelectedDocument(
          data.update.find((i) => i._id == selectedDocumentRef.current._id)
        );
      }
    }
    if (data.delete) {
      setCollectionDocuments((prev) =>
        prev.filter((i) => !data.delete.some((d) => d._id === i._id))
      );
      setTotalCollectionDoumentsCount(totalCollectionDoumentsCount - 1);
      setCollections((prev) =>
        prev.map((col) =>
          col.name === selectedCollection.name
            ? {
                ...col,
                documentsCount: (col.documentsCount || 0) - data.delete.length,
              }
            : col
        )
      );
    }
  };

  useEffect(() => {
    if (!activeProject?.code || !selectedCollection?.name) return;
    const room = `update:${activeProject.code}/${selectedCollection.name}`;
    getSocket(activeProject.projectToken).on(room, handleData);
    getSocket(activeProject.projectToken).emit("watch-col-updates", {
      col: selectedCollection.name,
    });
    return () => {
      getSocket(activeProject.projectToken).off(room, handleData);
    };
  }, [activeProject, selectedCollection]);

  useEffect(() => {
    selectedDocumentRef.current = selectedDocument;
  }, [selectedDocument]);

  const getLayoutClassnames = () => {
    let classnames = "bg-white rounded-lg shadow  flex flex-col h-[77vh] ";
    classnames += "w-full md:w-[calc((100vw-280px-7em)/2)] xl:w-[280px] "
    if(sidebarClosed) classnames += "md:w-[calc(50vw-62px-1em)]"
    return classnames;
  }

  return (
    <div>
      <div className={getLayoutClassnames()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between h-[120px]">
          <div>
            <h2 className="text-lg font-semibold mb-1 text-black">
              {selectedCollection ? selectedCollection.name : "Documents"}
            </h2>
            {!selectedCollection && (
              <p className="text-xs text-gray-400">
                Select a Collection to view ducuments
              </p>
            )}
            {selectedCollection && (
              <p className="text-xs text-gray-400">
                Select a document to view details
              </p>
            )}
          </div>
          <DropdownButton
            button={
              <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                <MoreVerticalIcon size={18} color="black" />
              </div>
            }
            choices={getMenuChoices()}
          />
        </div>
        <div className="flex-1 overflow-y-auto min-h-132 max-h-160">
          {!selectedCollection ? (
            <div className="flex justify-center items-center h-64 text-gray-400 text-sm">
              <p>Select a collection first</p>
            </div>
          ) : loadingCollectionDocuments === true ? (
            <div className="flex justify-center items-center h-full p-8">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          ) : collectionDocuments.length === 0 ? (
            <div className="flex justify-center items-center h-64 text-gray-400 text-sm">
              No documents found
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {collectionDocuments.map((doc) => (
                <li
                  key={doc._id}
                  className={`px-4 py-3 cursor-pointer hover:bg-gray-50 ${
                    selectedDocument?._id === doc._id
                      ? "bg-blue-50 border-l-4 border-l-blue-400"
                      : ""
                  }`}
                  onClick={() => setSelectedDocument(doc)}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-medium text-gray-800 text-sm truncate max-w-full">
                        {doc._id}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(doc.createdAt)}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </li>
              ))}
            </ul>
          )}
          {loadingMoreCollectionDocuments === true && (
            <div className="flex justify-center items-center h-5">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          )}
          {loadingMoreCollectionDocuments === false &&
            selectedCollection &&
            totalCollectionDoumentsCount > collectionDocuments.length && (
              <div className="p-3 text-center">
                <button
                  className="w-30s cursor-pointer px-3 py-1 rounded hover:bg-gray-900 bg-gray-800 text-white"
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



export default DocumentsBox;
