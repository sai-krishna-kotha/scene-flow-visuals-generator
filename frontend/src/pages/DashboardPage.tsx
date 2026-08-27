import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { Project } from '../types/api';
import { Button, Card, Loader, ErrorMessage } from '../components/ui';

export const DashboardPage = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');

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

  if (loading && projects.length === 0) return <Loader text="Loading projects..." />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-surface-900">Projects</h1>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchProjects} />}

      <Card className="bg-surface-50 border-dashed">
        <form onSubmit={handleCreate} className="flex gap-4">
          <input 
            type="text" 
            value={newProjectName}
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="New Project Name" 
            className="flex-1 p-2 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            disabled={isCreating}
          />
          <Button type="submit" disabled={isCreating || !newProjectName.trim()} className="flex items-center gap-2">
            <Plus className="w-4 h-4" /> Create Project
          </Button>
        </form>
      </Card>

      {projects.length === 0 && !loading ? (
        <div className="text-center py-12 text-surface-800">
          <Folder className="w-12 h-12 mx-auto text-surface-200 mb-4" />
          <p>No projects found. Create one to get started.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(p => (
            <Link key={p.id} to={`/projects/${p.id}`} className="block group">
              <Card className="h-full hover:border-primary-300 hover:shadow-md transition-all">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-lg text-surface-900 group-hover:text-primary-600 transition-colors">{p.name}</h3>
                    <p className="text-sm text-surface-800 mt-1">
                      Updated {new Date(p.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Folder className="w-5 h-5 text-surface-200" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};
