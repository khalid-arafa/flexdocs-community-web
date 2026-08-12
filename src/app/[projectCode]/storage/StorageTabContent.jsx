import { useState, useEffect, useRef } from "react";
import {
  ChevronRight,
  Folder,
  File,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
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
  getSignedDownloadUrl,
} from "@/utils/api";
import { API_URL } from "@/constants";
import { usesCookieAuth } from "@/utils/authMode";
import { formatDate } from "@/utils/datetime";
import LoadMorePagination from "@/components/LoadMorePagination";
import { formatBytes, getFileUrl, isImageFile } from "@/utils/files";
import { copyToClipboard } from "@/utils/clipboard";
import { getSocket } from "@/utils/socket";
import { useProjectsContext } from "@/context/ProjectsContext";
import DropdownButton from "@/components/DropdownButton";
import { useStorageContext } from "@/context/StorageContext";
import { showDialog } from "@/components/CustomDialog";
import AddEditBucket from "./AddEditBucket";
import { toast } from "react-toastify";
import Tooltip from "@/components/Tooltip";

const EXTENSION_ICONS = {
  pdf: FileText,
  doc: FileText,
  docx: FileText,
  txt: FileText,
  md: FileText,
  rtf: FileText,
  csv: FileSpreadsheet,
  xls: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  zip: FileArchive,
  rar: FileArchive,
  "7z": FileArchive,
  tar: FileArchive,
  gz: FileArchive,
  mp3: FileAudio,
  wav: FileAudio,
  ogg: FileAudio,
  m4a: FileAudio,
  mp4: FileVideo,
  mov: FileVideo,
  webm: FileVideo,
  avi: FileVideo,
  mkv: FileVideo,
  json: FileCode,
  yml: FileCode,
  yaml: FileCode,
  css: FileCode,
  ts: FileCode,
  tsx: FileCode,
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

/**
 * Row icon: images show an actual thumbnail (the API resizes on demand and
 * caches the result), everything else gets an icon matching its extension.
 * Declared at module scope so the <img> is not remounted — and the thumbnail
 * not refetched — on every parent render.
 */
function ItemIcon({ item, thumbUrl }) {
  const [thumbFailed, setThumbFailed] = useState(false);

  // One box for every row so names stay aligned whether the row shows a
  // thumbnail, a folder or a type icon.
  const box = "w-10 h-10 mr-3 shrink-0";

  if (item.type === "bucket")
    return <Folder className={`${box} text-brand`} strokeWidth={1.5} />;

  if (thumbUrl && !thumbFailed) {
    return (
      <img
        src={thumbUrl}
        alt=""
        loading="lazy"
        onError={() => setThumbFailed(true)}
        className={`${box} rounded object-cover bg-gray-100 border border-gray-200`}
      />
    );
  }

  const Icon =
    EXTENSION_ICONS[String(item.ext || "").toLowerCase()] ||
    (isImageFile(item) ? FileImage : File);
  return <Icon className={`${box} text-gray-500`} strokeWidth={1.5} />;
}

export default function StorageTabContent() {
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const { activeProject } = useProjectsContext();

  const { bucketPathList, setBucketPathList, getCurrentBucket } =
    useStorageContext();

  const { confirm } = useDialogs();

  const currentBucketId = normalizeId(getCurrentBucket()?._id);
  // The socket handler below is registered once per project, so it cannot read
  // the bucket from its own closure without going stale.
  const currentBucketIdRef = useRef(currentBucketId);
  currentBucketIdRef.current = currentBucketId;

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

  const getDownloadableLink = ({ file, withToken = false, size }) =>
    getFileUrl({
      file,
      // Cookie-auth (HTTPS): the admin session cookie rides the request and the
      // admin bypass on the API serves any file, so no token belongs in the URL
      // (it would only leak into history/logs). Bearer (dev/HTTP): keep the
      // project token for private projects as before.
      token: usesCookieAuth()
        ? undefined
        : withToken || !activeProject?.isPublic
        ? activeProject?.projectToken
        : undefined,
      size,
    });

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
          if (item.type === "file") {
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

    if (item.type === "file") {
      choices.unshift({
        label: "Copy Downloadable Link",
        icon: <Copy size={18} color="black" />,
        onClick: async () => {
          let link;
          // In cookie-auth mode a private file has no URL token, so a bare link
          // only works in the admin's own (cookie-bearing) browser. Mint a
          // time-limited signed link instead — shareable without exposing a
          // reusable token. Falls back to the bare link on any failure.
          if (usesCookieAuth() && item.isPublic === false) {
            try {
              const res = await getSignedDownloadUrl({
                projectCode: activeProject.code,
                fileId: item._id,
              });
              if (res.ok) {
                const body = await res.json();
                if (body?.url) link = `${API_URL}/${body.url}`;
              }
            } catch {
              /* fall through to the bare link */
            }
          }
          if (!link) link = getDownloadableLink({ file: item });
          const ok = await copyToClipboard(link);
          toast(ok ? "Link copied to clipboard" : "Failed to copy the link");
        },
      });
    }

    if (item.type === "bucket") {
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
    // Read through the ref, not the render-time value: this handler is
    // registered once per project and would otherwise keep comparing against
    // whichever bucket was open when the socket was wired up. Every file
    // uploaded after navigating into a bucket was dropped here, and only
    // surfaced once something else forced a refetch (e.g. closing the
    // uploader panel).
    const currentBucketId = currentBucketIdRef.current;

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
          const added = merged.length - prev.length;
          if (added > 0) setTotalCount((count) => count + added);
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

  // Always call the latest handler, but register a stable listener so the
  // cleanup can actually remove it — `off` with a freshly created function
  // never matched, so listeners piled up on every re-render.
  const handleDataRef = useRef(handleData);
  handleDataRef.current = handleData;

  // Load contents when path changes
  useEffect(() => {
    if (!activeProject?.code) return;
    const room = `${activeProject.code}-storage`;
    const socket = getSocket(activeProject.projectToken);
    const listener = (payload) => handleDataRef.current(payload);
    socket.on(room, listener);
    socket.emit("watch-buckets", {});
    return () => {
      socket.off(room, listener);
      socket.emit("stop-watch-buckets", {});
    };
  }, [activeProject]);

  // Keyed on the bucket id rather than on getCurrentBucket's identity: that
  // function is rebuilt on every StorageContext render, so the list used to
  // refetch itself whenever an unrelated piece of context state changed.
  useEffect(() => {
    fetchContents(getCurrentBucket());
  }, [page, currentBucketId, activeProject]);

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
                const currentBucket = getCurrentBucket();
                const thisBucket = bucketPathList[index - 1];
                if (
                  currentBucket &&
                  thisBucket &&
                  currentBucket._id === thisBucket._id
                )
                  return;
                setContent([]);
                setBucketPathList((prev) => prev.slice(0, index));
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
              <div className="shrink-0 w-[42px] text-center">Options</div>
            </div>

            {/* Cards */}
            {content.map((item, index) => (
              <div
                key={index}
                className="bg-white border-b border-gray-200 hover:bg-gray-50 p-4"
              >
                <div className="flex items-center justify-between gap-4">
                  {/* Number - desktop only */}
                  <div className="hidden md:block text-black text-sm w-8 shrink-0">
                    {index + 1}
                  </div>

                  {/* Name */}
                  <div className="flex items-center min-w-0 flex-1">
                    <ItemIcon
                      item={item}
                      thumbUrl={
                        item.type === "file" && isImageFile(item)
                          ? getDownloadableLink({
                              file: item,
                              withToken: true,
                              size: "small",
                            })
                          : null
                      }
                    />
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
                  <div className="flex items-center justify-center shrink-0">
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
                <div className="md:hidden mt-3 space-y-2 text-sm pl-[52px] text-black">
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
