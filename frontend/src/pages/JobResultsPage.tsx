import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Image as ImageIcon, ExternalLink, Info, ChevronLeft, Download, CheckSquare, Square } from 'lucide-react';
import { downloadAssetsAsZip } from '../utils/zip';
import { jobsApi } from '../services/api/jobs';
import { SemanticSearchResult, SearchJobResponse, Scene, Script, Project } from '../types/api';
import { Card, Loader, ErrorMessage, Button } from '../components/ui';
import { PaginationControls } from '../components/ui/PaginationControls';
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
  
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);

  type SelectionMode = 'explicit' | 'all';
  const [selectionMode, setSelectionMode] = useState<SelectionMode>('explicit');
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadMessage, setDownloadMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const { setContext, clearContext } = useWorkspace();

  // Clear selection only on job change, NOT on page change
  useEffect(() => {
    setSelectionMode('explicit');
    setSelectedAssetIds(new Set());
    setDownloadMessage(null);
  }, [jobId]);

  // The job-results API now returns the persisted database Asset UUID.
  // Use it as the authoritative stable selection key across pagination.
  const getAssetSelectionKey = (result: SemanticSearchResult) => result.asset_id;

  const isAssetSelected = (selectionKey: string) => {
    return selectionMode === 'all'
      ? !selectedAssetIds.has(selectionKey)
      : selectedAssetIds.has(selectionKey);
  };

  const selectedCount = selectionMode === 'all' ? total - selectedAssetIds.size : selectedAssetIds.size;
  const currentPageSelectedCount = results.filter(r => isAssetSelected(getAssetSelectionKey(r))).length;
  const isPageFullySelected = results.length > 0 && currentPageSelectedCount === results.length;
  const isGlobalFullySelected = selectionMode === 'all' && selectedAssetIds.size === 0;

  const handleSelectPage = () => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      results.forEach(r => {
        const selectionKey = getAssetSelectionKey(r);
        if (selectionMode === 'all') next.delete(selectionKey);
        else next.add(selectionKey);
      });
      return next;
    });
  };

  const handleClearPage = () => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      results.forEach(r => {
        const selectionKey = getAssetSelectionKey(r);
        if (selectionMode === 'all') next.add(selectionKey);
        else next.delete(selectionKey);
      });
      return next;
    });
  };

  const handleSelectAllResults = () => {
    setSelectionMode('all');
    setSelectedAssetIds(new Set());
  };

  const handleClearSelection = () => {
    setSelectionMode('explicit');
    setSelectedAssetIds(new Set());
  };

  const handleToggleSelection = (selectionKey: string) => {
    setSelectedAssetIds(prev => {
      const next = new Set(prev);
      if (next.has(selectionKey)) next.delete(selectionKey);
      else next.add(selectionKey);
      return next;
    });
  };

  const handleDownloadZip = async () => {
    if (selectedCount === 0 || !jobId) return;
    setIsDownloading(true);
    setDownloadMessage(null);

    try {
      const promises = [];
      for (let p = 1; p <= totalPages; p++) {
        promises.push(jobsApi.getResults(jobId, p, pageSize));
      }
      
      const pagesData = await Promise.all(promises);
      const allResults = pagesData.flatMap(res => res.results);
      const assetsToDownload = allResults
        .filter(result => isAssetSelected(getAssetSelectionKey(result)))
        .map(result => result.asset);

      const result = await downloadAssetsAsZip(assetsToDownload);
      if (result.success) {
        if (result.error) {
          // Partial success
          setDownloadMessage({ type: 'error', text: result.error });
        } else {
          setDownloadMessage({ type: 'success', text: `Successfully downloaded ${result.successfulAssets} assets.` });
        }
      } else {
        setDownloadMessage({ type: 'error', text: result.error || 'Failed to download assets.' });
      }
    } catch (err: any) {
      setDownloadMessage({ type: 'error', text: err.message || 'An unexpected error occurred during download.' });
    } finally {
      setIsDownloading(false);
    }
  };

  useDocumentTitle('Visual Results');

  useEffect(() => {
    if (!jobId) return;
    const fetchData = async () => {
      clearContext();
      try {
        const [resultsData, jobData] = await Promise.all([
          jobsApi.getResults(jobId, page, pageSize),
          jobsApi.getJob(jobId)
        ]);
        setResults(resultsData.results);
        setTotal(resultsData.total);
        setTotalPages(resultsData.total_pages);
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
        const jobIndex = jobsData.items.findIndex((j: any) => j.job_id === jobId);
        if (jobIndex !== -1) {
          setSearchNumber(jobsData.items.length - jobIndex);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load job results context');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId, page]);


  if (loading) return <Loader text="Loading visual assets..." />;

  if (error) return (
    <div className="max-w-2xl mx-auto mt-12">
      <ErrorMessage message={error} />
    </div>
  );

  return (
    <div className="space-y-6 sm:space-y-8 w-full">
      <Link
        to={`/scenes/${scene?.id}`}
        className="inline-flex items-center gap-1 text-sm font-medium text-text-muted hover:text-text-main transition-colors mb-1"
      >
        <ChevronLeft className="w-4 h-4" />
        Scene
      </Link>

      <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-border-main pb-4 sm:pb-6 mb-6 sm:mb-8">
        <div className="w-full md:w-auto overflow-hidden">
          <div className="flex flex-col gap-0.5 mb-2">
            <span className="text-xs font-semibold text-text-muted uppercase tracking-wider">{project?.name}</span>
            <span className="text-sm font-semibold text-text-secondary tracking-wide">{script?.title}</span>
          </div>
          <div className="text-sm font-semibold text-text-muted mb-3">
            Scene {scene?.order} &middot; Search #{searchNumber}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-main flex items-center gap-2 sm:gap-3 tracking-tight">
            <ImageIcon className="w-6 h-6 sm:w-8 sm:h-8 text-primary-600 shrink-0" />
            <span className="truncate">Visual Results</span>
          </h1>
        </div>
        <div className="flex items-center gap-4 bg-surface px-4 py-2.5 sm:py-2 rounded-lg border border-border-main shadow-sm w-full md:w-auto justify-between md:justify-start mt-2 md:mt-0 flex-wrap">
          <span className="text-sm font-semibold text-text-secondary">{total} visual assets</span>
          
          {total > 0 && (
            <>
              <div className="w-px h-6 bg-border-main hidden sm:block"></div>
              
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={isPageFullySelected ? handleClearPage : handleSelectPage}
                  className="text-xs px-2"
                >
                  {isPageFullySelected ? 'Clear Page' : 'Select Page'}
                </Button>
                
                {!isGlobalFullySelected && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleSelectAllResults}
                    className="text-xs px-2"
                  >
                    Select All Results
                  </Button>
                )}
                
                {selectedCount > 0 && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleClearSelection}
                    className="text-xs px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Clear Selection
                  </Button>
                )}
                
                {selectedCount > 0 && (
                  <span className="text-xs font-medium text-text-muted mx-1">
                    {selectedCount} / {total} selected
                  </span>
                )}
                
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleDownloadZip}
                  disabled={selectedCount === 0 || isDownloading}
                  className="gap-2 text-xs"
                  aria-label="Download selected assets as ZIP"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isDownloading ? 'Zipping...' : 'Download ZIP'}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>

      {results.length === 0 ? (
        <div className="text-center py-16 bg-surface-muted border border-border-main border-dashed rounded-xl text-text-muted max-w-3xl mx-auto">
          <ImageIcon className="w-12 h-12 mx-auto text-text-muted mb-4" />
          <p className="text-lg font-medium text-text-secondary">No assets found</p>
          <p className="mt-1">We couldn't find any relevant visual assets for this scene.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {downloadMessage && (
            <div className={`p-4 rounded-lg text-sm font-medium border ${
              downloadMessage.type === 'success' 
                ? 'bg-green-50 text-green-800 border-green-200' 
                : 'bg-red-50 text-red-800 border-red-200'
            }`}>
              {downloadMessage.text}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {results.map((item, idx) => (
              <AssetCard 
                key={getAssetSelectionKey(item)} 
                item={item} 
                rank={(page - 1) * pageSize + idx + 1} 
                isSelected={isAssetSelected(getAssetSelectionKey(item))}
                onToggleSelection={() => handleToggleSelection(getAssetSelectionKey(item))}
              />
            ))}
          </div>
          
          <div className="mt-8 border-t border-border-main pt-4">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={total}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        </div>
      )}
    </div>
  );
};

const AssetCard = ({ 
  item, 
  rank, 
  isSelected, 
  onToggleSelection 
}: { 
  item: SemanticSearchResult, 
  rank: number,
  isSelected: boolean,
  onToggleSelection: () => void
}) => {
  const [imgError, setImgError] = useState(false);
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="group rounded-xl h-full" style={{ perspective: '1000px' }}>
      <div 
        data-testid={`flip-card-${item.asset_id}`}
        className="w-full h-full relative rounded-xl transition-transform duration-400 shadow-sm hover:shadow-xl grid" 
        style={{ 
          transformStyle: 'preserve-3d', 
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
        }}
      >
        {/* FRONT FACE */}
        <div 
          className="flex flex-col bg-surface rounded-xl border border-border-main overflow-hidden col-start-1 row-start-1"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="relative aspect-video bg-surface-muted flex items-center justify-center overflow-hidden">
            {imgError ? (
              <div className="text-text-muted flex flex-col items-center">
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
            
            <button
              aria-label={isSelected ? "Deselect asset" : "Select asset"}
              onClick={(e) => { e.stopPropagation(); onToggleSelection(); }}
              className={`absolute top-3 left-3 z-20 p-1.5 rounded transition-colors shadow-sm backdrop-blur-md ${
                isSelected 
                  ? 'bg-primary-600 text-white' 
                  : 'bg-black/50 text-white/70 hover:bg-black/75 hover:text-white'
              }`}
            >
              {isSelected ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            </button>
            
            <div className="absolute top-3 left-12 bg-black/75 text-white text-xs font-bold px-2.5 py-1 rounded backdrop-blur-md">
              #{rank}
            </div>
            <div className="absolute top-3 right-3 bg-surface/90 text-text-main text-xs font-bold px-2.5 py-1 rounded shadow-sm capitalize backdrop-blur-md">
              {item.asset.provider}
            </div>
          </div>
          
          <div className="p-3 flex-1 flex flex-col">
            <div className="flex justify-between items-center mb-3">
              <div className="text-xs font-semibold text-text-secondary bg-surface-muted px-2 py-1 rounded">
                {item.asset.width} &times; {item.asset.height}
              </div>
              <div className="flex gap-2 sm:gap-1 relative z-10">
                <button 
                  aria-label="Why this ranked here"
                  onClick={(e) => { e.stopPropagation(); setIsFlipped(true); }}
                  className="p-2 sm:p-1.5 rounded text-text-muted hover:text-text-main hover:bg-surface-muted transition-colors"
                  title="Ranking Explanation"
                >
                  <Info className="w-5 h-5 sm:w-4 sm:h-4" />
                </button>
                <a 
                  href={item.asset.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="p-2 sm:p-1.5 rounded text-text-muted hover:text-text-main hover:bg-surface-muted transition-colors"
                  title="View Source"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-5 h-5 sm:w-4 sm:h-4" />
                </a>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-auto pt-2">
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">Final Score</span>
              <span className="text-sm font-extrabold text-primary-600">
                {item.features?.final_score !== null && item.features?.final_score !== undefined ? item.features.final_score.toFixed(3) : 'Score unavailable'}
              </span>
            </div>
          </div>
        </div>

        {/* BACK FACE */}
        <div 
          className="flex flex-col bg-surface rounded-xl border border-border-main overflow-hidden p-4 col-start-1 row-start-1"
          style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
        >
          <div className="flex-1 flex flex-col">
            <div className="font-bold text-text-main mb-3 text-sm">Why this ranked here</div>
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium text-xs">Semantic relevance</span>
                <span className="font-mono font-medium text-text-main text-xs">
                  {item.features?.semantic_score !== null && item.features?.semantic_score !== undefined ? item.features.semantic_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium text-xs">Resolution</span>
                <span className="font-mono font-medium text-text-main text-xs">
                  {item.features?.resolution_score !== null && item.features?.resolution_score !== undefined ? item.features.resolution_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-text-secondary font-medium text-xs">Orientation</span>
                <span className="font-mono font-medium text-text-main text-xs">
                  {item.features?.orientation_score !== null && item.features?.orientation_score !== undefined ? item.features.orientation_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 mt-2 border-t border-border-subtle">
                <span className="text-text-main font-bold text-xs">Final score</span>
                <span className="font-mono font-bold text-primary-600 text-xs">
                  {item.features?.final_score !== null && item.features?.final_score !== undefined ? item.features.final_score.toFixed(3) : 'Score unavailable'}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-text-muted mt-2 italic">
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
