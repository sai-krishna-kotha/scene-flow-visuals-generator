import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Clapperboard, Plus, ChevronRight, Settings, Sparkles } from 'lucide-react';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';
import { Script, Scene, Project } from '../types/api';
import { Button, Loader, ErrorMessage, Breadcrumbs, Badge, Modal } from '../components/ui';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const ScriptPage = () => {
  const { projectId, scriptId } = useParams<{ projectId: string, scriptId: string }>();
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
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
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to create scene');
    } finally {
      setIsCreating(false);
    }
  };

  const handleGenerateScenes = async () => {
    if (!scriptId) return;
    setIsGenerating(true);
    setError(null);
    try {
      const generatedScenes = await scriptsApi.segment(scriptId);
      setScenes(generatedScenes);
    } catch (err: any) {
      if (err.response?.status === 409) {
        setError('Scenes already exist for this script.');
      } else {
        setError(err.response?.data?.detail || err.message || 'Failed to generate scenes');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  if (loading && !script) return <Loader text="Loading script..." />;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumbs items={[
          { label: 'Projects', href: '/' },
          { label: project?.name || 'Project', href: `/projects/${projectId}` },
          { label: script?.title || 'Script' }
        ]} />
        <Link to={`/projects/${projectId}`}>
          <Button variant="outline" size="sm" className="gap-2">
            Back to Project
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-surface-200 pb-8">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight mb-3">{script?.title}</h1>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {script?.orientation_preference}
            </Badge>
            <span className="text-sm text-surface-500 font-medium">{scenes.length} Scenes</span>
          </div>
        </div>
        <div className="shrink-0 mt-4 md:mt-0 flex flex-col md:flex-row gap-3">
          <Button onClick={handleGenerateScenes} isLoading={isGenerating} disabled={scenes.length > 0} className="w-full md:w-auto">
            <Sparkles className="w-4 h-4 mr-2" /> 
            {scenes.length > 0 ? 'Scenes Generated' : 'Generate Scenes with Gemini'}
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" className="w-full md:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Add Scene
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-8">
        <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-700 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-surface-400" /> Source Script
          </h2>
        </div>
        <div className="p-6 md:p-8">
          <p className="text-surface-800 text-lg leading-relaxed whitespace-pre-wrap font-serif">
            {script?.full_text}
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-surface-900">Storyboard Scenes</h2>
        </div>
        
        {scenes.length === 0 ? (
          <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500 max-w-2xl mx-auto">
            <Clapperboard className="w-12 h-12 mx-auto text-surface-300 mb-4" />
            <p className="text-lg font-medium text-surface-700">No scenes yet.</p>
            <p className="mt-1 mb-6 text-sm">Break down your script into specific scenes to begin generating visual intelligence.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button onClick={handleGenerateScenes} isLoading={isGenerating}>
                <Sparkles className="w-4 h-4 mr-2" /> Generate Scenes with Gemini
              </Button>
              <Button onClick={() => setIsModalOpen(true)} variant="outline">
                <Plus className="w-4 h-4 mr-2" /> Add Scene Manually
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {scenes.map(s => (
              <Link key={s.id} to={`/scenes/${s.id}`} className="block group outline-none">
                <div className="bg-white border border-surface-200 rounded-xl p-5 hover:border-primary-400 hover:shadow-md transition-all flex items-start md:items-center gap-5 group-focus-visible:ring-2 group-focus-visible:ring-primary-500">
                  <div className="w-12 h-12 rounded-full bg-surface-100 text-surface-600 group-hover:bg-primary-100 group-hover:text-primary-700 flex items-center justify-center font-bold flex-shrink-0 transition-colors text-lg">
                    {s.order}
                  </div>
                  <div className="flex-1 min-w-0 md:pr-4">
                    {s.title && <h3 className="text-surface-900 font-bold text-lg mb-1">{s.title}</h3>}
                    <p className="text-surface-700 font-medium text-base leading-relaxed mb-2 line-clamp-3">{s.sentence_text}</p>
                    <div className="flex items-center gap-3 text-sm">
                      {s.status === 'analyzed' ? (
                        <Badge variant="success">Analyzed</Badge>
                      ) : (
                        <span className="text-surface-400 font-medium">Unanalyzed</span>
                      )}
                    </div>
                  </div>
                  <div className="hidden md:flex items-center shrink-0 pl-6 border-l border-surface-100 h-full">
                    <span className="text-sm font-semibold text-primary-600 group-hover:text-primary-700 mr-2">Open Scene</span>
                    <ChevronRight className="w-4 h-4 text-primary-500" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Scene" maxWidth="max-w-lg">
        <form onSubmit={handleCreate} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-surface-700 mb-1">Scene Text</label>
            <textarea 
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="Describe the visual action or setting..."
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-[140px] resize-y"
              disabled={isCreating}
              required
              autoFocus
            />
          </div>
          <div className="flex items-center gap-3 pt-4 border-t border-surface-100">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isCreating} disabled={!newText.trim()} className="flex-1">
              Add Scene
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
