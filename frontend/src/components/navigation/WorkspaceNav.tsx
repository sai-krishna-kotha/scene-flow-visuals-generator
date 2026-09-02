import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ProjectSwitcher } from './ProjectSwitcher';
import { ScriptSwitcher } from './ScriptSwitcher';
import { MobileWorkspaceMenu } from './MobileWorkspaceMenu';
import { useWorkspace } from '../../contexts/WorkspaceContext';

const Logo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-600 mr-2">
    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
    <line x1="7" y1="2" x2="7" y2="22"></line>
    <line x1="17" y1="2" x2="17" y2="22"></line>
    <line x1="2" y1="12" x2="22" y2="12"></line>
    <line x1="2" y1="7" x2="7" y2="7"></line>
    <line x1="2" y1="17" x2="7" y2="17"></line>
    <line x1="17" y1="17" x2="22" y2="17"></line>
    <line x1="17" y1="7" x2="22" y2="7"></line>
    <path d="M12 7l1 2.5L15.5 10.5L13 11.5L12 14l-1-2.5L8.5 10.5L11 9.5L12 7z" fill="currentColor" stroke="none"></path>
  </svg>
);

export const WorkspaceNav = () => {
  const { currentProject, currentScript } = useWorkspace();
  const location = useLocation();
  const isDashboard = location.pathname === '/';

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-surface-200 flex items-center px-4 md:px-8 shadow-sm z-10 sticky top-0">
      <div className="flex items-center shrink-0">
        <Link to="/" className="flex items-center">
          <Logo />
          <span className="text-base sm:text-lg font-bold text-surface-900 tracking-tight">SceneFlow</span>
        </Link>
      </div>
      
      {/* Desktop Workspace Selectors */}
      <div className="hidden md:flex items-center ml-8 gap-2 border-l border-surface-200 pl-8">
        {!isDashboard && currentProject && (
          <>
            <ProjectSwitcher />
            {currentScript && (
              <>
                <span className="text-surface-300">/</span>
                <ScriptSwitcher />
              </>
            )}
          </>
        )}
      </div>
      
      {/* Desktop Dashboard Link (always visible on desktop on right side or next to selectors) */}
      <div className="hidden md:flex ml-auto items-center">
        <Link 
          to="/" 
          className={`text-sm font-medium transition-colors ${isDashboard ? 'text-primary-600' : 'text-surface-600 hover:text-surface-900'}`}
        >
          Dashboard
        </Link>
      </div>

      {/* Mobile Workspace Menu */}
      <div className="md:hidden ml-auto flex items-center">
        <MobileWorkspaceMenu />
      </div>
    </header>
  );
};
