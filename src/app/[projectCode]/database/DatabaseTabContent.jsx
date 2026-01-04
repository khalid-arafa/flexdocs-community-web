"use client";

import { useEffect } from "react";
import { useProjectsContext } from "@/context/ProjectsContext";
import CollectionsBox from "./CollectionsBox";
import DocumentsBox from "./DocumentsBox";
import DocumentBox from "./DocumentBox";
import { useDatabaseContext } from "@/context/DatabaseContext";

const DatabseTabContent = () => {
  const { activeProject } = useProjectsContext();
  const { loadCollections } = useDatabaseContext();

  useEffect(() => {
    if (!activeProject?.code) return;
    loadCollections({ page: 1, projectCode: activeProject.code });
  }, [activeProject]);

  return (
    <div className="bg-gray-100">
      <div className="flex flex-col md:flex-row gap-4 max-w-6xl mx-auto">
        {/* Collections Box */}
        <CollectionsBox />

        {/* Documents Box */}
        <DocumentsBox />

        {/* Document Details Box */}
        <DocumentBox />
      </div>
    </div>
  );
};

export default DatabseTabContent;
