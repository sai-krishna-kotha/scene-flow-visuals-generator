import React from 'react';
import { createBrowserRouter, RouterProvider, Outlet, Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import { DashboardPage } from '../pages/DashboardPage';
import { ProjectPage } from '../pages/ProjectPage';
import { ScriptPage } from '../pages/ScriptPage';
import { ScenePage } from '../pages/ScenePage';
import { JobPollingPage } from '../pages/JobPollingPage';
import { JobResultsPage } from '../pages/JobResultsPage';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { WorkspaceNav } from '../components/navigation/WorkspaceNav';

const Layout = () => {
  return (
    <WorkspaceProvider>
      <div className="flex flex-col min-h-screen bg-surface-muted font-sans">
        <WorkspaceNav />
        <main className="flex-1 overflow-y-auto p-4 md:p-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>
    </WorkspaceProvider>
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
      { path: '*', element: <div className="p-8 text-center"><h1 className="text-2xl font-bold">404 Not Found</h1><p className="text-text-secondary">The requested page does not exist.</p></div> }
    ]
  }
]);

export const AppRouter = () => {
  return <RouterProvider router={router} />;
};
