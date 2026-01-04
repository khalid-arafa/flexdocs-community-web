"use client";

import React from 'react'

import {
  deleteProjectByCode,
  getProjectByCode,
  updateProjectByCode,
} from "@/utils/api";
import { useProjectsContext } from "@/context/ProjectsContext";
import { toast } from "react-toastify";
import { useEffect, useState } from "react";
import { Check, Trash } from "lucide-react";
import { useDialogs } from "@/context/DialogsContext";
import { useRouter } from "next/navigation";
import { disconnectSocket } from "@/utils/socket";

function GeneralSettings() {
    const { activeProject, setProjects, setActiveProject } = useProjectsContext();
  const { confirm } = useDialogs();
  const router = useRouter();

  useEffect(() => {
    if (!activeProject) return;    
    const loadProject = async () => {
      const result = await getProjectByCode({
        code: activeProject.code,
      });
      const project = await result.json();
      if (result.ok) {
        setFormData({
          name: project.name,
          isPublic: project.isPublic ?? true,
          description: project.description ?? "",
        });
      } else {
        toast(project.message);
      }
    };
    loadProject();
  }, [activeProject]);



    const [formData, setFormData] = useState({
      name: "",
      isPublic: true,
      description: "",
    });
  
    const handleChange = (e) => {
      const { name, type, checked, value } = e.target;
  
      setFormData({
        ...formData,
        [name]: type === "checkbox" ? checked : value,
      });
    };
  
    const handleSave = async (e) => {
      e.preventDefault();
      try {
        const result = await updateProjectByCode({
          code: activeProject.code,
          data: formData,
        });
        const body = await result.json();
        if (result.ok) {
          toast("Project data changes has been saved successfully!");
        } else {
          toast(body.message);
        }
      } catch (error) {
        console.log(error);
        toast(error.message);
      }
    };
  
    const deleteProject = async (e) => {
      try {
        const confirmed = await confirm({
          msg: "Are you sure you want to delete this project?",
        });
        if (!confirmed) return;
        console.log(activeProject);
        const result = await deleteProjectByCode(activeProject.code);
        const body = await result.json();
        if (result.ok) {
          toast("Project was deleted!");
          setProjects((prev) =>
            prev.filter((i) => i.code !== activeProject.code)
          );
          disconnectSocket(activeProject.code);
          router.push("/projects");
          setActiveProject(null);
        } else {
          toast(body.message);
        }
      } catch (error) {
        console.log(error);
        toast(error.message);
      }
    };
  

  return (
    <>
    <div className="w-full mx-auto p-4 mt-8">
      <form onSubmit={handleSave} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="block text-sm font-medium text-gray-700"
          >
            Project Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            required
            value={formData.name}
            onChange={handleChange}
            placeholder="Project Name"
            className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700"
          >
            Description
          </label>
          <textarea
            id="description"
            name="description"
            rows="4"
            value={formData.description}
            onChange={handleChange}
            className="mt-2 bg-white text-md px-4 py-3 text-black block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          ></textarea>
        </div>

        <div className="flex flex-row-reverse align-center items-center justify-end gap-2">
          <label
            htmlFor="isPublic"
            className="block mt-2 text-md font-medium text-gray-700 select-none cursor-pointer"
          >
            Is Public
          </label>
          <input
            type="checkbox"
            id="isPublic"
            name="isPublic"
            checked={formData.isPublic}
            onChange={handleChange}
            className="mt-2 h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
        </div>

        <div className="flex items-center justify-end space-x-4 pt-4 gap-2">
          <button
            type="button"
            onClick={deleteProject}
            className="inline-flex items-center px-4 py-2 border border-transparent cursor-pointer text-sm font-medium rounded-md shadow-sm text-white bg-red-500 hover:bg-red-600 gap-2"
          >
            <Trash size={22} color="white" />
            Delete Project
          </button>
          <button
            type="Save"
            className="inline-flex items-center px-4 py-2 border border-transparent cursor-pointer text-sm font-medium rounded-md shadow-sm text-white bg-blue-500 hover:bg-blue-600 gap-2"
          >
            <Check size={22} color="white" />
            Save Project
          </button>
        </div>
      </form>
    </div>
    </>
  )
}

export default GeneralSettings