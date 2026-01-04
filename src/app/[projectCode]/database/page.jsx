"use client";

import JsonEditor from "@/components/JsonEditor";
import Tabs from "@/components/Tabs";
import { useEffect, useState } from "react";
import DatabseTabContent from "./DatabaseTabContent";
import { loadDbRules, saveDbRules } from "@/utils/api";
import { useProjectsContext } from "@/context/ProjectsContext";
import { toast, ToastContainer } from "react-toastify";

export default function page() {
  const [rules, setRules] = useState();

  const { activeProject } = useProjectsContext();

  const onSaveRules = async (newRules) => {    
    setRules(newRules);
    try {
      const result = await saveDbRules({
        code: activeProject.code,
        rules: JSON.parse(newRules),
      });
      const body = await result.json();      
      if (result.ok) {
        toast("Rules changs has been saved successfully!");
      } else {
        toast(body.message);
      }
    } catch (error) {
      console.log(error);
      toast(error.message);
    }
  };

  const tabs = [
    {
      label: "Documents",
      content: <DatabseTabContent />,
    },
    {
      label: "Rules",
      content: (
        <JsonEditor
          onSave={(newRules) => onSaveRules(newRules)}
          jsonData={rules}
          height="600px"
        />
      ),
    },
  ];

  useEffect(() => {
    if (!activeProject) return;
    const loadRules = async () => {
      try {
        const result = await loadDbRules({
          code: activeProject.code,
        });
        const body = await result.json();        
        if (result.ok) {
          setRules(JSON.stringify(body, null, 2));
        }
      } catch (error) {
        console.log(error);
      }
    };
    loadRules();
  }, [activeProject]);

  return (
    <div className="w-full max-w-6xl mx-auto p-4">
      <Tabs tabs={tabs} />
      <ToastContainer />
    </div>
  );
}
