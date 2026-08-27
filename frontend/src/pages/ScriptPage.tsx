import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clapperboard, Plus, ChevronRight, Settings } from 'lucide-react';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';
import { Script, Scene } from '../types/api';
import { Button, Card, Loader, ErrorMessage } from '../components/ui';

export const ScriptPage = () => {
  const { projectId, scriptId } = useParams<{ projectId: string, scriptId: string }>();
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isCreating, setIsCreating] = useState(false);
  const [newText, setNewText] = useState('');

  const fetchData = async () => {
    if (!scriptId) return;
    setLoading(true);
    try {
      const [scriptData, scenesData] = await Promise.all([
        scriptsApi.get(scriptId),
        scenesApi.listForScript(scriptId)
      ]);
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
    <div className="space-y-6">
      <div className="flex items-center text-sm text-surface-800 space-x-2">
        <Link to="/" className="hover:text-primary-600 transition-colors">Projects</Link>
        <ChevronRight className="w-4 h-4" />
        <Link to={`/projects/${projectId}`} className="hover:text-primary-600 transition-colors">Project</Link>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-surface-900">{script?.title}</span>
      </div>

      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-surface-900">{script?.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className="px-2 py-1 bg-surface-200 text-xs font-medium rounded-full uppercase tracking-wider">{script?.orientation_preference}</span>
          </div>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <h2 className="text-lg font-bold border-b border-surface-200 pb-2">Scenes</h2>
          {scenes.length === 0 ? (
            <div className="text-center py-12 text-surface-800 border border-dashed border-surface-200 rounded-lg">
              <Clapperboard className="w-12 h-12 mx-auto text-surface-200 mb-4" />
              <p>No scenes yet. Break down your script into scenes to begin.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {scenes.map(s => (
                <Link key={s.id} to={`/scenes/${s.id}`} className="block group">
                  <Card className="hover:border-primary-300 hover:shadow-md transition-all flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold flex-shrink-0">
                      {s.order}
                    </div>
                    <div className="flex-1">
                      <p className="text-surface-900">{s.sentence_text}</p>
                      <div className="flex items-center gap-2 mt-2 text-xs">
                        {s.status === 'analyzed' ? (
                          <span className="text-green-600 font-medium bg-green-50 px-2 py-1 rounded">Analyzed</span>
                        ) : (
                          <span className="text-yellow-600 font-medium bg-yellow-50 px-2 py-1 rounded">Pending Analysis</span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-surface-200 group-hover:text-primary-500 mt-2" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-6">
          <Card className="bg-surface-50">
            <h2 className="font-bold mb-4 flex items-center gap-2"><Settings className="w-4 h-4" /> Full Script Text</h2>
            <div className="text-sm text-surface-800 whitespace-pre-wrap max-h-60 overflow-y-auto">
              {script?.full_text}
            </div>
          </Card>

          <Card className="bg-surface-50 sticky top-4">
            <h2 className="font-bold mb-4">Add Scene</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Scene Text</label>
                <textarea 
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="A specific visual action..."
                  className="w-full p-2 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[100px]"
                  disabled={isCreating}
                  required
                />
              </div>
              <Button type="submit" disabled={isCreating || !newText.trim()} className="w-full flex justify-center items-center gap-2">
                <Plus className="w-4 h-4" /> Add Scene
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};
