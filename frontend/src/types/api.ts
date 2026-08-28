export interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Script {
  id: string;
  project_id: string;
  title: string;
  full_text: string;
  orientation_preference: 'all' | 'landscape' | 'portrait' | 'square';
  created_at: string;
  updated_at: string;
}

export interface Scene {
  id: string;
  script_id: string;
  order: number;
  title: string | null;
  sentence_text: string;
  status: 'pending' | 'analyzed';
  created_at: string;
  updated_at: string;
}

export interface SceneAnalysis {
  summary: string;
  subjects: string[];
  actions: string[];
  environment: string[];
  mood: string;
  time_context: string;
  visual_queries: string[];
}

export interface SceneAnalysisResponse {
  scene_id: string;
  analysis: SceneAnalysis;
}

export type JobStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface SearchJobResponse {
  job_id: string;
  scene_id: string;
  status: JobStatus;
  requested_query: string;
  ranking_version: string;
  created_at: string | null;
  updated_at: string | null;
  error_message: string | null;
  result_count?: number;
}

export interface RankingFeatures {
  semantic_score: number;
  resolution_score: number;
  orientation_score: number;
  final_score: number;
}

export interface Asset {
  id: string;
  scene_id: string;
  provider: string;
  provider_asset_id: string;
  url: string;
  thumbnail_url: string;
  source_url: string;
  width: number;
  height: number;
  mime_type: string;
  created_at: string;
}

export interface SemanticSearchResult {
  asset: Asset;
  similarity: number;
  features: RankingFeatures;
}

export interface JobResultsResponse {
  results: SemanticSearchResult[];
}
