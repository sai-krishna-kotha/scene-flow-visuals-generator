import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectPage } from '../pages/ProjectPage';
import { ScriptPage } from '../pages/ScriptPage';
import { ScenePage } from '../pages/ScenePage';
import { JobPollingPage } from '../pages/JobPollingPage';
import { JobResultsPage } from '../pages/JobResultsPage';

import { useLocation } from 'react-router-dom';

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

const Header = () => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  return (
    <header className="h-14 sm:h-16 bg-white border-b border-surface-200 flex items-center px-4 md:px-8 shadow-sm z-10 sticky top-0">
      <Link to="/" className="flex items-center shrink-0 mr-4 sm:mr-8">
        <Logo />
        <span className="text-base sm:text-lg font-bold text-surface-900 tracking-tight hidden xs:inline-block sm:inline-block">SceneFlow</span>
      </Link>
      
      <nav className="flex space-x-4 sm:space-x-6 overflow-x-auto no-scrollbar">
        <Link 
          to="/" 
          className={`text-sm font-medium transition-colors whitespace-nowrap ${isActive('/') && location.pathname === '/' ? 'text-primary-600 border-b-2 border-primary-600 py-4 sm:py-5' : 'text-surface-600 hover:text-surface-900 py-4 sm:py-5'}`}
        >
          Dashboard
        </Link>
        <Link 
          to="/projects" 
          className={`text-sm font-medium transition-colors whitespace-nowrap ${(isActive('/projects') || (location.pathname !== '/' && !location.pathname.startsWith('/jobs'))) ? 'text-primary-600 border-b-2 border-primary-600 py-4 sm:py-5' : 'text-surface-600 hover:text-surface-900 py-4 sm:py-5'}`}
        >
          Projects
        </Link>
      </nav>
      
      <div className="ml-auto flex items-center">
        {/* Placeholder for future auth/user menu */}
      </div>
    </header>
  );
};

const Layout = () => {
  return (
    <div className="flex flex-col min-h-screen bg-surface-50 font-sans">
      <Header />
      <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
        <Outlet />
      </main>
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'projects/:projectId', element: <ProjectPage /> },
      { path: 'projects/:projectId/scripts/:scriptId', element: <ScriptPage /> },
      { path: 'scenes/:sceneId', element: <ScenePage /> },
      { path: 'jobs/:jobId', element: <JobPollingPage /> },
      { path: 'jobs/:jobId/results', element: <JobResultsPage /> },
      { path: '*', element: <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1><p className="text-surface-800">The requested page does not exist.</p></div> }
    ]
  }
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
