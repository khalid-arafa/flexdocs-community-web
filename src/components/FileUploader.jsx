"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { X, CheckCircle, AlertCircle, File, Loader } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { getSocket } from "@/utils/socket";
import { useStorageContext } from "@/context/StorageContext";

export default function FileUploader() {
  const [files, setFiles] = useState([]);
  const startedUploadsRef = useRef(new Set());

  const { activeProject } = useProjectsContext();

  const { uploadFiles, setUploadFiles, showUploader, setShowUploader } =
    useStorageContext();

  const uploadFile = useCallback(
    (fileObj) => {
      const uploadKey = `${fileObj.file.name}_${fileObj.file.size}_${fileObj.file.lastModified || 0}`;
      if (startedUploadsRef.current.has(uploadKey)) return;
      startedUploadsRef.current.add(uploadKey);

      setFiles((prev) => {
        const exists = prev.some(
          (f) =>
            f.file.name === fileObj.file.name &&
            f.file.size === fileObj.file.size &&
            f.file.lastModified === fileObj.file.lastModified
        );
        if (exists) return prev;
        return [...prev, { file: fileObj.file, status: "preparing", progress: 0 }];
      });

      const updateFileStatus = (updates) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === fileObj.file.name
              ? { ...f, ...updates }
              : f
          )
        );
      };

      const socket = getSocket(activeProject?.projectToken);

      if (!socket) {
        updateFileStatus({ status: "error", error: "No connection — missing project token" });
        startedUploadsRef.current.delete(uploadKey);
        return;
      }

      const cleanupListeners = () => {
        socket.off("upload:ready", handleReady);
        socket.off("upload:progress", handleProgress);
        socket.off("upload:complete", handleComplete);
        socket.off("upload:error", handleError);
      };

      const chunkSize = 64 * 1024;
      let offset = 0;
      let isReady = false;

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
            return;
          }

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
        startedUploadsRef.current.delete(uploadKey);
      };

      const handleError = (error) => {
        const errorName = error?.name;
        if (errorName && errorName !== fileObj.file.name) return;
        const errorMessage =
          typeof error === "string" ? error : error?.message || "Upload failed";
        updateFileStatus({ status: "error", error: errorMessage });
        cleanupListeners();
        startedUploadsRef.current.delete(uploadKey);
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

  function removeFile(name) {
    setFiles((prev) => prev.filter((i) => i.file.name != name));
    setUploadFiles((prev) => prev.filter((i) => i.file.name != name));
    for (const key of startedUploadsRef.current) {
      if (key.startsWith(`${name}_`)) startedUploadsRef.current.delete(key);
    }
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
                  key={fileObj.file.name}
                  className="mb-2 p-2 rounded bg-gray-200 shadow-lg"
                >
                  <div className="flex justify-between items-center mb-1">
                    <div className="flex items-center gap-2 truncate">
                      <File size={16} className="text-gray-500" />
                      <span className="truncate text-sm text-black">
                        {fileObj.file.name}
                      </span>
                    </div>
                    {fileObj.status !== "uploading" && (
                      <button
                        onClick={() => removeFile(fileObj.file.name)}
                        className="text-gray-400 hover:text-gray-900 cursor-pointer px-1"
                      >
                        <X size={14} />
                      </button>
                    )}
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
