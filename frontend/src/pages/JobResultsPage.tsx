import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Image as ImageIcon, ExternalLink, Info } from 'lucide-react';
import { jobsApi } from '../services/api/jobs';
import { SemanticSearchResult, SearchJobResponse, Scene, Script, Project } from '../types/api';
import { Card, Loader, ErrorMessage, Button } from '../components/ui';
import { scenesApi } from '../services/api/scenes';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { useWorkspace } from '../contexts/WorkspaceContext';

export const JobResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [job, setJob] = useState<SearchJobResponse | null>(null);
  const [scene, setScene] = useState<Scene | null>(null);
  const [script, setScript] = useState<Script | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [searchNumber, setSearchNumber] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { setContext, clearContext } = useWorkspace();

  useDocumentTitle('Visual Results');

  useEffect(() => {
    if (!jobId) return;
    const fetchData = async () => {
      clearContext();
      try {
        const [resultsData, jobData] = await Promise.all([
          jobsApi.getResults(jobId),
          jobsApi.getJob(jobId)
        ]);
        setResults(resultsData.results);
        setJob(jobData);

        const sceneData = await scenesApi.get(jobData.scene_id);
        setScene(sceneData);

        const [scriptData, jobsData] = await Promise.all([
          scriptsApi.get(sceneData.script_id),
          scenesApi.listJobs(sceneData.id)
        ]);
        setScript(scriptData);

        const projData = await projectsApi.get(scriptData.project_id);
        setProject(projData);
        
        setContext(projData, scriptData);

        // Calculate search number based on descending chronology
        // The newest job (index 0) gets the highest number
        const jobIndex = jobsData.findIndex(j => j.job_id === jobId);
        if (jobIndex !== -1) {
          setSearchNumber(jobsData.length - jobIndex);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job results context');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);


  if (loading) return <Loader text="Loading visual assets..." />;

  if (error) return (
    <div className="max-w-2xl mx-auto mt-12">
      <ErrorMessage message={error} />
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <div className="mb-2">
        <Link to={`/scenes/${scene?.id}`} className="shrink-0 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto gap-2">
            Back to Scene
          </Button>
        </Link>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-surface-200 pb-4 sm:pb-6 mb-6 sm:mb-8">
        <div className="w-full md:w-auto overflow-hidden">
          <div className="flex flex-col gap-0.5 mb-2">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wider">{project?.name}</span>
            <span className="text-sm font-semibold text-surface-600 tracking-wide">{script?.title}</span>
          </div>
          <div className="text-sm font-semibold text-surface-500 mb-3">
            Scene {scene?.order} &middot; Search #{searchNumber}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-surface-900 flex items-center gap-2 sm:gap-3 tracking-tight">
            <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
            <span className="truncate">Visual Results</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 bg-white px-4 py-2.5 sm:py-2 rounded-lg border border-surface-200 shadow-sm w-full md:w-auto justify-between md:justify-start mt-2 md:mt-0">
          <span className="text-sm font-semibold text-surface-700">{results.length} visual assets</span>
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 bg-surface-50 border border-surface-200 border-dashed rounded-xl text-surface-500 max-w-3xl mx-auto">
          <ImageIcon className="w-12 h-12 mx-auto text-surface-300 mb-4" />
          <p className="text-lg font-medium text-surface-700">No assets found</p>
          <p className="mt-1">We couldn't find any relevant visual assets for this scene.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {results.map((item, idx) => (
            <AssetCard 
              key={item.asset.id} 
              item={item} 
              rank={idx + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};

const AssetCard = ({ item, rank }: { item: SemanticSearchResult, rank: number }) => {
  const [imgError, setImgError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="group rounded-xl h-full" style={{ perspective: '1000px' }}>
      <div 
        data-testid={`flip-card-${item.asset.id}`}
        className="w-full h-full relative rounded-xl transition-transform duration-400 shadow-sm hover:shadow-xl grid" 
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* FRONT FACE */}
        <div 
          className="flex flex-col bg-white rounded-xl border border-surface-200 overflow-hidden col-start-1 row-start-1"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative aspect-video bg-surface-100 flex items-center justify-center overflow-hidden">
            {imgError ? (
              <div className="text-surface-400 flex flex-col items-center">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs font-medium">Image unavailable</span>
              </div>
            ) : (
              <img 
                src={item.asset.thumbnail_url} 
                alt={`Visual asset from ${item.asset.provider}`}
                loading="lazy"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              />
            )}
            <div className="absolute top-3 left-3 bg-black/75 text-white text-xs font-bold px-2.5 py-1 rounded backdrop-blur-md">
              #{rank}
            </div>
            <div className="absolute top-3 right-3 bg-white/90 text-surface-900 text-xs font-bold px-2.5 py-1 rounded shadow-sm capitalize backdrop-blur-md">
              {item.asset.provider}
            </div>
          </div>
          
          <div className="p-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-semibold text-surface-600 bg-surface-100 px-2 py-1 rounded">
                {item.asset.width} &times; {item.asset.height}
              </div>
              <div className="flex gap-2 sm:gap-1 relative z-10">
                <button 
                  aria-label="Why this ranked here"
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="p-2 sm:p-1.5 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-50 transition-colors"
                  title="Ranking Explanation"
                >
                  <Info className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
                <a 
                  href={item.asset.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 sm:p-1.5 rounded text-surface-400 hover:text-surface-700 hover:bg-surface-50 transition-colors"
                  title="View Source"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5 sm:w-4 sm:h-4" />
                </a>
              </div>
            </div>

            <div className="flex justify-between items-center mt-auto pt-2">
              <span className="text-[10px] font-bold text-surface-400 uppercase tracking-wider">Final Score</span>
              <span className="text-sm font-extrabold text-primary-700">
                {item.features?.final_score !== null && item.features?.final_score !== undefined ? item.features.final_score.toFixed(3) : 'Score unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          className="flex flex-col bg-white rounded-xl border border-surface-200 overflow-hidden p-4 col-start-1 row-start-1"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 flex flex-col">
            <div className="font-bold text-surface-900 mb-3 text-sm">Why this ranked here</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-surface-600 font-medium text-xs">Semantic relevance</span>
                <span className="font-mono font-medium text-surface-900 text-xs">
                  {item.features?.semantic_score !== null && item.features?.semantic_score !== undefined ? item.features.semantic_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-600 font-medium text-xs">Resolution</span>
                <span className="font-mono font-medium text-surface-900 text-xs">
                  {item.features?.resolution_score !== null && item.features?.resolution_score !== undefined ? item.features.resolution_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-surface-600 font-medium text-xs">Orientation</span>
                <span className="font-mono font-medium text-surface-900 text-xs">
                  {item.features?.orientation_score !== null && item.features?.orientation_score !== undefined ? item.features.orientation_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-surface-100">
                <span className="text-surface-900 font-bold text-xs">Final score</span>
                <span className="font-mono font-bold text-primary-700 text-xs">
                  {item.features?.final_score !== null && item.features?.final_score !== undefined ? item.features.final_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-surface-500 mt-2 italic">
              Semantic relevance has the highest influence.
            </div>
          </div>
          <div className="mt-auto pt-2">
            <Button 
              variant="outline" 
              size="sm"
              className="w-full justify-center gap-2"
              onClick={(e) => { e.stopPropagation(); setIsFlipped(false); }}
              aria-label="See image"
            >
              See Image
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
