import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectPage } from '../pages/ProjectPage';
import { ScriptPage } from '../pages/ScriptPage';
import { ScenePage } from '../pages/ScenePage';
import { JobPollingPage } from '../pages/JobPollingPage';
import { JobResultsPage } from '../pages/JobResultsPage';

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-surface-900 text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary-500" />
          <Link to="/" className="text-xl font-bold tracking-tight">AI Storyboard</Link>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        <Outlet />
      </main>
      <footer className="bg-surface-100 text-surface-800 text-center p-4 text-sm mt-auto border-t border-surface-200">
        &copy; 2026 AI Storyboard Intelligence Platform
      </footer>
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
