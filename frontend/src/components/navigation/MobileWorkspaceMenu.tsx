import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Menu, X, Loader2, LayoutDashboard, ChevronDown } from 'lucide-react';
import { Project, Script } from '../../types/api';
import { projectsApi } from '../../services/api/projects';
import { scriptsApi } from '../../services/api/scripts';
import { useWorkspace } from '../../contexts/WorkspaceContext';
import { ThemeToggle } from '../ui/ThemeToggle';

type ExpandedSection = 'project' | 'script' | null;

export const MobileWorkspaceMenu = () => {
  const { currentProject, currentScript } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingScripts, setLoadingScripts] = useState(false);
  const [expandedSection, setExpandedSection] = useState<ExpandedSection>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setIsOpen(false);
    setExpandedSection(null);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, close]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, close]);

  // Load data when expanding sections
  const toggleSection = async (section: ExpandedSection) => {
    if (expandedSection === section) {
      setExpandedSection(null);
      return;
    }
    setExpandedSection(section);

    if (section === 'project' && projects.length === 0) {
      setLoadingProjects(true);
      try {
        const data = await projectsApi.list(1, 100);
        setProjects(data.items);
      } catch (err) {
        console.error("Failed to load projects", err);
      } finally {
        setLoadingProjects(false);
      }
    }

    if (section === 'script' && currentProject && scripts.length === 0) {
      setLoadingScripts(true);
      try {
        const data = await scriptsApi.listForProject(currentProject.id, 1, 100);
        setScripts(data.items);
      } catch (err) {
        console.error("Failed to load scripts", err);
      } finally {
        setLoadingScripts(false);
      }
    }
  };

  // Reset scripts if project changes
  useEffect(() => {
    setScripts([]);
  }, [currentProject]);

  return (
    <div className="md:hidden relative" ref={menuRef}>
      {/* Hamburger / X toggle — same DOM position, same visual footprint */}
      <button
        onClick={() => isOpen ? close() : setIsOpen(true)}
        className="flex items-center justify-center w-10 h-10 text-text-secondary hover:text-text-main hover:bg-surface-muted rounded-lg transition-colors"
        aria-label={isOpen ? 'Close Workspace Menu' : 'Open Workspace Menu'}
        aria-expanded={isOpen}
        data-testid="mobile-menu-toggle"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Dropdown panel — attached to the header, not a full-screen takeover */}
      <div
        className={`absolute right-0 top-full mt-2 w-72 max-w-[calc(100vw-2rem)] bg-surface border border-border-main rounded-xl shadow-xl z-50 overflow-hidden transition-all duration-200 origin-top-right ${
          isOpen
            ? 'opacity-100 scale-100 pointer-events-auto'
            : 'opacity-0 scale-95 pointer-events-none'
        }`}
        role="menu"
        data-testid="mobile-menu-panel"
      >
        {/* Project Section */}
        <div className="border-b border-border-subtle">
          <button
            onClick={() => toggleSection('project')}
            className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-text-main hover:bg-surface-muted transition-colors"
            data-testid="mobile-menu-project-toggle"
          >
            <span className="flex items-center gap-2">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Project</span>
              {currentProject && (
                <span className="text-text-secondary font-medium truncate max-w-[140px]">
                  — {currentProject.name}
                </span>
              )}
            </span>
            <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expandedSection === 'project' ? 'rotate-180' : ''}`} />
          </button>

          {expandedSection === 'project' && (
            <div className="px-2 pb-2 max-h-48 overflow-y-auto" data-testid="mobile-menu-project-list">
              {loadingProjects ? (
                <div className="flex items-center justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                </div>
              ) : projects.length === 0 ? (
                <div className="px-2 py-2 text-sm text-text-muted italic">No projects available.</div>
              ) : (
                projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      close();
                      navigate(`/projects/${p.id}`);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                      p.id === currentProject?.id
                        ? 'bg-primary-500/10 text-primary-600 font-semibold'
                        : 'text-text-secondary hover:bg-surface-muted font-medium'
                    }`}
                  >
                    <span className="block truncate">{p.name}</span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Script Section — only when a project is active */}
        {currentProject && (
          <div className="border-b border-border-subtle">
            <button
              onClick={() => toggleSection('script')}
              className="flex items-center justify-between w-full px-4 py-3 text-sm font-semibold text-text-main hover:bg-surface-muted transition-colors"
              data-testid="mobile-menu-script-toggle"
            >
              <span className="flex items-center gap-2">
                <span className="text-xs font-bold text-text-muted uppercase tracking-wider">Script</span>
                {currentScript && (
                  <span className="text-text-secondary font-medium truncate max-w-[140px]">
                    — {currentScript.title}
                  </span>
                )}
              </span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-200 ${expandedSection === 'script' ? 'rotate-180' : ''}`} />
            </button>

            {expandedSection === 'script' && (
              <div className="px-2 pb-2 max-h-48 overflow-y-auto" data-testid="mobile-menu-script-list">
                {loadingScripts ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-text-muted" />
                  </div>
                ) : scripts.length === 0 ? (
                  <div className="px-2 py-2 text-sm text-text-muted italic">No scripts in this project.</div>
                ) : (
                  scripts.map(s => (
                    <button
                      key={s.id}
                      onClick={() => {
                        close();
                        navigate(`/projects/${currentProject.id}/scripts/${s.id}`);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        s.id === currentScript?.id
                          ? 'bg-primary-500/10 text-primary-600 font-semibold'
                          : 'text-text-secondary hover:bg-surface-muted font-medium'
                      }`}
                    >
                      <span className="block truncate">{s.title}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Navigation + Theme */}
        <div className="px-2 py-2">
          <Link
            to="/"
            onClick={close}
            className="flex items-center gap-2 px-3 py-2.5 rounded-md text-sm font-medium text-text-secondary hover:bg-surface-muted transition-colors"
            data-testid="mobile-menu-dashboard-link"
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
          <div className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-text-secondary">
            <span>Theme</span>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </div>
  );
};
