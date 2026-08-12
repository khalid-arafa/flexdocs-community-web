"use client";

import JsonEditor from "@/components/JsonEditor";
import { useProjectsContext } from "@/context/ProjectsContext";
import useCooldown from "@/hooks/useCooldown";
import { createDocument, deleteDocument, saveDocument } from "@/utils/api";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { Loader, MoreVerticalIcon, X } from "lucide-react";
import DropdownButton from "@/components/DropdownButton";
import { useDialogs } from "@/context/DialogsContext";
import { useDatabaseContext } from "@/context/DatabaseContext";
import { useLayoutContext } from "@/context/LayoutContext";

function DocumentBox() {
  const { sidebarClosed } = useLayoutContext();
  const { activeProject } = useProjectsContext();

  const { selectedDocument, selectedCollection, setSelectedDocument } =
    useDatabaseContext();

  const { confirm } = useDialogs();

  const [isLoading, setIsLoading] = useState(false);
  const [_, trigger] = useCooldown(3000);

  useEffect(() => {
    const handleDocument = async () => {
      setIsLoading(true);
      await new Promise((res) => setTimeout(() => res(), 150));
      const data = { ...selectedDocument };
      delete data._id;
      setIsLoading(false);
    };
    handleDocument();
  }, [selectedDocument]);

  const onSave = async (data) => {
    if (!activeProject || !selectedCollection) return;
    if (!trigger()) return;

    if (typeof selectedDocument._id == "undefined") {
      const result = await createDocument({
        projectCode: activeProject.code,
        collectionName: selectedCollection.name,
        data: JSON.parse(data),
      });
      const body = await result.json();
      if (result.ok && body._id) {
        toast("Document was created successfully", { type: "success" });
        setSelectedDocument({ ...body, ...JSON.parse(data) });
      }
    } else {
      const result = await saveDocument({
        projectCode: activeProject.code,
        collectionName: selectedCollection.name,
        docId: selectedDocument._id,
        data: JSON.parse(data),
      });
      const body = await result.json();
      if (body.message)
        toast(body.message, { type: result.ok ? "success" : "error" });
    }
  };
  
  const getLayoutClassnames = () => {
    let classnames = "flex flex-1 bg-white rounded-lg shadow flex flex-col h-[77vh] ";
    classnames += "w-full md:w-[calc(100vw-280px-8em)] lg:w-[calc(100vw-280px-260px-280px-8em)] xl:max-w-145 "
    if(sidebarClosed) classnames += "lg:w-[100vw-2em)]"
    return classnames;
  }

  return (
    <div className="flex">
      <div className={getLayoutClassnames()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between h-30">
          <div>
            <h2 className="text-lg font-semibold mb-1 text-black">
              {selectedDocument ? (
                <p className="text-black">
                  {selectedDocument._id || "New Document"}
                </p>
              ) : (
                "No Document Selected"
              )}
            </h2>
            <span className="text-gray-400 text-xs">Document Details</span>
          </div>
          {selectedDocument && (
            <DropdownButton
              button={
                <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                  <MoreVerticalIcon size={18} color="#000" />
                </div>
              }
              choices={[
                {
                  label: "Delete Document",
                  icon: <X size={18} />,
                  onClick: async () => {
                    const confirmed = await confirm({
                      msg: "Are you sure, you want to delete this?",
                    });
                    if (!confirmed) return;
                    const result = await deleteDocument({
                      projectCode: activeProject.code,
                      collectionName: selectedCollection.name,
                      docId: selectedDocument._id,
                    });
                    if (result.ok) {
                      toast("Document was deleted successfully!");
                      setSelectedDocument(null);
                    }
                  },
                },
              ]}
            />
          )}
        </div>
        <div className="flex flex-1 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex justify-center items-center p-8 w-full">
              <Loader className="w-6 h-6 animate-spin text-gray-800" />
            </div>
          )}
          {!isLoading && !selectedDocument && (
            <div className="flex justify-center items-center h-64 text-gray-400 text-sm w-full">
              <p>Select a document to view details</p>
            </div>
          )}
          {!isLoading && selectedDocument && (
            <div className="w-full">
              <JsonEditor
                height={"500px"}
                jsonData={() => {
                  const data = { ...selectedDocument };
                  delete data._id;
                  if (Object.keys(data).length == 0) return "{\n\t\n}";
                  return JSON.stringify(data, null, 2);
                }}
                onSave={onSave}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DocumentBox;
