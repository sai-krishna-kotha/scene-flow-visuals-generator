import { apiClient } from './client';
import { Scene, SceneAnalysisResponse, SearchJobResponse } from '../../types/api';

export const scenesApi = {
  listForScript: async (scriptId: string): Promise<Scene[]> => {
    const response = await apiClient.get<Scene[]>(`/scripts/${scriptId}/scenes`);
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

  search: async (sceneId: string, data: { query: string; limit?: number; orientation?: 'landscape' | 'portrait' | 'square' }): Promise<SearchJobResponse> => {
    const response = await apiClient.post<SearchJobResponse>(`/scenes/${sceneId}/search`, data);
    return response.data;
  }
};
