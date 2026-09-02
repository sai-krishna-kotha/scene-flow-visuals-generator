import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { FileText, Plus } from 'lucide-react';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';
import { Project, Script } from '../types/api';
import { Button, Loader, ErrorMessage, Badge, Modal } from '../components/ui';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { MoreMenu, MoreMenuItem } from '../components/ui/MoreMenu';
import { DeleteConfirmationDialog } from '../components/ui/DeleteConfirmationDialog';
import { ExpandableContent } from '../components/ui/ExpandableContent';

export const ProjectPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const [project, setProject] = useState<Project | null>(null);
  const [scripts, setScripts] = useState<Script[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useDocumentTitle(project ? project.name : 'Project');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newText, setNewText] = useState('');
  const [newOrientation, setNewOrientation] = useState<'all'|'landscape'|'portrait'|'square'>('all');

  // Delete state
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [scriptToDelete, setScriptToDelete] = useState<Script | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setContext, clearContext } = useWorkspace();

  const fetchData = async () => {
    if (!projectId) return;
    clearContext();
    setLoading(true);
    try {
      const [projData, scriptsData] = await Promise.all([
        projectsApi.get(projectId),
        scriptsApi.listForProject(projectId)
      ]);
      setProject(projData);
      setScripts(scriptsData);
      setContext(projData, null);
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

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await projectsApi.delete(projectToDelete.id);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Unable to delete this project.');
    } finally {
      setIsDeleting(false);
      setProjectToDelete(null);
    }
  };

  const handleDeleteScript = async () => {
    if (!scriptToDelete) return;
    setIsDeleting(true);
    try {
      await scriptsApi.delete(scriptToDelete.id);
      setScripts(scripts.filter(s => s.id !== scriptToDelete.id));
      setScriptToDelete(null);
    } catch (err: any) {
      setError(err.message || 'Unable to delete this script.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !project) return <Loader text="Loading project..." />;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="mb-2">
        <Link to="/">
          <Button variant="outline" size="sm" className="w-full sm:w-auto">
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 sm:gap-6 border-b border-surface-200 pb-6 sm:pb-8">
        <div className="max-w-2xl">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">{project?.name}</h1>
          <ExpandableContent
            content={project?.description || 'Build scripts, break them into scenes, and turn them into visual storyboards.'}
            collapsedLinesDesktop={3}
            collapsedLinesMobile={3}
            textClassName="text-surface-500 mt-1 sm:mt-2 text-base sm:text-lg whitespace-pre-wrap"
          />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mt-2 md:mt-0 w-full md:w-auto">
          <Button onClick={() => setIsModalOpen(true)} className="shrink-0 w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> New Script
          </Button>
          {project && (
            <>
              <div className="hidden sm:block">
                <MoreMenu>
                  <MoreMenuItem destructive onClick={() => setProjectToDelete(project)}>
                    Delete Project
                  </MoreMenuItem>
                </MoreMenu>
              </div>
              <Button 
                variant="outline" 
                className="w-full sm:hidden border-red-200 text-red-600 bg-red-50"
                onClick={() => setProjectToDelete(project)}
              >
                Delete Project
              </Button>
            </>
          )}
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={() => setError(null)} />}

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
              <div key={s.id} className="bg-white border border-surface-200 rounded-xl p-4 sm:p-5 hover:border-primary-400 transition-colors flex flex-col md:flex-row md:items-start justify-between gap-4 min-h-40">
                <div className="flex-1 min-w-0 max-w-3xl">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-bold text-lg text-surface-900 truncate">{s.title}</h3>
                    <Badge variant="outline" className="capitalize shrink-0">{s.orientation_preference}</Badge>
                  </div>
                  <ExpandableContent
                    content={s.full_text}
                    collapsedLinesDesktop={6}
                    collapsedLinesMobile={4}
                    textClassName="text-sm text-surface-600 leading-relaxed mb-3 whitespace-pre-wrap"
                  />
                  <div className="text-xs font-medium text-surface-400 mt-3">
                    {s.updated_at && (
                      <span>Updated {new Date(s.updated_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
                <div className="shrink-0 flex items-center mt-2 md:mt-0 gap-2 w-full md:w-auto">
                  <Link to={`/projects/${projectId}/scripts/${s.id}`} className="flex-1 md:flex-none">
                    <Button variant="outline" size="sm" className="w-full md:w-auto">
                      Open Script
                    </Button>
                  </Link>
                  <div className="hidden sm:block">
                    <MoreMenu>
                      <MoreMenuItem destructive onClick={() => setScriptToDelete(s)}>
                        Delete Script
                      </MoreMenuItem>
                    </MoreMenu>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="sm:hidden border-red-200 text-red-600 bg-red-50 flex-none px-3"
                    onClick={() => setScriptToDelete(s)}
                    aria-label="Delete Script"
                  >
                    Delete
                  </Button>
                </div>
              </div>
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
              className="w-full px-3 py-2 bg-surface-50 border border-surface-200 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-colors text-sm min-h-40 resize-y"
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
              <option value="all">All</option>
              <option value="landscape">Landscape</option>
              <option value="portrait">Portrait</option>
              <option value="square">Square</option>
            </select>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-surface-100">
            <Button type="submit" isLoading={isCreating} disabled={!newTitle.trim() || !newText.trim()} className="w-full sm:flex-1">
              Create Script
            </Button>
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isCreating} className="w-full sm:flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </Modal>

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
    </div>
  );
};
