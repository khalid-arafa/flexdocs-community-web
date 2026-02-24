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
import Tooltip from "@/components/Tooltip";

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
    const url = `${API_URL}/projects/${file.projectCode}/storage/${file._id}/${file.name}.${file.ext}`;
    return withToken || !activeProject.isPublic ? url + `?token=${activeProject.projectToken}` : url;
  };

  const normalizeId = (id) => {
    if (!id) return "";
    if (typeof id === "string") return id;
    if (typeof id === "object") {
      if (id.$oid) return String(id.$oid);
      if (typeof id.toString === "function") return id.toString();
    }
    return String(id);
  };

  const isInCurrentBucket = (item, currentBucketId) => {
    if (!item) return false;
    if (item.type === "bucket") {
      return normalizeId(item.parentId) === currentBucketId;
    }
    return normalizeId(item.bucketId) === currentBucketId;
  };

  const getItemMenuChoices = (item) => {
    let choices = [
      {
        label: "Delete",
        icon: <X size={18} color="black" />,
        onClick: async () => {
          const confirmed = await confirm({
            msg: "Are you sure, you want to delete this?",
          });
          if (!confirmed) return;
          let result;
          if (item.type == "file") {
            result = await deleteStorageFile({
              projectCode: activeProject.code,
              fileId: item._id,
            });
          } else {
            result = await deleteStorageBucket({
              projectCode: activeProject.code,
              bucketId: item._id,
            });
          }

          if (!result?.ok) {
            const body = await result
              .json()
              .catch(() => ({ message: "Delete request failed" }));
            toast(body.message || "Delete request failed");
            return;
          }

          // Optimistic update in case socket update is delayed/missed.
          setContent((prev) =>
            prev.filter((i) => normalizeId(i._id) !== normalizeId(item._id))
          );
          setTotalCount((prev) => Math.max(0, prev - 1));
        },
      },
    ];

    if (item.type == "file") {
      choices.unshift({
        label: "Copy Downloadable Link",
        icon: <Copy size={18} color="black" />,
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
        icon: <Edit size={18} color="black" />,
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
    if (loading === true || loadingMore === true) return;

    if (item.type === "bucket") {
      navigateToDirectory(item);
    }

    if (item.type === "file") {
      const link = getDownloadableLink({ file: item, withToken: true });
      window.open(link, "_blank", "noopener,noreferrer");
    }
  };

  const handleData = async (payload) => {
    if (!payload) return;
    const currentBucketId = normalizeId(getCurrectBucket()?._id);

    if (Array.isArray(payload.add) && payload.add.length) {
      const incoming = payload.add.filter((item) =>
        isInCurrentBucket(item, currentBucketId)
      );
      if (incoming.length > 0) {
        setContent((prev) => {
          const merged = Array.from(
            new Map(
              [...incoming, ...prev].map((doc) => [
                normalizeId(doc._id),
                { ...doc },
              ])
            ).values()
          );
          const delta = merged.length - prev.length;
          if (delta !== 0) {
            setTotalCount((count) => Math.max(0, count));
          }
          return merged;
        });
      }
    }

    if (Array.isArray(payload.update) && payload.update.length) {
      setContent((prev) =>
        prev.map((item) => {
          const updated = payload.update.find(
            (u) => normalizeId(u._id) === normalizeId(item._id)
          );
          return updated ? { ...item, ...updated } : item;
        })
      );
    }

    if (Array.isArray(payload.delete) && payload.delete.length) {
      const deletedIds = new Set(
        payload.delete.map((item) =>
          normalizeId(typeof item === "string" ? item : item?._id)
        )
      );
      setContent((prev) =>
      {
        const next = prev.filter(
          (item) => !deletedIds.has(normalizeId(item._id))
        );
        const removed = prev.length - next.length;
        if (removed > 0) {
          setTotalCount((count) => Math.max(0, count - removed));
        }
        return next;
      }
      );
    }

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
    setPage(1);
    setTotalCount(0);
  }, [bucketPathList]);

  // Render breadcrumbs
  const renderBreadcrumbs = () => {
    const pathParts = [
      "/",
      ...bucketPathList.map((i) => i.name).filter(Boolean),
    ];

    return (
      <div className="flex items-center flex-wrap">
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

  const getItemName = (item) => {
    return `${item.name}${item.type === "file" ? `.${item.ext}` : ""}`;
  }

  const safeTotalCount = Math.max(totalCount, content.length);
  const safeShowingCount = Math.min(content.length, safeTotalCount);

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
          <div>
            {/* Header row - desktop only */}
            <div className="hidden md:flex bg-gray-100 text-gray-400 text-left text-sm font-normal px-4 py-2 items-center gap-4">
              <div className="w-8"></div>
              <div className="flex-1 min-w-0">Name</div>
              <div className="min-w-0 mx-4">Size</div>
              <div className="min-w-0 mx-4">Created At</div>
              <div className="flex-shrink-0 w-[42px] text-center">Options</div>
            </div>

            {/* Cards */}
            {content.map((item, index) => (
              <div
                key={index}
                className="bg-white border-b border-gray-200 hover:bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Number - desktop only */}
                  <div className="hidden md:block text-black text-sm w-8 flex-shrink-0">
                    {index + 1}
                  </div>

                  {/* Name */}
                  <div className="flex items-center min-w-0 flex-1">
                    {item.type === "bucket" ? (
                      <Folder className="w-5 h-5 mr-2 text-brand flex-shrink-0" />
                    ) : (
                      <File className="w-5 h-5 mr-2 text-gray-500 flex-shrink-0" />
                    )}
                    <Tooltip text={getItemName(item)} className="min-w-0 flex-1">
                      <button
                        onClick={() => handleItemClick(item)}
                        className="hover:text-blue-600 hover:underline cursor-pointer text-left text-black truncate block w-full"
                      >
                        {getItemName(item)}
                      </button>
                    </Tooltip>
                  </div>

                  {/* Size - hidden on small screens */}
                  <div className="hidden md:block text-blackmin-w-0 text-left text-black lg:px-4">
                    {(item.size && formatBytes(item.size)) || ""}
                  </div>

                  {/* Created At - hidden on small screens */}
                  <div className="hidden md:block text-black md:px-4 min-w-0 lg:px-4">
                    {formatDate(item.createdAt)}
                  </div>

                  {/* Options */}
                  <div className="flex items-center justify-center flex-shrink-0">
                    <DropdownButton
                      button={
                        <div className="cursor-pointer hover:bg-white p-2 rounded-full transition-all duration-300 ease-in-out">
                          <MoreVerticalIcon size={18} color="black" />
                        </div>
                      }
                      choices={getItemMenuChoices(item)}
                    />
                  </div>
                </div>

                {/* Mobile-only details */}
                <div className="md:hidden mt-3 space-y-2 text-sm pl-7 text-black">
                  {item.size && (
                    <div className="text-black">Size: {formatBytes(item.size)}</div>
                  )}
                  <div className="text-black">{formatDate(item.createdAt)}</div>
                </div>
              </div>
            ))}

            {loadingMore && (
              <div className="flex justify-center items-center h-5">
                <Loader className="w-6 h-6 animate-spin text-gray-800" />
              </div>
            )}
            {!loadingMore && (
              <LoadMorePagination
                showing={safeShowingCount}
                totalCount={safeTotalCount}
                canLoadMore={content.length < safeTotalCount}
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
