import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Plus, ChevronRight } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';
import { Project, Script } from '../types/api';
import { Button, Card, Loader, ErrorMessage } from '../components/ui';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newOrientation, setNewOrientation] = useState<'landscape'|'portrait'|'square'>('landscape');

  const fetchData = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const [projData, scriptsData] = await Promise.all([
        projectsApi.get(projectId),
        scriptsApi.listForProject(projectId)
      ]);
      setProject(projData);
      setScripts(scriptsData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load project details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId || !newTitle.trim() || !newText.trim()) return;
    setIsCreating(true);
    try {
      const newScript = await scriptsApi.create(projectId, { 
        title: newTitle, 
        full_text: newText,
        orientation_preference: newOrientation 
      });
      setScripts([...scripts, newScript]);
      setNewTitle('');
      setNewText('');
    } catch (err: any) {
      setError(err.message || 'Failed to create script');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && !project) return <Loader text="Loading project..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-surface-800 space-x-2">
        <Link to="/" className="hover:text-primary-600 transition-colors">Projects</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-surface-900">{project?.name}</span>
      </div>

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-surface-900">{project?.name}</h1>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold border-b border-surface-200 pb-2">Scripts</h2>
          {scripts.length === 0 ? (
            <div className="text-center py-12 text-surface-800 border border-dashed border-surface-200 rounded-lg">
              <FileText className="w-12 h-12 mx-auto text-surface-200 mb-4" />
              <p>No scripts yet. Create one to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map(s => (
                <Link key={s.id} to={`/projects/${projectId}/scripts/${s.id}`} className="block group">
                  <Card className="hover:border-primary-300 hover:shadow-md transition-all flex items-center justify-between">
                    <div>
                      <h3 className="font-bold text-lg group-hover:text-primary-600 transition-colors">{s.title}</h3>
                      <p className="text-sm text-surface-800 line-clamp-1">{s.full_text}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-200 group-hover:text-primary-500" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <Card className="bg-surface-50 sticky top-4">
            <h2 className="font-bold mb-4">Create New Script</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-2 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  disabled={isCreating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Script Text</label>
                <textarea 
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  className="w-full p-2 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px]"
                  disabled={isCreating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Orientation</label>
                <select 
                  value={newOrientation}
                  onChange={e => setNewOrientation(e.target.value as any)}
                  className="w-full p-2 border border-surface-200 rounded-md bg-white"
                  disabled={isCreating}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <Button type="submit" disabled={isCreating || !newTitle.trim() || !newText.trim()} className="w-full flex justify-center items-center gap-2">
                <Plus className="w-4 h-4" /> Create Script
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
