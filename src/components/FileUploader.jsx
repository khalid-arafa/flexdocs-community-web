"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, File, Loader, Copy, Check } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { getSocket } from "@/utils/socket";
import { useStorageContext } from "@/context/StorageContext";
import { API_URL } from "@/constants";
import { copyToClipboard } from "@/utils/clipboard";

export default function FileUploader() {
  const [files, setFiles] = useState([]);
  const [copiedKey, setCopiedKey] = useState(null);
  const startedUploadsRef = useRef(new Set());
  // Names with an upload currently in flight. The server keys its in-progress
  // uploads by name, so a second concurrent upload of the same name would
  // clobber the first's server-side state — refused below.
  const inFlightNamesRef = useRef(new Set());

  const { activeProject } = useProjectsContext();

  const { uploadFiles, setUploadFiles, showUploader, setShowUploader } =
    useStorageContext();

  const uploadFile = useCallback(
    (fileObj) => {
      const uploadKey = `${fileObj.file.name}_${fileObj.file.size}_${fileObj.file.lastModified || 0}`;
      if (startedUploadsRef.current.has(uploadKey)) return;
      startedUploadsRef.current.add(uploadKey);

      // Route every status update by this stable key, NOT by file.name. The
      // wire protocol and the progress/complete/error events are name-keyed, so
      // two different files sharing a name would otherwise apply each other's
      // updates. `key` keeps them distinct in the UI.
      const updateFileStatus = (updates) => {
        setFiles((prev) =>
          prev.map((f) => (f.key === uploadKey ? { ...f, ...updates } : f))
        );
      };

      // The server cannot run two same-named uploads at once (it stores them in
      // socket.activeUploads[name]); the second would corrupt the first. Refuse
      // it here, visibly, rather than letting both silently break.
      if (inFlightNamesRef.current.has(fileObj.file.name)) {
        setFiles((prev) => [
          ...prev,
          {
            key: uploadKey,
            file: fileObj.file,
            status: "error",
            progress: 0,
            error: "Another file with this name is still uploading",
          },
        ]);
        startedUploadsRef.current.delete(uploadKey);
        return;
      }

      setFiles((prev) => {
        if (prev.some((f) => f.key === uploadKey)) return prev;
        return [
          ...prev,
          { key: uploadKey, file: fileObj.file, status: "preparing", progress: 0 },
        ];
      });

      const socket = getSocket(activeProject?.projectToken);

      if (!socket) {
        updateFileStatus({ status: "error", error: "No connection — missing project token" });
        startedUploadsRef.current.delete(uploadKey);
        return;
      }

      inFlightNamesRef.current.add(fileObj.file.name);
      const releaseInFlight = () =>
        inFlightNamesRef.current.delete(fileObj.file.name);

      const cleanupListeners = () => {
        socket.off("upload:ready", handleReady);
        socket.off("upload:progress", handleProgress);
        socket.off("upload:complete", handleComplete);
        socket.off("upload:error", handleError);
      };

      const chunkSize = 64 * 1024;
      let offset = 0;
      let isReady = false;
      // True between sending a chunk and receiving its ack. A duplicate or
      // out-of-order progress event arriving while this is false is ignored, so
      // the offset advances exactly once per chunk actually sent — the old
      // unconditional `offset += chunkSize` let a re-emitted ack skip bytes.
      let awaitingAck = false;

      const readAndUploadChunk = () => {
        const reader = new FileReader();
        const blob = fileObj.file.slice(offset, offset + chunkSize);

        reader.onload = (e) => {
          if (e.target.error) {
            updateFileStatus({
              status: "error",
              error: "Failed to read file",
            });
            cleanupListeners();
            startedUploadsRef.current.delete(uploadKey);
            releaseInFlight();
            return;
          }

          awaitingAck = true;
          socket.emit("upload:chunk", {
            name: fileObj.file.name,
            chunk: new Uint8Array(e.target.result),
          });
        };

        reader.readAsArrayBuffer(blob);
      };

      const handleReady = (data) => {
        if (data?.name !== fileObj.file.name) return;
        isReady = true;
        socket.off("upload:ready", handleReady);
        updateFileStatus({ status: "uploading", progress: 0 });
        readAndUploadChunk();
      };

      const handleProgress = (data) => {
        if (!isReady) return;
        if (data?.name !== fileObj.file.name || !data?.received) return;
        if (!awaitingAck) return; // duplicate/out-of-order ack — advance once only
        awaitingAck = false;

        offset += chunkSize;
        const progress = Math.min(
          100,
          Math.floor((offset / fileObj.file.size) * 100)
        );
        updateFileStatus({ status: "uploading", progress });

        if (offset < fileObj.file.size) {
          readAndUploadChunk();
        } else {
          socket.emit("upload:done", fileObj.file.name);
        }
      };

      const handleComplete = (data) => {
        if (data?.name !== fileObj.file.name) return;
        updateFileStatus({
          status: "complete",
          progress: 100,
          url: data.url,
        });
        cleanupListeners();
        releaseInFlight();
      };

      const handleError = (error) => {
        const errorName = error?.name;
        if (errorName && errorName !== fileObj.file.name) return;
        const errorMessage =
          typeof error === "string" ? error : error?.message || "Upload failed";
        updateFileStatus({ status: "error", error: errorMessage });
        cleanupListeners();
        releaseInFlight();
      };

      socket.on("upload:ready", handleReady);
      socket.on("upload:progress", handleProgress);
      socket.on("upload:complete", handleComplete);
      socket.on("upload:error", handleError);

      // Start upload process
      socket.emit("upload:start", {
        name: fileObj.file.name,
        size: fileObj.file.size,
        type: fileObj.file.type,
        bucket: fileObj.bucketId,
      });
    },
    [activeProject]
  );

  /**
   * `upload:complete` carries the file's path relative to the API root, with
   * the name segment already percent-encoded. Private projects need the
   * project token for the link to resolve.
   */
  function downloadableLink(fileObj) {
    if (!fileObj.url) return null;
    const url = `${API_URL}/${String(fileObj.url).replace(/^\/+/, "")}`;
    return activeProject?.isPublic
      ? url
      : `${url}?token=${encodeURIComponent(activeProject?.projectToken || "")}`;
  }

  async function copyLink(fileObj) {
    const link = downloadableLink(fileObj);
    if (!link) return;
    const ok = await copyToClipboard(link);
    if (!ok) return;
    setCopiedKey(fileObj.key);
    setTimeout(
      () => setCopiedKey((prev) => (prev === fileObj.key ? null : prev)),
      2000
    );
  }

  function removeFile(key) {
    setFiles((prev) => prev.filter((i) => i.key !== key));
    setUploadFiles((prev) =>
      prev.filter(
        (i) =>
          `${i.file.name}_${i.file.size}_${i.file.lastModified || 0}` !== key
      )
    );
    startedUploadsRef.current.delete(key);
  }

  function clearCompleted() {
    setFiles((prev) => prev.filter((f) => f.status !== "complete"));
  }

  useEffect(() => {
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      uploadFile(file);
    }
  }, [uploadFiles, uploadFile]);

  useEffect(() => {
    return () => {
      setShowUploader(false);
      cleanUp();
    };
  }, []);

  useEffect(() => {
    if (!showUploader) cleanUp();
  }, [showUploader]);

  const cleanUp = async () => {
    setUploadFiles([]);
    setFiles([]);
    startedUploadsRef.current.clear();
  };

  return (
    <>
      {/* Floating uploader panel */}
      {showUploader && (
        <div className="fixed bottom-4 right-4 z-50 w-80 bg-gray-800 shadow-md rounded-lg overflow-hidden border border-gray-200 max-w-[90vw]">
          {/* Header */}
          <div className="bg-gray-800 px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium text-white">File Uploads</h3>
            <div className="flex gap-2">
              {files.some((f) => f.status === "complete") && (
                <button
                  onClick={clearCompleted}
                  className="text-sm text-gray-400 hover:text-gray-200 cursor-pointer"
                >
                  Clear completed
                </button>
              )}
              <button
                onClick={() => {
                  setShowUploader(false);
                  if (!files.filter((i) => i.status != "complete").length) {
                    setFiles([]);
                    setUploadFiles([]);
                  }
                }}
                className="text-gray-500 hover:text-gray-100 cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* File list */}
          <div className="max-h-80 overflow-y-auto p-2">
            {files.length === 0 ? (
              <div className="p-4 text-center text-gray-500">
                No files uploading
              </div>
            ) : (
              files.map((fileObj) => (
                <div
                  key={fileObj.key}
                  className="mb-2 p-2 rounded bg-gray-200 shadow-lg"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <File size={16} className="text-gray-500" />
                      <span className="truncate text-sm text-black">
                        {fileObj.file.name}
                      </span>
                    </div>
                    <div className="flex items-center shrink-0">
                      {fileObj.status === "complete" && fileObj.url && (
                        <button
                          onClick={() => copyLink(fileObj)}
                          title="Copy downloadable link"
                          aria-label="Copy downloadable link"
                          className={`cursor-pointer px-1 ${
                            copiedKey === fileObj.key
                              ? "text-green-600"
                              : "text-gray-400 hover:text-gray-900"
                          }`}
                        >
                          {copiedKey === fileObj.key ? (
                            <Check size={14} />
                          ) : (
                            <Copy size={14} />
                          )}
                        </button>
                      )}
                      {fileObj.status !== "uploading" && (
                        <button
                          onClick={() => removeFile(fileObj.key)}
                          title="Remove from list"
                          aria-label="Remove from list"
                          className="text-gray-400 hover:text-gray-900 cursor-pointer px-1"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-200 ${
                        fileObj.status === "error"
                          ? "bg-red-500"
                          : fileObj.status === "complete"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${fileObj.progress || 0}%` }}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      {fileObj.status === "preparing" && (
                        <span className="flex items-center gap-1">
                          <Loader size={12} className="animate-spin" />
                          Preparing...
                        </span>
                      )}
                      {fileObj.status === "uploading" && `${fileObj.progress}%`}
                      {fileObj.status === "complete" && (
                        <span className="flex items-center text-green-600 font-bold mt-1">
                          <CheckCircle size={16} className="mr-1" />
                          Complete
                        </span>
                      )}
                      {fileObj.status === "error" && (
                        <span className="flex items-center text-red-600">
                          <AlertCircle size={12} className="mr-1" />
                          {fileObj.error || "Upload failed"}
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500 mt-1">
                      {Math.round(fileObj.file.size / 1024)} KB
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
