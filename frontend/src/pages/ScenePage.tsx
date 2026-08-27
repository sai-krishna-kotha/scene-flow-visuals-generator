import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ChevronRight, BrainCircuit, Search, CheckCircle } from 'lucide-react';
import { scenesApi } from '../services/api/scenes';
import { Scene, SceneAnalysis } from '../types/api';
import { Button, Card, Loader, ErrorMessage } from '../components/ui';

export const ScenePage = () => {
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  
  const [scene, setScene] = useState<Scene | null>(null);
  const [analysis, setAnalysis] = useState<SceneAnalysis | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const fetchData = async () => {
    if (!sceneId) return;
    setLoading(true);
    try {
      const sceneData = await scenesApi.get(sceneId);
      setScene(sceneData);
      
      // If it's already analyzed, we might want to fetch analysis, but currently 
      // the backend doesn't store the full analysis JSON directly on the Scene model.
      // Wait, in our current architecture, the Gemini output is temporary per search,
      // or we can just re-analyze. The user requirement said:
      // "When clicked: POST /scenes/{scene_id}/analyze"
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
      const jobRes = await scenesApi.search(sceneId, { limit: 20, orientation: 'landscape' });
      // Redirect to job polling
      navigate(`/jobs/${jobRes.job_id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start search job');
      setIsSearching(false);
    }
  };

  if (loading && !scene) return <Loader text="Loading scene..." />;

  return (
    <div className="space-y-6">
      <div className="flex items-center text-sm text-surface-800 space-x-2">
        <Link to="/" className="hover:text-primary-600 transition-colors">Projects</Link>
        <ChevronRight className="w-4 h-4" />
        <span>...</span>
        <ChevronRight className="w-4 h-4" />
        <span className="font-medium text-surface-900">Scene {scene?.order}</span>
      </div>

      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold text-surface-900">Scene {scene?.order}</h1>
      </div>

      {error && <ErrorMessage message={error} onRetry={fetchData} />}

      <Card className="bg-surface-50">
        <p className="text-lg text-surface-900 italic">"{scene?.sentence_text}"</p>
      </Card>

      <div className="flex gap-4">
        <Button onClick={handleAnalyze} disabled={isAnalyzing || isSearching} className="flex items-center gap-2">
          {isAnalyzing ? <Loader text="Analyzing..." /> : <BrainCircuit className="w-5 h-5" />}
          Analyze with Gemini
        </Button>
        <Button 
          variant="secondary" 
          onClick={handleSearch} 
          disabled={isSearching || isAnalyzing} 
          className="flex items-center gap-2"
        >
          {isSearching ? <Loader text="Starting search..." /> : <Search className="w-5 h-5" />}
          Find Visual Assets
        </Button>
      </div>

      {analysis && (
        <Card className="border-primary-200 shadow-sm animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 border-b border-surface-200 pb-4 mb-4">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <h2 className="text-lg font-bold">Scene Intelligence Analysis</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-1">Summary</h3>
              <p className="text-surface-900">{analysis.summary}</p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Subjects</h3>
                <ul className="list-disc list-inside text-surface-800 text-sm space-y-1">
                  {analysis.subjects.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Actions</h3>
                <ul className="list-disc list-inside text-surface-800 text-sm space-y-1">
                  {analysis.actions.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Environment</h3>
                <ul className="list-disc list-inside text-surface-800 text-sm space-y-1">
                  {analysis.environment.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-2">Context</h3>
                <div className="text-sm text-surface-800">
                  <p><span className="font-medium">Mood:</span> {analysis.mood}</p>
                  <p><span className="font-medium">Time:</span> {analysis.time_context}</p>
                </div>
              </div>
            </div>

            <div className="bg-surface-50 p-4 rounded-md border border-surface-200">
              <h3 className="text-sm font-bold text-surface-500 uppercase tracking-wider mb-3">Generated Visual Search Queries</h3>
              <div className="flex flex-wrap gap-2">
                {analysis.visual_queries.map((q, i) => (
                  <span key={i} className="px-3 py-1 bg-white border border-surface-300 rounded-full text-sm font-medium text-surface-700 shadow-sm">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
