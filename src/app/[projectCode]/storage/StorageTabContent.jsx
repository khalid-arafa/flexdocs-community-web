import { useState, useEffect } from "react";
import {
  ChevronRight,
  Folder,
  File,
  Loader,
  MoreVerticalIcon,
  Copy,
  X,
  Edit,
} from "lucide-react";
import { useDialogs } from "@/context/DialogsContext";
import {
  deleteStorageBucket,
  deleteStorageFile,
  getBucketContent,
} from "@/utils/api";
import { API_URL } from "@/constants";
import { formatDate } from "@/utils/datetime";
import LoadMorePagination from "@/components/LoadMorePagination";
import { formatBytes } from "@/utils/files";
import { getSocket } from "@/utils/socket";
import { useProjectsContext } from "@/context/ProjectsContext";
import DropdownButton from "@/components/DropdownButton";
import { useStorageContext } from "@/context/StorageContext";
import { showDialog } from "@/components/CustomDialog";
import AddEditBucket from "./AddEditBucket";
import { toast } from "react-toastify";

export default function StorageTabContent() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { activeProject } = useProjectsContext();

  const { bucketPathList, setBucketPathList, getCurrectBucket } =
    useStorageContext();

  const { confirm } = useDialogs();

  // fetching
  const fetchContents = async (bucket) => {
    if (!activeProject) return;
    const isFirstLoad = content.length === 0;
    if (isFirstLoad) setLoading(true);
    else setLoadingMore(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const result = await getBucketContent({
        projectCode: activeProject.code,
        bucketId: bucket?._id || "home",
        ipp: 20,
        page,
      });

      const body = await result.json();     

      if (result.ok) {
        setContent((prev) =>
          Array.from(
            new Map(
              [...prev, ...body.content].map((doc) => [doc._id, { ...doc }])
            ).values()
          )
        );
        setTotalCount(body.totalCount);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      if (isFirstLoad) setLoading(false);
      setLoadingMore(false);
    }
  };

  // Navigate to a directory
  const navigateToDirectory = (bucketItem) => {
    if (loading === true || loadingMore === true) return;
    setBucketPathList((prev) => [...prev, bucketItem]);
    setContent([]);
  };

  const getDownloadableLink = ({ file, withToken = false }) => {
    console.log(activeProject);
    console.log(withToken);
    console.log(activeProject.isPublic);
    
    
    const url = `${API_URL}/projects/${file.projectCode}/storage/${file._id}/${file.name}.${file.ext}`;
    return withToken || !activeProject.isPublic ? url + `?token=${activeProject.projectToken}` : url;
  };

  const getItemMenuChoices = (item) => {
    let choices = [
      {
        label: "Delete",
        icon: <X size={18} />,
        onClick: async () => {
          const confirmed = await confirm({
            msg: "Are you sure, you want to delete this?",
          });
          if (!confirmed) return;
          if (item.type == "file") {
            await deleteStorageFile({
              projectCode: activeProject.code,
              fileId: item._id,
            });
          } else {
            await deleteStorageBucket({
              projectCode: activeProject.code,
              bucketId: item._id,
            });
          }
        },
      },
    ];

    if (item.type == "file") {
      choices.unshift({
        label: "Copy Downloadable Link",
        icon: <Copy size={18} />,
        onClick: () => {
          navigator.clipboard
            .writeText(getDownloadableLink({ file: item }))
            .then(() => console.log("Copied!"))
            .catch((err) => console.error("Failed to copy", err));
        },
      });
    }

    if (item.type == "bucket") {
      choices.unshift({
        label: "Edit",
        icon: <Edit size={18} />,
        onClick: async () => {
          showDialog({
            content: AddEditBucket,
            params: {
              title: "Editing Bucket",
              bucket: item,
              activeProject,
              toast,
            },
          });
        },
      });
    }

    return choices;
  };

  const handleItemClick = (item) => {
    console.log(item);
    
    if (loading === true || loadingMore === true) return;

    if (item.type === "bucket") {
      navigateToDirectory(item);
    }

    if (item.type === "file") {
      const link = getDownloadableLink({ file: item, withToken: true });
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  const handleData = async (data) => {
    if (data.action === "add")
      setContent((prev) =>
        Array.from(
          new Map(
            [...prev, data.data].map((doc) => [doc._id, { ...doc }])
          ).values()
        )
      );
    if (data.action === "delete")
      setContent((prev) => prev.filter((i) => data.data._id != i._id));

    setLoading(false);
  };

  // Load contents when path changes
  useEffect(() => {
    if (!activeProject?.code) return;
    const room = `${activeProject.code}-storage`;
    getSocket(activeProject.projectToken).on(room, handleData);
    getSocket(activeProject.projectToken).emit("watch-buckets", {});
    return () => {
      getSocket(activeProject.projectToken).off(room, handleData);
      getSocket(activeProject.projectToken).emit("stop-watch-buckets", {});
    };
  }, [activeProject]);

  useEffect(() => {
    fetchContents(getCurrectBucket());
  }, [page, getCurrectBucket, activeProject]);
  
  useEffect(() => {
    setPage(1); // reset page on path change+
    setTotalCount(0);
  }, [bucketPathList]);


  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    const pathParts = [
      "/",
      ...bucketPathList.map((i) => i.name).filter(Boolean),
    ];

    return (
      <div className="flex items-center ">
        {pathParts.map((part, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <ChevronRight className="w-4 h-4 text-gray-500" />}
            <button
              onClick={() => {
                const currentBucket = getCurrectBucket();
                const thisBucket = bucketPathList[index - 1];
                if (
                  currentBucket &&
                  thisBucket &&
                  currentBucket._id == thisBucket._id
                )
                  return;
                setContent([]);
                setBucketPathList((prev) => prev.splice(0, index));
              }}
              className={`hover:underline px-2 cursor-pointer ${
                index === pathParts.length - 1 ? "font-medium" : ""
              }`}
            >
              {part}
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col">
      {/* Header */}
      <header className="bg-white border-b px-4 py-2 flex items-center justify-between rounded-md">
        <div className="text-md text-black">{renderBreadcrumbs()}</div>
      </header>

      {/* Main Content */}
      <main className="rounded-md">
        {loading ? (
          <div className="flex justify-center items-center h-100">
            <Loader className="w-6 h-6 animate-spin text-gray-800" />
          </div>
        ) : content.length === 0 ? (
          <div className="flex justify-center items-center h-100 text-gray-500">
            This folder is empty
          </div>
        ) : (
          <div className="">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-400 text-left">
                  <th className="py-3 px-2 font-normal text-sm"></th>
                  <th className="py-3 px-2 font-normal text-sm">Name</th>
                  <th className="py-3 px-2 font-normal text-sm">Size</th>
                  <th className="py-3 px-2 font-normal text-sm">Created At</th>
                  <th className="py-3 px-2 font-normal text-sm flex-1">
                    Options
                  </th>
                </tr>
              </thead>
              <tbody className="text-gray-700">
                {content.map((item, index) => (
                  <tr
                    key={index}
                    className="border-b border-gray-200 hover:bg-gray-50"
                  >
                    <td className="py-3 px-2 pl-6 text-sm">{index + 1}</td>
                    <td className="py-3 px-2">
                      <div className="flex items-center">
                        {item.type === "bucket" ? (
                          <Folder className="w-5 h-5 mr-2 text-blue-500" />
                        ) : (
                          <File className="w-5 h-5 mr-2 text-gray-500" />
                        )}
                        <button
                          onClick={() => handleItemClick(item)}
                          className={`hover:text-blue-600 hover:underline cursor-pointer text-left`}
                        >
                          {item.name}
                          {item.type == "file" && `.${item.ext}`}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-0 text-md text-center">
                      {(item.size && formatBytes(item.size)) || ""}
                    </td>
                    <td className="py-3 px-2 text-md">
                      {formatDate(item.createdAt)}
                    </td>
                    <td className="py-3 px-2 flex flex-1 justify-center align-center items-center">
                      <DropdownButton
                        button={
                          <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                            <MoreVerticalIcon size={18} />
                          </div>
                        }
                        choices={getItemMenuChoices(item)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {loadingMore && (
              <div className="flex justify-center items-center h-5">
                <Loader className="w-6 h-6 animate-spin text-gray-800" />
              </div>
            )}
            {!loadingMore && (
              <LoadMorePagination
                showing={content.length}
                totalCount={totalCount}
                canLoadMore={content.length < totalCount}
                loadMore={() => {
                  setPage((prev) => prev + 1);
                }}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}
