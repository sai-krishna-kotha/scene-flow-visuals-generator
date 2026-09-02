import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Project, Script } from '../types/api';

interface WorkspaceContextType {
  currentProject: Project | null;
  currentScript: Script | null;
  setContext: (project: Project | null, script: Script | null) => void;
  clearContext: () => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentScript, setCurrentScript] = useState<Script | null>(null);

  const setContext = (project: Project | null, script: Script | null) => {
    setCurrentProject(project);
    setCurrentScript(script);
  };

  const clearContext = () => {
    setCurrentProject(null);
    setCurrentScript(null);
  };

  return (
    <WorkspaceContext.Provider value={{ currentProject, currentScript, setContext, clearContext }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};
