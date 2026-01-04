"use client";

// import JsonEditor from "@/components/JsonEditor";
import Tabs from "@/components/Tabs";
import { Plus, Upload } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import DropdownButton from "@/components/DropdownButton";
import { showDialog } from "@/components/CustomDialog";
import AddEditBucket from "./AddEditBucket";
import { toast, ToastContainer } from "react-toastify";
import StorageTabContent from "./StorageTabContent";
import { useStorageContext } from "@/context/StorageContext";

export default function page() {
  // const [rules, setRules] = useState('{\n  "read": true,\n  "write": false\n}');
  const { activeProject } = useProjectsContext();

  const { setUploadFiles, setShowUploader, getCurrectBucket } =
    useStorageContext();

  const tabs = [
    {
      label: "Files",
      content: <StorageTabContent />,
    },
    // {
    //   label: "Rules",
    //   content: (
    //     <JsonEditor
    //       onSave={(newRules) => {
    //         setRules(newRules);
    //       }}
    //       jsonData={rules}
    //       height="600px"
    //     />
    //   ),
    // },
  ];

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

  const add = async () => {
    let files = await pickFiles();
    if (files.length) {
      const bucketId = getCurrectBucket()?._id || null;
      files = files.map((i) => new Object({ file: i, bucketId }));
      setUploadFiles(files);
      setShowUploader(true);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
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
                      parentId: getCurrectBucket()?._id || null,
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
      <ToastContainer />
    </div>
  );
}
