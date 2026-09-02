import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BrainCircuit, Search } from 'lucide-react';
import { scenesApi } from '../services/api/scenes';
import { Scene, SceneAnalysis, Script, Project, SearchJobResponse } from '../types/api';
import { Button, Loader, ErrorMessage, Badge } from '../components/ui';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWorkspace } from '../contexts/WorkspaceContext';
import { MoreMenu, MoreMenuItem } from '../components/ui/MoreMenu';
import { DeleteConfirmationDialog } from '../components/ui/DeleteConfirmationDialog';
import { ExpandableContent } from '../components/ui/ExpandableContent';
import { CompactTextPreview } from '../components/ui/CompactTextPreview';
import { PaginationControls } from '../components/ui/PaginationControls';

export const ScenePage = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  
  const [scene, setScene] = useState<Scene | null>(null);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [script, setScript] = useState<Script | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [scriptScenes, setScriptScenes] = useState<Scene[]>([]);
  const [jobs, setJobs] = useState<SearchJobResponse[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  // Delete state
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { setContext, clearContext } = useWorkspace();

  useDocumentTitle('Scene Studio');

  const fetchData = async () => {
    if (!sceneId) return;
    clearContext();
    setLoading(true);
    try {
      const sceneData = await scenesApi.get(sceneId);
      setScene(sceneData);
      setAnalysis(sceneData.analysis || null);
      
      const scriptData = await scriptsApi.get(sceneData.script_id);
      setScript(scriptData);

      const [projData, scenesData, jobsData] = await Promise.all([
        projectsApi.get(scriptData.project_id),
        scenesApi.listForScript(sceneData.script_id, 1, 100), // Load all scenes for prev/next nav for now
        scenesApi.listJobs(sceneId, page, pageSize)
      ]);
      setProject(projData);
      setScriptScenes(scenesData.items.sort((a, b) => a.order - b.order));
      setJobs(jobsData.items);
      setTotal(jobsData.total);
      setTotalPages(jobsData.total_pages);
      
      setContext(projData, scriptData);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load scene details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [sceneId]);

  useEffect(() => {
    fetchData();
  }, [sceneId, page]);

  const handleAnalyze = async () => {
    if (!sceneId) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await scenesApi.analyze(sceneId);
      setAnalysis(res.analysis);
      setScene(prev => prev ? { ...prev, status: 'analyzed', analysis: res.analysis } : null);
    } catch (err: any) {
      setError(err.message || 'Failed to analyze scene');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearch = async () => {
    if (!sceneId) return;
    setIsSearching(true);
    setError(null);
    try {
      const queryStr = scene?.sentence_text || "auto";
      const jobRes = await scenesApi.search(sceneId, { query: queryStr, limit: 20, orientation: 'landscape' });
      // Redirect to job polling
      navigate(`/jobs/${jobRes.job_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start search job');
      setIsSearching(false);
    }
  };

  const handleDeleteScene = async () => {
    if (!sceneId || !script) return;
    setIsDeleting(true);
    try {
      await scenesApi.delete(sceneId);
      navigate(`/projects/${project?.id}/scripts/${script.id}`);
    } catch (err: any) {
      setError(err.message || 'Unable to delete this scene.');
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading && !scene) return <Loader text="Loading scene..." />;

  const currentIndex = scriptScenes.findIndex(s => s.id === sceneId);
  const prevScene = currentIndex > 0 ? scriptScenes[currentIndex - 1] : null;
  const nextScene = currentIndex >= 0 && currentIndex < scriptScenes.length - 1 ? scriptScenes[currentIndex + 1] : null;

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="mb-2">
        <Link to={`/projects/${project?.id}/scripts/${script?.id}`} className="shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
            Back to Script
          </Button>
        </Link>
      </div>

      <div className="border-b border-surface-200 pb-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 md:gap-6">
          <div>
            <div className="text-sm font-semibold text-surface-500 tracking-wide mb-1">
              {script?.title}
            </div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 tracking-tight">
                {`Scene ${scene?.order} of ${scriptScenes.length}`}
              </h1>
              {isAnalyzing ? (
                <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-md">Analyzing...</span>
              ) : scene?.status === 'analyzed' ? (
                <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-md">Analyzed</span>
              ) : null}
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 shrink-0 w-full md:w-auto mt-2 md:mt-0">
            <Button 
              onClick={handleAnalyze} 
              isLoading={isAnalyzing}
              disabled={isAnalyzing || isSearching} 
              variant="outline"
              className="w-full sm:w-auto"
            >
              {!isAnalyzing && <BrainCircuit className="w-4 h-4 mr-2 text-primary-600" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze with Gemini'}
            </Button>
            <Button 
              onClick={handleSearch} 
              isLoading={isSearching}
              disabled={isSearching || isAnalyzing || scene?.status !== 'analyzed'} 
              className="w-full sm:w-auto"
            >
              {!isSearching && <Search className="w-4 h-4 mr-2" />}
              Find Visual Assets
            </Button>
            <div className="hidden sm:block">
              <MoreMenu>
                <MoreMenuItem destructive onClick={() => setIsDeleteDialogOpen(true)}>
                  Delete Scene
                </MoreMenuItem>
              </MoreMenu>
            </div>
            <Button 
              variant="outline" 
              className="w-full sm:hidden border-red-200 text-red-600 bg-red-50"
              onClick={() => setIsDeleteDialogOpen(true)}
            >
              Delete Scene
            </Button>
          </div>
        </div>

        {scriptScenes.length > 1 && (
          <div className="flex flex-col sm:flex-row sm:justify-between items-center bg-surface-50 p-4 sm:px-4 sm:py-2.5 rounded-lg border border-surface-200 gap-3 sm:gap-0">
            <span className="text-sm font-bold text-surface-700 sm:hidden w-full text-center mb-1">
              {`Scene ${scene?.order || 0} of ${scriptScenes.length || 0}`}
            </span>
            <div className="flex w-full sm:contents justify-between gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!prevScene} 
                onClick={() => prevScene && navigate(`/scenes/${prevScene.id}`)}
                className="bg-white flex-1 sm:flex-none"
              >
                Previous Scene
              </Button>
              <span className="text-sm font-bold text-surface-700 hidden sm:block mx-4">
                {`Scene ${scene?.order || 0} of ${scriptScenes.length || 0}`}
              </span>
              <Button 
                variant="outline" 
                size="sm" 
                disabled={!nextScene} 
                onClick={() => nextScene && navigate(`/scenes/${nextScene.id}`)}
                className="bg-white flex-1 sm:flex-none"
              >
                Next Scene
              </Button>
            </div>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:items-stretch gap-5 lg:h-[400px]">
        {/* Scene Context Panel */}
        <div className="flex flex-col h-[300px] lg:h-full overflow-hidden bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="shrink-0 bg-surface-50 px-4 py-3 border-b border-surface-200">
            <h2 className="text-xs font-bold text-surface-500 uppercase tracking-wider">Scene Context</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 md:p-5 scroll-smooth flex flex-col">
            <div className="my-auto max-w-full lg:max-w-[85%] -translate-y-1">
              <ExpandableContent
                content={scene?.sentence_text ? `"${scene.sentence_text}"` : ""}
                collapsedLinesDesktop={5}
                collapsedLinesMobile={4}
                textClassName="text-base sm:text-lg text-surface-900 font-medium leading-relaxed italic border-l-4 border-primary-200 pl-4 py-1 text-left whitespace-pre-wrap"
              />
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-surface-500 font-medium text-left">
                <span className="capitalize">{script?.orientation_preference}</span>
                {scene?.updated_at && (
                  <>
                    <span>&middot;</span>
                    <span>Updated {new Date(scene.updated_at).toLocaleDateString()}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* AI Scene Intelligence Panel */}
        <div className="flex flex-col h-[380px] lg:h-full overflow-hidden bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="shrink-0 bg-surface-50 px-4 py-3 border-b border-surface-200">
            <h2 className="text-xs font-bold text-surface-500 uppercase tracking-wider">AI Scene Intelligence</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 md:p-5 scroll-smooth">
            {!analysis ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                <BrainCircuit className="w-8 h-8 text-surface-300" />
                <div>
                  <p className="text-surface-700 font-medium text-sm mb-1">No analysis available</p>
                  <p className="text-surface-500 text-xs mb-3">Turn this scene into structured visual intelligence.</p>
                </div>
                <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={isAnalyzing || isSearching} variant="outline" size="sm">
                  {!isAnalyzing && <BrainCircuit className="w-3.5 h-3.5 mr-2 text-primary-600" />}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with Gemini'}
                </Button>
              </div>
            ) : (
              <div className="space-y-5">
                <div>
                  <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">Summary</h3>
                  <p className="text-surface-900 text-sm font-medium leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">Subjects</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.subjects.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-0.5 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">Actions</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.actions.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-0.5 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">Environment</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.environment.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-0.5 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-1.5">Mood & Time</h3>
                    <div className="text-xs font-medium text-surface-700 space-y-1">
                      <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-surface-300"></span>{analysis.mood}</div>
                      <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-surface-300"></span>{analysis.time_context}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-1">
                  <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Visual Search Intent</h3>
                  <div className="flex flex-col gap-1.5">
                    {analysis.visual_queries.map((q, i) => (
                      <div key={i} className="px-2.5 py-1.5 bg-primary-50/50 text-primary-800 border border-primary-100/50 rounded-lg text-sm font-medium">
                        {q}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 border-t border-surface-200 pt-6">
        <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Visual Search History</h2>
        
        {jobs.length === 0 ? (
          <div className="text-surface-500 text-sm italic">
            No previous searches.
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {jobs.map((job, index) => (
              <div key={job.job_id} className="bg-white border border-surface-200 shadow-sm rounded-xl p-5 hover:border-surface-300 hover:shadow transition-all flex flex-col gap-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 md:gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-xs font-bold text-surface-500 bg-surface-100 px-2 py-1 rounded shrink-0">
                      Search {jobs.length - index}
                    </span>
                  </div>
                </div>
                
                <div className="pl-0">
                  <CompactTextPreview
                    content={job.requested_query ? `"${job.requested_query}"` : 'Original query unavailable'}
                    linesDesktop={2}
                    linesMobile={2}
                    className="text-surface-600 text-sm leading-relaxed italic font-medium"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 mt-1 border-t border-surface-100 gap-3 sm:gap-0">
                  <div className="flex items-center gap-3">
                    {job.status === 'COMPLETED' ? (
                      <Badge variant="success">Completed</Badge>
                    ) : job.status === 'FAILED' ? (
                      <Badge variant="error">Failed</Badge>
                    ) : (
                      <Badge variant="outline" className="capitalize">{job.status.toLowerCase()}</Badge>
                    )}
                    <span className="text-xs font-medium text-surface-500">
                      {job.status === 'COMPLETED' && job.result_count !== undefined ? (
                        `${job.result_count} assets`
                      ) : (
                        '—'
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <Link to={`/jobs/${job.job_id}${job.status === 'COMPLETED' ? '/results' : ''}`} className="flex-1 sm:flex-none">
                      <Button variant="outline" size="sm" className="bg-white hover:bg-surface-50 w-full sm:w-auto">
                        {job.status === 'COMPLETED' ? 'View Results' : 'View Progress'}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && jobs.length > 0 && (
          <div className="mt-8 border-t border-surface-200 pt-4">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
        onConfirm={handleDeleteScene}
        title="Delete Scene"
        itemName={scene?.title || `Scene ${scene?.order}`}
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
