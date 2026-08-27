import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Image as ImageIcon, ChevronRight, ExternalLink, Info } from 'lucide-react';
import { jobsApi } from '../services/api/jobs';
import { SemanticSearchResult } from '../types/api';
import { Card, Loader, ErrorMessage } from '../components/ui';

export const JobResultsPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [results, setResults] = useState<SemanticSearchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;
    const fetchResults = async () => {
      try {
        const data = await jobsApi.getResults(jobId);
        setResults(data.results);
      } catch (err: any) {
        setError(err.message || 'Failed to load job results');
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [jobId]);

  if (loading) return <Loader text="Loading visual assets..." />;

  if (error) return (
    <div className="max-w-2xl mx-auto mt-12">
      <ErrorMessage message={error} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-surface-900 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-primary-600" />
          Ranked Visual Assets
        </h1>
        <div className="text-sm text-surface-600">
          Showing {results.length} results
        </div>
      </div>

      {results.length === 0 ? (
        <Card className="text-center py-16 text-surface-600">
          <ImageIcon className="w-12 h-12 mx-auto text-surface-300 mb-4" />
          <p className="text-lg">No assets found for this scene.</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {results.map((item, idx) => (
            <AssetCard key={item.asset.id} item={item} rank={idx + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const AssetCard = ({ item, rank }: { item: SemanticSearchResult, rank: number }) => {
  const [imgError, setImgError] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  return (
    <Card className="overflow-hidden p-0 flex flex-col hover:shadow-lg transition-shadow bg-white">
      <div className="relative aspect-video bg-surface-100 flex items-center justify-center overflow-hidden">
        {imgError ? (
          <div className="text-surface-400 flex flex-col items-center">
            <ImageIcon className="w-8 h-8 mb-2" />
            <span className="text-xs">Image unavailable</span>
          </div>
        ) : (
          <img 
            src={item.asset.thumbnail_url} 
            alt={`Visual asset from ${item.asset.provider}`}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs font-bold px-2 py-1 rounded-full backdrop-blur-sm">
          #{rank}
        </div>
        <div className="absolute top-2 right-2 bg-white/90 text-surface-900 text-xs font-medium px-2 py-1 rounded shadow-sm capitalize backdrop-blur-sm">
          {item.asset.provider}
        </div>
      </div>
      
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex justify-between items-center mb-3">
          <div className="text-sm font-medium text-surface-900">
            {item.asset.width} &times; {item.asset.height}
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setShowDetails(!showDetails)}
              className="text-surface-500 hover:text-primary-600 transition-colors p-1"
              title="Ranking Explanation"
            >
              <Info className="w-4 h-4" />
            </button>
            <a 
              href={item.asset.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-surface-500 hover:text-primary-600 transition-colors p-1"
              title="View Source"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        <div className="flex justify-between items-center mt-auto border-t border-surface-100 pt-3">
          <span className="text-xs text-surface-500 uppercase tracking-wide">Final Score</span>
          <span className="text-sm font-bold text-primary-700 bg-primary-50 px-2 py-0.5 rounded">
            {item.features.final_score.toFixed(3)}
          </span>
        </div>

        {showDetails && (
          <div className="mt-3 bg-surface-50 p-3 rounded text-xs space-y-2 border border-surface-100">
            <div className="font-semibold text-surface-700 mb-1 border-b border-surface-200 pb-1">Scoring Breakdown</div>
            <div className="flex justify-between">
              <span className="text-surface-600">Semantic Relevance (70%)</span>
              <span className="font-mono">{item.features.semantic_score.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-600">Resolution (15%)</span>
              <span className="font-mono">{item.features.resolution_score.toFixed(3)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-surface-600">Orientation (15%)</span>
              <span className="font-mono">{item.features.orientation_score.toFixed(3)}</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
