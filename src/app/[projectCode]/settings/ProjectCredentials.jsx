"use client"

import React, { useEffect, useState } from 'react';
import { Download, Trash2, Key, Loader } from 'lucide-react';
import { useDialogs } from '@/context/DialogsContext';
import { useProjectsContext } from '@/context/ProjectsContext';
import { showDialog } from '@/components/CustomDialog';
import AddEditCreds from './AddEditCreds';
import { toast } from 'react-toastify';
import { deleteProjectCreds, getProjectCreds } from '@/utils/api';

function ProjectCredentials() {
  const { confirm } = useDialogs();
  const {activeProject} = useProjectsContext();
  
  const [creds, setCreds] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const handleDownload = (cred) => {
    const credentials = {
      name: cred.name,
      description: cred.description,
      baseUrl: cred.creds?.url || '',
      projectName: cred.creds?.name || '',
      projectCode: cred.creds?.code || '',
      projectToken: cred.creds?.projectToken || '',
      createdAt: cred.createdAt,
      downloadedAt: new Date().toISOString()
    };

    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(credentials, null, 2)], { type: 'application/json' });
    element.href = URL.createObjectURL(file);
    element.download = `${cred.creds?.code || 'project'}-credentials.json`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleDelete = async (cred) => {
    const confirmed = await confirm({
      msg: `Are you sure you want to delete "${cred.name}"? This action cannot be undone.`,
    });
    
    if (!confirmed) return;
    try {
      const result = await deleteProjectCreds({code: activeProject.code, id: cred._id});
      const body = await result.json();
      if(body.success) {
        setCreds(prev => prev.filter(i => i._id != cred._id));
      }
    } catch (error) {
      console.log(error);      
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
 
  useEffect(() => {
    if(activeProject == null || activeProject.code == null) return;    
    const load = async () => {
      setIsLoading(true);
      const result = await getProjectCreds({code: activeProject.code});
      const body = await result.json();
      setCreds(body);
      setIsLoading(false);
    };
    load();
  }, [activeProject, setIsLoading]);

  return (
    <div className="max-w-4xl py-6 min-h-screen">
      <div className="mb-8 flex flex-row">
        <div className="flex flex-col flex-1">
          <h1 className="text-3xl font-bold text-slate-800 mb-2 flex items-center gap-3">
            <Key className="text-blue-600" size={32} />
            Project Credentials
          </h1>
          <p className="text-slate-600">Manage your API keys and access tokens</p>
        </div>
        <button
          onClick={() => {
            showDialog({
              content: AddEditCreds,
              params: {                      
                activeProject,
                toast,
                onSuccess: (newCred) => setCreds(prev => [...prev, newCred]),
              },
            });
          }}
          className="flex items-center gap-2 px-4 py-0 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
        >
          Generate Creds
        </button>
      </div>

      {isLoading && <div className="flex justify-center items-center p-8">
        <Loader className="w-6 h-6 animate-spin text-gray-800" />
      </div>}

      {creds &&  creds.length > 0 &&
        <div className="space-y-4">
          {creds.map((cred) => (
            <div
              key={cred._id}
              className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 border border-slate-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-slate-800 mb-2">
                      {cred.name}
                    </h3>
                    <p className="text-sm text-slate-500">
                      Created: {formatDate(cred.createdAt)}
                    </p>
                  </div>

                  <div className="flex gap-3 lg:flex-shrink-0">
                    <button
                      onClick={() => handleDownload(cred)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                    >
                      <Download size={16} />
                      Download
                    </button>
                    
                    <button
                      onClick={() => handleDelete(cred)}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 cursor-pointer"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      }

      {creds.length === 0 && (
        <div className="text-center py-16">
          <Key size={64} className="mx-auto text-slate-300 mb-4" />
          <h3 className="text-xl font-semibold text-slate-600 mb-2">
            No credentials found
          </h3>
          <p className="text-slate-500">
            Create your first API key to get started
          </p>
        </div>
      )}
    </div>
  );
}

export default ProjectCredentials;