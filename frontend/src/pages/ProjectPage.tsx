import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FileText, Plus, ChevronRight } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';
import { Project, Script } from '../types/api';
import { Button, Card, Loader, ErrorMessage, Breadcrumbs, Badge, Modal } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [project, setProject] = useState<Project | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(project ? `SceneFlow — ${project.name}` : 'SceneFlow — Project');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
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
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create script');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && !project) return <Loader text="Loading project..." />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <Breadcrumbs items={[
        { label: 'Projects', href: '/' },
        { label: project?.name || 'Project' }
      ]} />

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-surface-200 pb-8">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">{project?.name}</h1>
          <p className="text-surface-500 mt-2 text-lg">
            {project?.description || 'Build scripts, break them into scenes, and turn them into visual storyboards.'}
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="shrink-0">
          <Plus className="w-4 h-4 mr-2" /> New Script
        </Button>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-900">Scripts</h2>
          {scripts.length > 0 && <span className="text-sm font-medium text-surface-500">{scripts.length} Total</span>}
        </div>
        
        {scripts.length === 0 ? (
          <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500 max-w-2xl mx-auto">
            <FileText className="w-12 h-12 mx-auto text-surface-300 mb-4" />
            <p className="text-lg font-medium text-surface-700">No scripts yet.</p>
            <p className="mt-1 mb-6 text-sm">Create a script to begin turning your story into scenes.</p>
            <Button onClick={() => setIsModalOpen(true)} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> New Script
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {scripts.map(s => (
              <Link key={s.id} to={`/projects/${projectId}/scripts/${s.id}`} className="block group outline-none">
                <div className="bg-white border border-surface-200 rounded-xl p-5 md:p-6 hover:border-primary-400 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group-focus-visible:ring-2 group-focus-visible:ring-primary-500">
                  <div className="flex-1 min-w-0 max-w-3xl">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-xl text-surface-900 group-hover:text-primary-600 transition-colors truncate">{s.title}</h3>
                      <Badge variant="outline" className="capitalize shrink-0">{s.orientation_preference}</Badge>
                    </div>
                    <p className="text-base text-surface-600 line-clamp-2 leading-relaxed">{s.full_text}</p>
                    <div className="flex items-center gap-2 mt-4 text-sm font-medium text-surface-400">
                      {s.updated_at && (
                        <span>Updated {new Date(s.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center shrink-0 md:pl-6 md:border-l border-surface-100 h-full">
                    <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 mr-2">Open Script</span>
                    <ChevronRight className="w-4 h-4 text-primary-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create New Script" maxWidth="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-5">
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
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Script Text</label>
            <textarea 
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Enter the full text for this script..."
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-[160px] resize-y"
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
          <div className="flex items-center gap-3 pt-4 border-t border-surface-100">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating} disabled={!newTitle.trim() || !newText.trim()} className="flex-1">
              Create Script
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
