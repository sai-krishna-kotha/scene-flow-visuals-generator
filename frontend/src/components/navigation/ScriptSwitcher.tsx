import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Loader2 } from 'lucide-react';
import { Script } from '../../types/api';
import { scriptsApi } from '../../services/api/scripts';
import { useWorkspace } from '../../contexts/WorkspaceContext';

export const ScriptSwitcher = () => {
  const { currentProject, currentScript } = useWorkspace();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [scripts, setScripts] = useState<Script[]>([]);
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
    if (!isOpen && currentProject && scripts.length === 0) {
      setLoading(true);
      try {
        const data = await scriptsApi.listForProject(currentProject.id, 1, 100);
        setScripts(data.items);
      } catch (error) {
        console.error("Failed to load scripts", error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (!currentScript || !currentProject) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button 
        onClick={handleOpen}
        className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-surface-700 hover:text-surface-900 hover:bg-surface-100 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
      >
        <span className="truncate max-w-37.5 sm:max-w-50">{currentScript.title}</span>
        <ChevronDown className={`w-4 h-4 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-surface-200 rounded-lg shadow-lg overflow-hidden z-50">
          <div className="px-3 py-2 bg-surface-50 border-b border-surface-100 text-xs font-bold text-surface-500 uppercase tracking-wider">
            Switch Script
          </div>
          <div className="max-h-64 overflow-y-auto py-1">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-surface-300" />
              </div>
            ) : scripts.length === 0 ? (
              <div className="px-4 py-3 text-sm text-surface-500 text-center">
                No scripts found.
              </div>
            ) : (
              scripts.map(script => (
                <button
                  key={script.id}
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`/projects/${currentProject.id}/scripts/${script.id}`);
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-surface-50 transition-colors ${
                    script.id === currentScript.id 
                      ? 'text-primary-700 font-semibold bg-primary-50/50' 
                      : 'text-surface-700 font-medium'
                  }`}
                >
                  <span className="block truncate">{script.title}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
