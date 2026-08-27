import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, BrainCircuit, Search, CheckCircle } from 'lucide-react';
import { scenesApi } from '../services/api/scenes';
import { Scene, SceneAnalysis, Script, Project, SearchJobResponse } from '../types/api';
import { Button, Card, Loader, ErrorMessage, Breadcrumbs, Badge } from '../components/ui';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

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

  useDocumentTitle('Scene Studio');

  const fetchData = async () => {
    if (!sceneId) return;
    setLoading(true);
    try {
      const sceneData = await scenesApi.get(sceneId);
      setScene(sceneData);
      
      const scriptData = await scriptsApi.get(sceneData.script_id);
      setScript(scriptData);

      const [projData, scenesData, jobsData] = await Promise.all([
        projectsApi.get(scriptData.project_id),
        scenesApi.listForScript(sceneData.script_id),
        scenesApi.listJobs(sceneId)
      ]);
      setProject(projData);
      setScriptScenes(scenesData.sort((a, b) => a.order - b.order));
      setJobs(jobsData);

      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load scene details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [sceneId]);

  const handleAnalyze = async () => {
    if (!sceneId) return;
    setIsAnalyzing(true);
    setError(null);
    try {
      const res = await scenesApi.analyze(sceneId);
      setAnalysis(res.analysis);
      setScene(prev => prev ? { ...prev, status: 'analyzed' } : null);
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

  if (loading && !scene) return <Loader text="Loading scene..." />;

  const currentIndex = scriptScenes.findIndex(s => s.id === sceneId);
  const prevScene = currentIndex > 0 ? scriptScenes[currentIndex - 1] : null;
  const nextScene = currentIndex >= 0 && currentIndex < scriptScenes.length - 1 ? scriptScenes[currentIndex + 1] : null;

  return (
    <div className="space-y-8 w-full">
      <div className="flex items-center justify-between mb-4">
        <Breadcrumbs items={[
          { label: 'Projects', href: '/' },
          { label: project?.name || 'Project', href: `/projects/${project?.id}` },
          { label: script?.title || 'Script', href: `/projects/${project?.id}/scripts/${script?.id}` },
          { label: `Scene ${scene?.order || ''}` }
        ]} />
        <Link to={`/projects/${project?.id}/scripts/${script?.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            Back to Script
          </Button>
        </Link>
      </div>

      <div className="border-b border-surface-200 pb-6 space-y-6">
        <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">Scene {scene?.order}</h1>
              {isAnalyzing ? (
                <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-md">Analyzing...</span>
              ) : scene?.status === 'analyzed' ? (
                <span className="text-sm font-medium text-surface-500 bg-surface-100 px-2.5 py-1 rounded-md">Analyzed</span>
              ) : null}
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <Button 
              onClick={handleAnalyze} 
              isLoading={isAnalyzing}
              disabled={isAnalyzing || isSearching} 
              variant="outline"
            >
              {!isAnalyzing && <BrainCircuit className="w-4 h-4 mr-2 text-primary-600" />}
              {isAnalyzing ? 'Analyzing...' : 'Analyze with Gemini'}
            </Button>
            <Button 
              onClick={handleSearch} 
              isLoading={isSearching}
              disabled={isSearching || isAnalyzing || scene?.status !== 'analyzed'} 
            >
              {!isSearching && <Search className="w-4 h-4 mr-2" />}
              Find Visual Assets
            </Button>
          </div>
        </div>

        {scriptScenes.length > 1 && (
          <div className="flex justify-between items-center bg-surface-50 px-4 py-2.5 rounded-lg border border-surface-200">
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!prevScene} 
              onClick={() => prevScene && navigate(`/scenes/${prevScene.id}`)}
              className="bg-white"
            >
              Previous Scene
            </Button>
            <span className="text-sm font-bold text-surface-700">
              Scene {scene?.order || 0} of {scriptScenes.length || 0}
            </span>
            <Button 
              variant="outline" 
              size="sm" 
              disabled={!nextScene} 
              onClick={() => nextScene && navigate(`/scenes/${nextScene.id}`)}
              className="bg-white"
            >
              Next Scene
            </Button>
          </div>
        )}
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="flex flex-col lg:grid lg:grid-cols-2 lg:items-stretch gap-6 lg:gap-8 lg:h-[600px]">
        {/* Scene Context Panel */}
        <div className="flex flex-col h-[350px] lg:h-full overflow-hidden bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="shrink-0 bg-surface-50 px-5 py-4 border-b border-surface-200">
            <h2 className="text-xs font-bold text-surface-500 uppercase tracking-wider">Scene Context</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            <p className="text-lg text-surface-900 font-medium leading-relaxed italic border-l-4 border-primary-200 pl-4 py-1">
              "{scene?.sentence_text}"
            </p>
            <div className="mt-5 flex items-center gap-2 text-sm text-surface-500 font-medium">
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

        {/* AI Scene Intelligence Panel */}
        <div className="flex flex-col h-[500px] lg:h-full overflow-hidden bg-white rounded-xl border border-surface-200 shadow-sm">
          <div className="shrink-0 bg-surface-50 px-5 py-4 border-b border-surface-200">
            <h2 className="text-xs font-bold text-surface-500 uppercase tracking-wider">AI Scene Intelligence</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-5 md:p-6">
            {!analysis ? (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-4">
                <BrainCircuit className="w-10 h-10 text-surface-300" />
                <div>
                  <p className="text-surface-700 font-medium text-base mb-1">No analysis available</p>
                  <p className="text-surface-500 text-sm mb-4">Turn this scene into structured visual intelligence.</p>
                </div>
                <Button onClick={handleAnalyze} isLoading={isAnalyzing} disabled={isAnalyzing || isSearching} variant="outline">
                  {!isAnalyzing && <BrainCircuit className="w-4 h-4 mr-2 text-primary-600" />}
                  {isAnalyzing ? 'Analyzing...' : 'Analyze with Gemini'}
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Summary</h3>
                  <p className="text-surface-900 text-sm font-medium leading-relaxed">
                    {analysis.summary}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Subjects</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.subjects.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-1 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Actions</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.actions.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-1 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Environment</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {analysis.environment.map((item, i) => (
                        <span key={i} className="text-xs font-medium text-surface-700 bg-surface-100 px-2 py-1 rounded-md">{item}</span>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2">Mood & Time</h3>
                    <div className="text-xs font-medium text-surface-700 space-y-1.5">
                      <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-surface-300"></span>{analysis.mood}</div>
                      <div className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-surface-300"></span>{analysis.time_context}</div>
                    </div>
                  </div>
                </div>
                
                <div className="pt-2">
                  <h3 className="text-[10px] font-bold text-surface-400 uppercase tracking-wider mb-2.5">Visual Search Intent</h3>
                  <div className="flex flex-col gap-2">
                    {analysis.visual_queries.map((q, i) => (
                      <div key={i} className="px-3 py-2 bg-primary-50/50 text-primary-800 border border-primary-100/50 rounded-lg text-sm font-medium">
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

      <div className="mt-8 border-t border-surface-200 pt-8">
        <h2 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-4">Visual Search History</h2>
        
        {jobs.length === 0 ? (
          <div className="text-surface-500 text-sm italic">
            No previous searches.
          </div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job, index) => (
              <div key={job.job_id} className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-3 border-b border-surface-100 last:border-0">
                <div>
                  <h3 className="font-bold text-surface-900 text-sm">Search {jobs.length - index}</h3>
                  <div className="flex items-center gap-2 text-xs text-surface-500 mt-0.5">
                    <span className="capitalize font-medium">{job.status.toLowerCase()}</span>
                    {job.status === 'COMPLETED' && job.result_count !== undefined && (
                      <>
                        <span>&middot;</span>
                        <span>{job.result_count} assets</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-surface-700 italic mt-1.5">
                    {job.requested_query ? `"${job.requested_query}"` : 'Original query unavailable'}
                  </div>
                </div>
                
                <div className="shrink-0">
                  <Link to={`/jobs/${job.job_id}${job.status === 'COMPLETED' ? '/results' : ''}`}>
                    <Button variant="outline" size="sm">
                      {job.status === 'COMPLETED' ? 'View Results' : 'View Progress'}
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
