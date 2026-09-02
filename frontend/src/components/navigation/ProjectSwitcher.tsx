import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Project } from '../../types/api';
import { projectsApi } from '../../services/api/projects';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export const ProjectSwitcher = () => {
  const { currentProject } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpen = async () => {
    setIsOpen(!isOpen);
    if (!isOpen && projects.length === 0) {
      setLoading(true);
      try {
        const data = await projectsApi.list(1, 100);
        setProjects(data.items);
      } catch (error) {
        console.error("Failed to load projects", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!currentProject) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-text-secondary hover:text-text-main hover:bg-surface-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className="truncate max-w-37.5 sm:max-w-50">{currentProject.name}</span>
        <ChevronDown className={`w-4 h-4 text-text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface border border-border-main rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 bg-surface-muted border-b border-border-subtle text-xs font-bold text-text-muted uppercase tracking-wider">
            Switch Project
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
              </div>
            ) : projects.length === 0 ? (
              <div className="px-4 py-3 text-sm text-text-muted text-center">
                No projects found.
              </div>
            ) : (
              projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/projects/${project.id}`);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-muted transition-colors ${
                    project.id === currentProject.id 
                      ? 'text-primary-600 font-semibold bg-primary-500/10' 
                      : 'text-text-secondary font-medium'
                  }`}
                >
                  <span className="block truncate">{project.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
