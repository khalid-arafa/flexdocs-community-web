import React from 'react'
import { useProjectsContext } from '@/context/ProjectsContext';
import Button from '@/components/Button';

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
      <Button
        onClick={(e) => downloadCreds()}
        className="max-w-fit"
      >
        Download Project Credentials
      </Button>
    </div>
  );
}

export default DownloadCredentials