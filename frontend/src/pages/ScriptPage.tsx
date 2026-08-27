import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clapperboard, Plus, ChevronRight, Settings } from 'lucide-react';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';
import { Script, Scene, Project } from '../types/api';
import { Button, Card, Loader, ErrorMessage, Breadcrumbs, Badge } from '../components/ui';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ScriptPage = () => {
  const { projectId, scriptId } = useParams<{ projectId: string, scriptId: string }>();
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newText, setNewText] = useState('');

  const [project, setProject] = useState<Project | null>(null);

  useDocumentTitle('Script Studio');

  const fetchData = async () => {
    if (!scriptId || !projectId) return;
    setLoading(true);
    try {
      const [projData, scriptData, scenesData] = await Promise.all([
        projectsApi.get(projectId),
        scriptsApi.get(scriptId),
        scenesApi.listForScript(scriptId)
      ]);
      setProject(projData);
      setScript(scriptData);
      setScenes(scenesData);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load script details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [scriptId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptId || !newText.trim()) return;
    setIsCreating(true);
    try {
      const order = scenes.length > 0 ? Math.max(...scenes.map(s => s.order)) + 1 : 1;
      const newScene = await scenesApi.create(scriptId, { 
        sentence_text: newText,
        order
      });
      setScenes([...scenes, newScene]);
      setNewText('');
    } catch (err: any) {
      setError(err.message || 'Failed to create scene');
    } finally {
      setIsCreating(false);
    }
  };

  if (loading && !script) return <Loader text="Loading script..." />;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumbs items={[
          { label: 'Projects', href: '/' },
          { label: project?.name || 'Project', href: `/projects/${projectId}` },
          { label: script?.title || 'Script' }
        ]} />
        <Link to={`/projects/${projectId}`}>
          <Button variant="outline" size="sm" className="gap-2">
            &larr; Back to Project
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-surface-200 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">{script?.title}</h1>
          <div className="flex items-center gap-3 mt-3">
            <Badge variant="outline" className="capitalize">
              {script?.orientation_preference}
            </Badge>
            <span className="text-sm text-surface-500 font-medium">{scenes.length} Scenes</span>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-surface-900">Scenes</h2>
          </div>
          
          {scenes.length === 0 ? (
            <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500">
              <Clapperboard className="w-12 h-12 mx-auto text-surface-300 mb-4" />
              <p className="text-lg font-medium text-surface-700">No scenes yet</p>
              <p className="mt-1">Break down your script into scenes to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scenes.map(s => (
                <Link key={s.id} to={`/scenes/${s.id}`} className="block group">
                  <div className="bg-white border border-surface-200 rounded-xl p-5 hover:border-primary-400 hover:shadow-md transition-all flex items-start gap-5">
                    <div className="w-10 h-10 rounded-full bg-surface-100 text-surface-600 group-hover:bg-primary-100 group-hover:text-primary-700 flex items-center justify-center font-bold flex-shrink-0 transition-colors">
                      {s.order}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-surface-900 font-medium leading-relaxed">{s.sentence_text}</p>
                      <div className="flex items-center gap-3 mt-3 text-xs">
                        {s.status === 'analyzed' ? (
                          <Badge variant="success">Analyzed</Badge>
                        ) : (
                          <Badge variant="warning">Pending Analysis</Badge>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-300 group-hover:text-primary-500 transition-colors self-center shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm">
            <h2 className="text-lg font-bold text-surface-900 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5 text-surface-400" /> Full Script Text
            </h2>
            <div className="text-sm text-surface-700 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed">
              {script?.full_text}
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm sticky top-6">
            <h2 className="text-lg font-bold text-surface-900 mb-4">Add Scene</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-surface-700 mb-1">Scene Text</label>
                <textarea 
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="A specific visual action..."
                  className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-[100px] resize-y"
                  disabled={isCreating}
                  required
                />
              </div>
              <Button type="submit" isLoading={isCreating} disabled={!newText.trim()} className="w-full mt-2">
                <Plus className="w-4 h-4 mr-2" /> Add Scene
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
