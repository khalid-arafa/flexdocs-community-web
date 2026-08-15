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
import { formatDate } from "@/utils/datetime";
import LoadMorePagination from "@/components/LoadMorePagination";
import {
  formatBytes,
  getFileUrl,
  isImageFile,
  toAbsoluteApiUrl,
} from "@/utils/files";
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

// The API serves a file without any credential only when it is explicitly
// public (`if (!file.isPublic && !req.isDbAdmin)` on the download route), so a
// missing/undefined flag counts as private here too — same rule, same side.
const isPublicFile = (item) => item?.isPublic === true;

const THUMB_SIZE = "small";
// Re-mint a signed url shortly before it lapses, so a link copied — or a
// thumbnail rendered — at the very end of its lifetime is still usable.
const SIGNED_URL_SKEW_MS = 60 * 1000;

const signedUrlKey = (fileId, size) => `${fileId}|${size || ""}`;

const isSignedUrlFresh = (entry) =>
  !!entry?.url &&
  (!entry.expires || entry.expires * 1000 - Date.now() > SIGNED_URL_SKEW_MS);

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
function ItemIcon({ item, thumbUrl, onThumbError }) {
  const [thumbFailed, setThumbFailed] = useState(false);

  // A row keeps its identity across realtime inserts now (rows are keyed by
  // file id), but the url itself can still change under the same row when an
  // expired signature is re-minted — that deserves a fresh attempt.
  useEffect(() => {
    setThumbFailed(false);
  }, [thumbUrl]);

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
        onError={() => {
          setThumbFailed(true);
          onThumbError?.();
        }}
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

  // Concurrency guards, mirroring DatabaseContext: `loading`/`loadingMore` are
  // async state and cannot gate re-entrancy. `inFlight` dedupes an identical
  // request already running; the `reqId` counter marks the newest request so a
  // slower earlier one (the page-N fetch that fires before the bucket switch
  // has reset the page) cannot merge its stale rows in or clear the spinner the
  // current request is still showing.
  const contentReqIdRef = useRef(0);
  const contentInFlightRef = useRef(new Set());

  // fetching
  const fetchContents = async (bucket) => {
    if (!activeProject) return;
    const bucketId = normalizeId(bucket?._id) || "home";
    const requestKey = `${activeProject.code}#${bucketId}#${page}`;
    if (contentInFlightRef.current.has(requestKey)) return;
    contentInFlightRef.current.add(requestKey);
    const reqId = ++contentReqIdRef.current;

    // Decide the spinner from the PAGE, not from content.length: navigating
    // into a bucket clears the list and fetches synchronously after, so the
    // length still described the bucket we just left.
    const isFirstPage = page === 1;
    if (isFirstPage) setLoading(true);
    else setLoadingMore(true);

    try {
      const result = await getBucketContent({
        projectCode: activeProject.code,
        bucketId,
        ipp: 20,
        page,
      });

      const body = await result.json();
      if (reqId !== contentReqIdRef.current) return; // superseded

      if (result.ok) {
        // Page 1 replaces (fresh bucket/project); later pages append.
        setContent((prev) =>
          Array.from(
            new Map(
              [...(isFirstPage ? [] : prev), ...body.content].map((doc) => [
                normalizeId(doc._id),
                { ...doc },
              ])
            ).values()
          )
        );
        setTotalCount(body.totalCount);
      }
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      contentInFlightRef.current.delete(requestKey);
      if (reqId === contentReqIdRef.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  // Everything that changes which bucket is being listed goes through this, in
  // the same batch as the path change: without the page reset, moving from page
  // N of one bucket into another first fetched page N of the new bucket, and
  // only then the page-1 fetch the [bucketPathList] effect triggers.
  const resetListing = () => {
    setContent([]);
    setTotalCount(0);
    setPage(1);
  };

  // Navigate to a directory
  const navigateToDirectory = (bucketItem) => {
    if (loading === true || loadingMore === true) return;
    resetListing();
    setBucketPathList((prev) => [...prev, bucketItem]);
  };

  // Short-lived signed download urls, keyed by "<fileId>|<size>". Kept in state
  // (a newly minted thumbnail has to re-render its row) and mirrored in a ref
  // so the async minter always reads the freshest map. `mintingRef` holds the
  // in-flight promise per key so a re-render cannot fire a second mint.
  const [signedUrls, setSignedUrls] = useState({});
  const signedUrlsRef = useRef(signedUrls);
  signedUrlsRef.current = signedUrls;
  const mintingRef = useRef(new Map());
  const thumbRetriedRef = useRef(new Set());

  // Items are dropped rather than linked while they still belong to the project
  // we just left — their ids mean nothing under the new project's code.
  const belongsToActiveProject = (item) =>
    !!activeProject?.code &&
    (!item?.projectCode || item.projectCode === activeProject.code);

  /**
   * Absolute url for a private file: a server-minted, time-limited, file-scoped
   * signature — never the project token, which is long-lived, project-wide and
   * would end up in history and logs. Returns null when minting fails.
   */
  const ensureSignedUrl = async (item, size = "") => {
    if (!activeProject?.code || !belongsToActiveProject(item)) return null;
    const fileId = normalizeId(item._id);
    if (!fileId) return null;
    const key = signedUrlKey(fileId, size);

    const cached = signedUrlsRef.current[key];
    if (isSignedUrlFresh(cached)) return cached.url;

    const pending = mintingRef.current.get(key);
    if (pending) return pending;

    const request = (async () => {
      try {
        const res = await getSignedDownloadUrl({
          projectCode: activeProject.code,
          fileId,
          size,
        });
        if (!res.ok) return null;
        const body = await res.json();
        const url = toAbsoluteApiUrl(body?.url);
        if (!url) return null;
        setSignedUrls((prev) => ({
          ...prev,
          [key]: { url, expires: body.expires },
        }));
        return url;
      } catch {
        return null;
      } finally {
        mintingRef.current.delete(key);
      }
    })();

    mintingRef.current.set(key, request);
    return request;
  };

  /** Plain url — valid only for a public file, which needs no credential. */
  const getPublicFileUrl = (item, size) =>
    getFileUrl({ file: item, size, projectCode: activeProject.code });

  /**
   * Thumbnail source for a row. Public files are served without any credential,
   * so they get a plain url; private ones wait for their signed url and show
   * the type icon in the meantime.
   */
  const getThumbUrl = (item) => {
    if (item.type !== "file" || !isImageFile(item)) return null;
    if (!belongsToActiveProject(item)) return null;
    if (isPublicFile(item)) return getPublicFileUrl(item, THUMB_SIZE);
    const entry = signedUrls[signedUrlKey(normalizeId(item._id), THUMB_SIZE)];
    return isSignedUrlFresh(entry) ? entry.url : null;
  };

  /** A signature that lapsed between render and load: drop it and re-mint once. */
  const handleThumbError = (item) => {
    if (isPublicFile(item)) return;
    const key = signedUrlKey(normalizeId(item._id), THUMB_SIZE);
    if (!signedUrlsRef.current[key]) return;
    if (thumbRetriedRef.current.has(key)) return;
    thumbRetriedRef.current.add(key);
    // Removing the entry re-runs the minting effect below (it watches
    // signedUrls), which re-mints because the cache no longer answers.
    setSignedUrls((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  /** Absolute url to open/share a file — signed when the file is private. */
  const getShareableLink = async (item) =>
    isPublicFile(item) && belongsToActiveProject(item)
      ? getPublicFileUrl(item)
      : await ensureSignedUrl(item);

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
          // A public file has a plain, permanent url. A private one gets a
          // time-limited signed link — shareable, scoped to this single file,
          // and with no reusable project token in it. There is no bare-link
          // fallback: it would either not work at all (bearer mode) or work
          // only inside the admin's own cookie-bearing browser.
          const link = await getShareableLink(item);
          if (!link) {
            toast("Failed to create a shareable link");
            return;
          }
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

  const openFile = async (item) => {
    if (isPublicFile(item) && belongsToActiveProject(item)) {
      window.open(getPublicFileUrl(item), "_blank", "noopener,noreferrer");
      return;
    }

    // A private file's url has to be minted first, and a window.open() after an
    // await is what popup blockers eat. Open the tab synchronously inside the
    // click gesture, sever its opener while it is still same-origin about:blank
    // (no reverse-tabnabbing handle on the dashboard), then send it to the
    // signed url.
    const tab = window.open("", "_blank");
    if (tab) {
      try {
        tab.opener = null;
      } catch {
        /* not settable everywhere; the target is our own API origin */
      }
    }
    const link = await ensureSignedUrl(item);
    if (!link) {
      if (tab) tab.close();
      toast("Failed to open the file");
      return;
    }
    if (tab) tab.location.href = link;
    else window.open(link, "_blank", "noopener,noreferrer");
  };

  const handleItemClick = (item) => {
    if (loading === true || loadingMore === true) return;

    if (item.type === "bucket") {
      navigateToDirectory(item);
    }

    if (item.type === "file") {
      openFile(item);
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
    // getSocket returns null when the project has no token — calling .on() on
    // that null threw and took the whole storage screen down. Same guard the
    // database panels and FileUploader already use.
    const socket = getSocket(activeProject.projectToken);
    if (!socket) return;
    const room = `${activeProject.code}-storage`;
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

  // Safety net for path changes that do not come from the handlers above — the
  // project switch that empties bucketPathList inside StorageContext, most of
  // all. Setting page 1 when it is already 1 is a no-op, so the common case
  // costs nothing and never doubles a fetch.
  useEffect(() => {
    setPage(1);
    setTotalCount(0);
    setContent((prev) => (prev.length ? [] : prev));
  }, [bucketPathList]);

  // A signed url belongs to one project's file; keep nothing across a switch.
  useEffect(() => {
    setSignedUrls({});
    mintingRef.current.clear();
    thumbRetriedRef.current.clear();
  }, [activeProject?.code]);

  // Mint the signed urls the private image rows need for their thumbnails.
  // Watching signedUrls too lets handleThumbError re-mint simply by dropping
  // the lapsed entry; ensureSignedUrl short-circuits on everything cached.
  useEffect(() => {
    content.forEach((item) => {
      if (item.type !== "file" || !isImageFile(item)) return;
      if (isPublicFile(item) || !belongsToActiveProject(item)) return;
      ensureSignedUrl(item, THUMB_SIZE);
    });
  }, [content, signedUrls, activeProject]);

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
                resetListing();
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
              <div className="shrink-0 w-10.5 text-center">Options</div>
            </div>

            {/* Cards */}
            {/* Keyed by file id, never by index: realtime additions PREPEND,
                which shifted every row's per-row state (a failed thumbnail, for
                one) onto its neighbour. */}
            {content.map((item, index) => (
              <div
                key={normalizeId(item._id) || `${item.type}-${item.name}`}
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
                      thumbUrl={getThumbUrl(item)}
                      onThumbError={() => handleThumbError(item)}
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
                <div className="md:hidden mt-3 space-y-2 text-sm pl-13 text-black">
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
