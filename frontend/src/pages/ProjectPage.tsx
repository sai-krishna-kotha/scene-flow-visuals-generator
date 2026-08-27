import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Plus, ChevronRight } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';
import { Project, Script } from '../types/api';
import { Button, Card, Loader, ErrorMessage, Breadcrumbs, Badge } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle('Project');
  
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
    <div className="space-y-8 max-w-5xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Projects', href: '/' },
        { label: project?.name || 'Project' }
      ]} />

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-surface-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">{project?.name}</h1>
          <p className="text-surface-500 mt-2">Manage your scripts and storyboard scenes.</p>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-surface-900">Scripts</h2>
            <Badge variant="outline">{scripts.length} Total</Badge>
          </div>
          
          {scripts.length === 0 ? (
            <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500">
              <FileText className="w-12 h-12 mx-auto text-surface-300 mb-4" />
              <p className="text-lg font-medium text-surface-700">No scripts yet</p>
              <p className="mt-1">Create a new script to begin generating visual assets.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scripts.map(s => (
                <Link key={s.id} to={`/projects/${projectId}/scripts/${s.id}`} className="block group">
                  <div className="bg-white border border-surface-200 rounded-xl p-5 hover:border-primary-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-lg text-surface-900 group-hover:text-primary-600 transition-colors truncate">{s.title}</h3>
                      <p className="text-sm text-surface-500 mt-1 line-clamp-2">{s.full_text}</p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <Badge variant="default" className="capitalize">{s.orientation_preference}</Badge>
                      <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-primary-500 transition-colors" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-surface-900 mb-4">Create New Script</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Title</label>
                <input 
                  type="text" 
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  placeholder="e.g. Scene 1 - Intro"
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm"
                  disabled={isCreating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Script Text</label>
                <textarea 
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Enter the full text for this script..."
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-[120px] resize-y"
                  disabled={isCreating}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Orientation</label>
                <select 
                  value={newOrientation}
                  onChange={e => setNewOrientation(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm"
                  disabled={isCreating}
                >
                  <option value="landscape">Landscape</option>
                  <option value="portrait">Portrait</option>
                  <option value="square">Square</option>
                </select>
              </div>
              <Button type="submit" isLoading={isCreating} disabled={!newTitle.trim() || !newText.trim()} className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" /> Create Script
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
