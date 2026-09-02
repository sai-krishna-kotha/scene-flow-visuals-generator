import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Clapperboard, Plus, Settings, Sparkles } from 'lucide-react';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';
import { Script, Scene, Project } from '../types/api';
import { Button, Loader, ErrorMessage, Badge, Modal } from '../components/ui';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { MoreMenu, MoreMenuItem } from '../components/ui/MoreMenu';
import { DeleteConfirmationDialog } from '../components/ui/DeleteConfirmationDialog';
import { ExpandableContent } from '../components/ui/ExpandableContent';

export const ScriptPage = () => {
  const { projectId, scriptId } = useParams<{ projectId: string, scriptId: string }>();
  const navigate = useNavigate();
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [newText, setNewText] = useState('');

  const [project, setProject] = useState<Project | null>(null);

  // Delete state
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null);
  const [sceneToDelete, setSceneToDelete] = useState<Scene | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setContext, clearContext } = useWorkspace();

  useDocumentTitle('Script Studio');

  const fetchData = async () => {
    if (!scriptId || !projectId) return;
    clearContext();
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
      setContext(projData, scriptData);
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

  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;
    setIsDeleting(true);
    try {
      await scriptsApi.delete(scriptToDelete.id);
      navigate(`/projects/${projectId}`);
    } catch (err: any) {
      setError(err.message || 'Unable to delete this script.');
    } finally {
      setIsDeleting(false);
      setScriptToDelete(null);
    }
  };

  const handleDeleteScene = async () => {
    if (!sceneToDelete) return;
    setIsDeleting(true);
    try {
      await scenesApi.delete(sceneToDelete.id);
      setScenes(scenes.filter(s => s.id !== sceneToDelete.id));
      setSceneToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Unable to delete this scene.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !script) return <Loader text="Loading script..." />;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="mb-2">
        <Link to={`/projects/${projectId}`} className="shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
            Back to Project
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 sm:gap-6 border-b border-surface-200 pb-6 sm:pb-8">
        <div className="max-w-3xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight mb-2 sm:mb-3">{script?.title}</h1>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant="outline" className="capitalize">
              {script?.orientation_preference}
            </Badge>
            <span className="text-sm text-surface-500 font-medium">{scenes.length} Scenes</span>
          </div>
        </div>
        <div className="shrink-0 mt-2 md:mt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <Button onClick={handleGenerateScenes} isLoading={isGenerating} disabled={scenes.length > 0} className="w-full sm:w-auto">
            <Sparkles className="w-4 h-4 mr-2 shrink-0" /> 
            {scenes.length > 0 ? 'Scenes Generated' : 'Generate Scenes'}
          </Button>
          <Button onClick={() => setIsModalOpen(true)} variant="outline" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2 shrink-0" /> Add Scene
          </Button>
          {script && (
            <>
              <div className="hidden sm:block">
                <MoreMenu>
                  <MoreMenuItem destructive onClick={() => setScriptToDelete(script)}>
                    Delete Script
                  </MoreMenuItem>
                </MoreMenu>
              </div>
              <Button 
                variant="outline" 
                className="w-full sm:hidden border-red-200 text-red-600 bg-red-50"
                onClick={() => setScriptToDelete(script)}
              >
                Delete Script
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

      <div className="bg-white rounded-xl border border-surface-200 shadow-sm overflow-hidden mb-8">
        <div className="bg-surface-50 px-6 py-4 border-b border-surface-200 flex items-center justify-between">
          <h2 className="text-sm font-bold text-surface-700 uppercase tracking-wider flex items-center gap-2">
            <Settings className="w-4 h-4 text-surface-400" /> Source Script
          </h2>
        </div>
        <div className="p-6 md:p-8">
          <ExpandableContent
            content={script?.full_text}
            collapsedLinesDesktop={10}
            collapsedLinesMobile={6}
            textClassName="text-surface-800 text-lg leading-relaxed whitespace-pre-wrap font-serif"
          />
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
          <div className="flex flex-col gap-4">
            {scenes.map(s => (
              <div key={s.id} className="bg-white border border-surface-200 shadow-sm rounded-xl p-5 hover:border-surface-300 hover:shadow transition-all flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-surface-500 bg-surface-100 px-2 py-1 rounded shrink-0">
                      {s.order < 10 ? `0${s.order}` : s.order}
                    </span>
                    {s.title ? (
                      <h3 className="text-surface-900 font-bold text-base truncate">{s.title}</h3>
                    ) : (
                      <h3 className="text-surface-400 font-medium text-base italic truncate">Untitled Scene</h3>
                    )}
                  </div>
                </div>
                
                <div className="pl-0 md:pl-13">
                  <ExpandableContent
                    content={s.sentence_text}
                    collapsedLinesDesktop={4}
                    collapsedLinesMobile={3}
                    textClassName="text-surface-600 text-sm leading-relaxed whitespace-pre-wrap"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 mt-1 border-t border-surface-100 md:ml-13 gap-3 sm:gap-0">
                  <div className="flex items-center">
                    {s.status === 'analyzed' ? (
                      <Badge variant="success">Analyzed</Badge>
                    ) : (
                      <span className="text-xs font-medium text-surface-400">Unanalyzed</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to={`/scenes/${s.id}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="bg-white hover:bg-surface-50 w-full sm:w-auto">
                        Open Scene
                      </Button>
                    </Link>
                    <div className="hidden sm:block">
                      <MoreMenu>
                        <MoreMenuItem destructive onClick={() => setSceneToDelete(s)}>
                          Delete Scene
                        </MoreMenuItem>
                      </MoreMenu>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="sm:hidden border-red-200 text-red-600 bg-red-50 flex-none px-3"
                      onClick={() => setSceneToDelete(s)}
                      aria-label="Delete Scene"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
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
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-35 resize-y"
              disabled={isCreating}
              required
              autoFocus
            />
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-surface-100">
            <Button type="submit" isLoading={isCreating} disabled={!newText.trim()} className="w-full sm:flex-1">
              Add Scene
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating} className="w-full sm:flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

      <DeleteConfirmationDialog
        isOpen={!!scriptToDelete}
        onClose={() => setScriptToDelete(null)}
        onConfirm={handleDeleteScript}
        title="Delete Script"
        itemName={scriptToDelete?.title || ''}
        isDeleting={isDeleting}
        warnings={[
          'all scenes',
          'visual search history',
          'stored visual results'
        ]}
        deleteButtonText="Delete Script"
      />

      <DeleteConfirmationDialog
        isOpen={!!sceneToDelete}
        onClose={() => setSceneToDelete(null)}
        onConfirm={handleDeleteScene}
        title="Delete Scene"
        itemName={sceneToDelete?.title || `Scene ${sceneToDelete?.order}`}
        isDeleting={isDeleting}
        warnings={[
          'visual search jobs',
          'stored visual results'
        ]}
        deleteButtonText="Delete Scene"
      />
    </div>
  );
};
