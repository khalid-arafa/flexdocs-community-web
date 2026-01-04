import React from 'react'
import { useProjectsContext } from '@/context/ProjectsContext';

function DownloadCredentials() {
  const { activeProject } = useProjectsContext();

  const downloadCreds = () => {
    const blob = new Blob([JSON.stringify(activeProject, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeProject.code}-credentials.json`;
    a.click();
  };

  return (
    <div className="flex flex-row">
      <button
        type="button"
        className="px-4 py-2 rounded-md bg-white cursor-pointer"
        onClick={(e) => downloadCreds()}
      >
        <span className="text-black underline">
          Download Project Credentials
        </span>
      </button>
    </div>
  );
}

export default DownloadCredentials