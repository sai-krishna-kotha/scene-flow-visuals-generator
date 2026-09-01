import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { Project } from '../types/api';
import { Button, Loader, ErrorMessage } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { MoreMenu, MoreMenuItem } from '../components/ui/MoreMenu';
import { DeleteConfirmationDialog } from '../components/ui/DeleteConfirmationDialog';

export const DashboardPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Delete state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useDocumentTitle('Dashboard');

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const data = await projectsApi.list();
      setProjects(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setIsCreating(true);
    try {
      const newProj = await projectsApi.create({ name: newProjectName, description: '' });
      setProjects([newProj, ...projects]);
      setNewProjectName('');
    } catch (err: any) {
      setError(err.message || 'Failed to create project');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectToDelete.id);
      setProjects(projects.filter(p => p.id !== projectToDelete.id));
      setProjectToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Unable to delete this project.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && projects.length === 0) return <Loader text="Loading projects..." />;

  return (
    <div className="space-y-8 w-full">
      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-surface-200 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold text-surface-900 tracking-tight mb-2">SceneFlow</h1>
          <h2 className="text-2xl font-bold text-surface-700 tracking-tight mb-3">AI Storyboard Intelligence</h2>
          <p className="text-surface-500 text-lg">Turn scripts into intelligently ranked visual assets.</p>
        </div>
        
        <div className="w-full md:w-auto bg-white p-4 rounded-xl border border-surface-200 shadow-sm shrink-0">
          <h3 className="text-sm font-bold text-surface-900 mb-2">Create New Project</h3>
          <form onSubmit={handleCreate} className="flex gap-2">
            <input 
              type="text" 
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              placeholder="Project Name..." 
              className="w-full md:w-48 px-3 py-2 text-sm bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors"
              disabled={isCreating}
            />
            <Button type="submit" isLoading={isCreating} disabled={!newProjectName.trim()} size="sm">
              <Plus className="w-4 h-4 mr-1" /> Create
            </Button>
          </form>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      <div>
        <h2 className="text-xl font-bold text-surface-900 mb-4">Recent Projects</h2>
        {projects.length === 0 && !loading ? (
          <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500">
            <Folder className="w-12 h-12 mx-auto text-surface-300 mb-4" />
            <p className="text-lg font-medium text-surface-700">No projects yet</p>
            <p className="mt-1">Create your first storyboard project and start turning scenes into visual assets.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(p => (
              <div key={p.id} className="relative group block bg-white border border-surface-200 rounded-xl hover:border-primary-400 hover:shadow-md transition-all h-full">
                <Link to={`/projects/${p.id}`} className="p-5 h-full flex flex-col justify-between">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-bold text-lg text-surface-900 group-hover:text-primary-600 transition-colors line-clamp-2 leading-snug pr-8">
                      {p.name}
                    </h3>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-surface-500 font-medium">
                      Updated {new Date(p.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                    <Folder className="w-5 h-5 text-surface-300 shrink-0 group-hover:text-primary-400 transition-colors" />
                  </div>
                </Link>
                <div className="absolute top-3 right-3">
                  <MoreMenu>
                    <MoreMenuItem destructive onClick={() => setProjectToDelete(p)}>
                      Delete Project
                    </MoreMenuItem>
                  </MoreMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        onConfirm={handleDeleteProject}
        title="Delete Project"
        itemName={projectToDelete?.name || ''}
        isDeleting={isDeleting}
        warnings={[
          'all scripts in this project',
          'all scenes',
          'visual search history',
          'stored visual results'
        ]}
        deleteButtonText="Delete Permanently"
      />
    </div>
  );
};
