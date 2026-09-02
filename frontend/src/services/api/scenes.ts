import { apiClient } from './client';
import { Scene, SceneAnalysisResponse, SearchJobResponse, PaginatedResponse } from '../../types/api';

export const scenesApi = {
  listForScript: async (scriptId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Scene>> => {
    const response = await apiClient.get<PaginatedResponse<Scene>>(`/scripts/${scriptId}/scenes`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  },
  
  get: async (sceneId: string): Promise<Scene> => {
    const response = await apiClient.get<Scene>(`/scenes/${sceneId}`);
    return response.data;
  },
  
  create: async (scriptId: string, data: { sentence_text: string; order: number }): Promise<Scene> => {
    const response = await apiClient.post<Scene>(`/scripts/${scriptId}/scenes`, data);
    return response.data;
  },

  analyze: async (sceneId: string): Promise<SceneAnalysisResponse> => {
    const response = await apiClient.post<SceneAnalysisResponse>(`/scenes/${sceneId}/analyze`);
    return response.data;
  },

  search: async (sceneId: string, data: { query: string; limit?: number; orientation?: 'all' | 'landscape' | 'portrait' | 'square' }): Promise<SearchJobResponse> => {
    const response = await apiClient.post<SearchJobResponse>(`/scenes/${sceneId}/search`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/scenes/${id}`);
  },

  listJobs: async (sceneId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<SearchJobResponse>> => {
    const response = await apiClient.get<PaginatedResponse<SearchJobResponse>>(`/scenes/${sceneId}/jobs`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  }
};
