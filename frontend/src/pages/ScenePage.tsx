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
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <Breadcrumbs items={[
          { label: 'Projects', href: '/' },
          { label: project?.name || 'Project', href: `/projects/${project?.id}` },
          { label: script?.title || 'Script', href: `/projects/${project?.id}/scripts/${script?.id}` },
          { label: `Scene ${scene?.order || ''}` }
        ]} />
        <Link to={`/projects/${project?.id}/scripts/${script?.id}`}>
          <Button variant="outline" size="sm" className="gap-2">
            &larr; Back to Script
          </Button>
        </Link>
      </div>
        <div className="flex items-center gap-6 bg-white px-4 py-2 rounded-lg border border-surface-200 shadow-sm">
          {prevScene ? (
            <Link to={`/scenes/${prevScene.id}`} className="text-sm font-medium text-surface-500 hover:text-primary-600 transition-colors">
              &larr; Prev
            </Link>
          ) : (
            <span className="text-sm font-medium text-surface-300 cursor-not-allowed">&larr; Prev</span>
          )}
          <span className="text-sm font-bold text-surface-700">
            Scene {scene?.order || 0} / {scriptScenes.length || 0}
          </span>
          {nextScene ? (
            <Link to={`/scenes/${nextScene.id}`} className="text-sm font-medium text-surface-500 hover:text-primary-600 transition-colors">
              Next &rarr;
            </Link>
          ) : (
            <span className="text-sm font-medium text-surface-300 cursor-not-allowed">Next &rarr;</span>
          )}
        </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 border-b border-surface-200 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-surface-900 tracking-tight">Scene {scene?.order}</h1>
            {scene?.status === 'analyzed' ? (
              <Badge variant="success">Analyzed</Badge>
            ) : (
              <Badge variant="warning">Pending Analysis</Badge>
            )}
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
            Analyze with Gemini
          </Button>
          <Button 
            onClick={handleSearch} 
            isLoading={isSearching}
            disabled={isSearching || isAnalyzing || scene?.status !== 'analyzed'} 
          >
            {!isSearching && <Search className="w-4 h-4 mr-2" />}
            Search Visual Assets
          </Button>
        </div>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-surface-900 border-b border-surface-200 pb-2">Scene Context</h2>
          <div className="bg-white p-6 rounded-xl border border-surface-200 shadow-sm space-y-4">
            <p className="text-lg text-surface-900 font-medium leading-relaxed italic border-l-4 border-primary-200 pl-4 py-1">
              "{scene?.sentence_text}"
            </p>
            
            <div className="pt-4 mt-4 border-t border-surface-100 flex gap-6 text-sm text-surface-600">
              <div>
                <span className="font-semibold block text-surface-500 uppercase tracking-wider text-xs mb-1">Orientation</span>
                <span className="capitalize">{script?.orientation_preference}</span>
              </div>
              <div>
                <span className="font-semibold block text-surface-500 uppercase tracking-wider text-xs mb-1">Created</span>
                <span>{scene?.created_at ? new Date(scene.created_at).toLocaleDateString() : 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <h2 className="text-xl font-bold text-surface-900 border-b border-surface-200 pb-2">AI Scene Intelligence</h2>
          
          {!analysis ? (
            <div className="bg-surface-50 p-8 rounded-xl border border-surface-200 border-dashed text-center">
              <BrainCircuit className="w-10 h-10 mx-auto text-surface-300 mb-3" />
              <p className="text-surface-600 font-medium">No analysis available</p>
              <p className="text-sm text-surface-500 mt-1">Run "Analyze with Gemini" to extract visual intelligence.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-primary-200 shadow-sm overflow-hidden">
              <div className="bg-primary-50 p-4 border-b border-primary-100">
                <p className="text-surface-900 text-sm font-medium leading-relaxed">
                  {analysis.summary}
                </p>
              </div>
              
              <div className="p-4 grid grid-cols-2 gap-x-4 gap-y-6">
                <div>
                  <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Subjects</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.subjects.map((item, i) => (
                      <Badge key={i} variant="default">{item}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Actions</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.actions.map((item, i) => (
                      <Badge key={i} variant="default">{item}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Environment</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.environment.map((item, i) => (
                      <Badge key={i} variant="default">{item}</Badge>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-2">Context</h3>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-surface-500 font-medium">Mood:</span>
                      <span className="text-surface-900 font-medium">{analysis.mood}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-surface-500 font-medium">Time:</span>
                      <span className="text-surface-900 font-medium">{analysis.time_context}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-surface-50 border-t border-surface-100">
                <h3 className="text-xs font-bold text-surface-500 uppercase tracking-wider mb-3">Generated Visual Search Queries</h3>
                <div className="flex flex-wrap gap-2">
                  {analysis.visual_queries.map((q, i) => (
                    <span key={i} className="px-3 py-1.5 bg-white border border-surface-300 rounded-md text-sm font-medium text-primary-700 shadow-sm flex items-center hover:bg-primary-50 transition-colors cursor-default">
                      <Search className="w-3 h-3 mr-1.5 opacity-50" />
                      {q}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 border-t border-surface-200 pt-8">
        <h2 className="text-xl font-bold text-surface-900 mb-6">Visual Search History</h2>
        
        {jobs.length === 0 ? (
          <div className="bg-surface-50 p-8 rounded-xl border border-surface-200 border-dashed text-center">
            <Search className="w-10 h-10 mx-auto text-surface-300 mb-3" />
            <p className="text-surface-600 font-medium">No previous searches</p>
            <p className="text-sm text-surface-500 mt-1">Run a visual search to generate assets for this scene.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job, index) => (
              <div key={job.job_id} className="bg-white rounded-xl border border-surface-200 shadow-sm p-5 flex flex-col justify-between hover:border-primary-300 transition-colors">
                <div>
                  <h3 className="font-bold text-surface-900 mb-1 text-lg">Search {jobs.length - index}</h3>
                  <div className="flex items-center gap-2 text-sm text-surface-600 mb-3">
                    <span className="capitalize font-medium">{job.status.toLowerCase()}</span>
                    {job.status === 'COMPLETED' && job.result_count !== undefined && (
                      <>
                        <span>&middot;</span>
                        <span>{job.result_count} assets</span>
                      </>
                    )}
                  </div>
                  <div className="text-sm text-surface-700 italic line-clamp-2 leading-snug bg-surface-50 p-2 rounded border border-surface-100">
                    {job.requested_query ? `"${job.requested_query}"` : 'Original query unavailable'}
                  </div>
                </div>
                
                <div className="mt-5 pt-4 border-t border-surface-100">
                  <Link to={`/jobs/${job.job_id}${job.status === 'COMPLETED' ? '/results' : ''}`}>
                    <Button variant="outline" className="w-full">
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
