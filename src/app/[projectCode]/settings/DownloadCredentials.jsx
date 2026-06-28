import React from 'react'
import { useProjectsContext } from '@/context/ProjectsContext';
import Button from '@/components/Button';

function DownloadCredentials() {
  const { activeProject } = useProjectsContext();

  const downloadCreds = () => {
    // Export only the fields a client actually needs — don't dump the entire
    // project object (which may carry server-managed/internal fields) to disk.
    const creds = {
      name: activeProject?.name,
      code: activeProject?.code,
      projectId: activeProject?.projectId,
      projectToken: activeProject?.projectToken,
      url: activeProject?.url,
      isPublic: activeProject?.isPublic,
    };
    const blob = new Blob([JSON.stringify(creds, null, 2)], {
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