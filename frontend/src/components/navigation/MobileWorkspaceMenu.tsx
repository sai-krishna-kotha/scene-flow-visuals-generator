import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X, Loader2, LayoutDashboard } from 'lucide-react';
import { Project, Script } from '../../types/api';
import { projectsApi } from '../../services/api/projects';
import { scriptsApi } from '../../services/api/scripts';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export const MobileWorkspaceMenu = () => {
  const { currentProject, currentScript } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Load projects if empty
      if (projects.length === 0) {
        setLoadingProjects(true);
        projectsApi.list(1, 100)
          .then(res => setProjects(res.items))
          .catch(err => console.error(err))
          .finally(() => setLoadingProjects(false));
      }
      
      // Load scripts for current project if empty
      if (currentProject && scripts.length === 0) {
        setLoadingScripts(true);
        scriptsApi.listForProject(currentProject.id, 1, 100)
          .then(res => setScripts(res.items))
          .catch(err => console.error(err))
          .finally(() => setLoadingScripts(false));
      }
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, currentProject, projects.length, scripts.length]);

  // Reset scripts if project changes while menu is closed
  useEffect(() => {
    if (!isOpen) {
      setScripts([]);
    }
  }, [currentProject, isOpen]);

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 p-2 text-text-secondary hover:text-text-main bg-surface-muted hover:bg-border-subtle rounded-md transition-colors"
        aria-label="Open Workspace Menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-surface animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-border-subtle bg-surface shrink-0">
            <h2 className="text-lg font-bold text-text-main">Workspace</h2>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 -mr-2 text-text-muted hover:text-text-secondary hover:bg-surface-muted rounded-full transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 border-b border-border-subtle pb-2">
                Project
              </h3>
              {loadingProjects ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                </div>
              ) : projects.length === 0 ? (
                <div className="py-2 text-sm text-text-muted italic">No projects available.</div>
              ) : (
                <div className="flex flex-col gap-1 mt-2">
                  {projects.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setIsOpen(false);
                        navigate(`/projects/${p.id}`);
                      }}
                      className={`text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                        p.id === currentProject?.id
                          ? 'bg-primary-500/10 text-primary-600 font-semibold'
                          : 'text-text-secondary hover:bg-surface-muted font-medium'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {currentProject && (
              <div>
                <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 border-b border-border-subtle pb-2">
                  Script
                </h3>
                {loadingScripts ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-text-muted" />
                  </div>
                ) : scripts.length === 0 ? (
                  <div className="py-2 text-sm text-text-muted italic">No scripts in this project.</div>
                ) : (
                  <div className="flex flex-col gap-1 mt-2">
                    {scripts.map(s => (
                      <button
                        key={s.id}
                        onClick={() => {
                          setIsOpen(false);
                          navigate(`/projects/${currentProject.id}/scripts/${s.id}`);
                        }}
                        className={`text-left px-3 py-2.5 rounded-md text-sm transition-colors ${
                          s.id === currentScript?.id
                            ? 'bg-primary-500/10 text-primary-600 font-semibold'
                            : 'text-text-secondary hover:bg-surface-muted font-medium'
                        }`}
                      >
                        {s.title}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div>
              <h3 className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2 border-b border-border-subtle pb-2">
                Navigation
              </h3>
              <div className="mt-2">
                <Link
                  to="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
