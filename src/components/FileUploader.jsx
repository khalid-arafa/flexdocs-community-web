"use client";

// components/FileUpload/FileUploader.js
import { useState, useEffect, useCallback } from "react";
import { X, CheckCircle, AlertCircle, File } from "lucide-react";
import { useProjectsContext } from "@/context/ProjectsContext";
import { getSocket } from "@/utils/socket";
import { useStorageContext } from "@/context/StorageContext";

export default function FileUploader() {
  const [files, setFiles] = useState([]);
  // const [isDone, setIsDone] = useState(false);

  const { activeProject } = useProjectsContext();

  const { uploadFiles, setUploadFiles, showUploader, setShowUploader } =
    useStorageContext();

  const uploadFile = useCallback(
    (fileObj) => {
      setFiles((prev) => [...prev, { file: fileObj.file }]);
      
      const updateFileStatus = (updates) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.file.name === fileObj.file.name
              ? { file: fileObj.file, ...updates }
              : f
          )
        );
      };

      // Start upload process
      getSocket(activeProject.projectToken).emit("upload:start", {
        name: fileObj.file.name,
        size: fileObj.file.size,
        type: fileObj.file.type,
        bucket: fileObj.bucketId,
      });

      // Listen for ready event
      getSocket(activeProject.projectToken).once("upload:ready", () => {
        updateFileStatus({ status: "uploading", progress: 0 });

        // Read and send the file in chunks
        const chunkSize = 64 * 1024; // 64KB chunks
        let offset = 0;

        const readAndUploadChunk = () => {
          const reader = new FileReader();
          const blob = fileObj.file.slice(offset, offset + chunkSize);

          reader.onload = (e) => {
            if (e.target.error) {
              updateFileStatus({
                status: "error",
                error: "Failed to read file",
              });
              return;
            }
            getSocket(activeProject.projectToken).emit(
              "upload:chunk",
              new Uint8Array(e.target.result)
            );
          };

          reader.readAsArrayBuffer(blob);
        };

        // Listen for progress updates
        getSocket(activeProject.projectToken).on("upload:progress", (data) => {
          if (data.name === fileObj.file.name && data.received) {
            offset += chunkSize;
            const progress = Math.min(
              100,
              Math.floor((offset / fileObj.file.size) * 100)
            );
            updateFileStatus({ progress });

            if (offset < fileObj.file.size) {
              readAndUploadChunk();
            } else {
              getSocket(activeProject.projectToken).emit("upload:done");
            }
          }
        });

        // Listen for completion
        getSocket(activeProject.projectToken).once(
          "upload:complete",
          (data) => {
            if (data.name === fileObj.file.name) {
              updateFileStatus({
                status: "complete",
                progress: 100,
                url: data.url,
              });
              getSocket(activeProject.projectToken).off("upload:progress");
            }
          }
        );

        // Listen for errors
        getSocket(activeProject.projectToken).once("upload:error", (error) => {
          updateFileStatus({ status: "error", error });
          getSocket(activeProject.projectToken).off("upload:progress");
        });

        // Start the first chunk
        readAndUploadChunk();
      });
    },
    [activeProject]
  );

  function removeFile(name) {
    setFiles((prev) => prev.filter((i) => i.file.name != name));
    setUploadFiles((prev) => prev.filter((i) => i.file.name != name));
  }

  useEffect(() => {
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i];
      uploadFile(file);
    }
  }, [uploadFiles]);

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
              {uploadFiles.some((file) => file.status === "complete") && (
                <button
                  onClick={clearCompleted}
                  className="text-gray-500 hover:text-gray-700"
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
                      className={`h-1.5 rounded-full ${
                        fileObj.status === "error"
                          ? "bg-red-500"
                          : fileObj.status === "complete"
                          ? "bg-green-500"
                          : "bg-blue-500"
                      }`}
                      style={{ width: `${fileObj.progress}%` }}
                    />
                  </div>

                  {/* Status */}
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs text-gray-500">
                      {fileObj.status === "preparing" && "Preparing..."}
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
