"use client";

import JsonEditor from "@/components/JsonEditor";
import Tabs from "@/components/Tabs";
import { useEffect, useState } from "react";
import { Plus, Upload } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import DropdownButton from "@/components/DropdownButton";
import { showDialog } from "@/components/CustomDialog";
import AddEditBucket from "./AddEditBucket";
import { toast } from "react-toastify";
import StorageTabContent from "./StorageTabContent";
import { useStorageContext } from "@/context/StorageContext";
import { loadStorageRules, saveStorageRules } from "@/utils/api";

export default function page() {
  const [rules, setRules] = useState();
  const { activeProject } = useProjectsContext();

  const { setUploadFiles, setShowUploader, getCurrentBucket } =
    useStorageContext();

  const onSaveRules = async (newRules) => {
    setRules(newRules);
    try {
      const result = await saveStorageRules({
        code: activeProject.code,
        rules: JSON.parse(newRules),
      });
      const body = await result.json();
      if (result.ok) {
        toast("Rules changes have been saved successfully!");
      } else {
        toast(body.message);
      }
    } catch (error) {
      toast(error.message || "Failed to save rules");
    }
  };

  const tabs = [
    {
      label: "Files",
      content: <StorageTabContent />,
    },
    {
      label: "Rules",
      content: (
        <JsonEditor
          onSave={(newRules) => onSaveRules(newRules)}
          jsonData={rules}
          height="600px"
          className={"border border-gray-100 rounded-xl"}
          backgroundColor="#fff"
        />
      ),
    },
  ];

  useEffect(() => {
    if (!activeProject) return;
    const loadRules = async () => {
      try {
        const result = await loadStorageRules({
          code: activeProject.code,
        });
        const body = await result.json();
        if (result.ok) {
          setRules(JSON.stringify(body, null, 2));
        }
      } catch {
        // rules failed to load
      }
    };
    loadRules();
  }, [activeProject]);

  async function pickFiles() {
    return await new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;
      input.onchange = () => {
        const files = Array.from(input.files);
        resolve(files);
      };
      input.click();
    });
  }

  const MAX_UPLOAD_FILES = 10;

  const add = async () => {
    let files = await pickFiles();
    if (files.length) {
      if (files.length > MAX_UPLOAD_FILES) {
        toast.error(`You can upload up to ${MAX_UPLOAD_FILES} files at a time. You selected ${files.length}.`);
        return;
      }
      const bucketId = getCurrentBucket()?._id || null;
      files = files.map((i) => new Object({ file: i, bucketId }));
      setUploadFiles(files);
      setShowUploader(true);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-2 md:p-4">
      <Tabs
        tabs={tabs}
        trailing={
          <DropdownButton
            button={
              <div className="cursor-pointer hover:bg-white p-2 transition-all duration-300 ease-in-out rounded-md">
                <Plus size={18} color="#000" />
              </div>
            }
            choices={[
              {
                icon: <Plus size={18} />,
                label: "Add Bucket",
                onClick: () => {
                  showDialog({
                    content: AddEditBucket,
                    params: {
                      parentId: getCurrentBucket()?._id || null,
                      activeProject,
                      toast,
                    },
                  });
                },
              },
              {
                icon: <Upload size={18} />,
                label: "Upload",
                onClick: (e) => add(),
              },
            ]}
          />
        }
      />
    </div>
  );
}
