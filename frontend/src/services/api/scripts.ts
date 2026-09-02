import { apiClient } from './client';
import { Script, Scene, PaginatedResponse } from '../../types/api';

export const scriptsApi = {
  listForProject: async (projectId: string, page = 1, pageSize = 20): Promise<PaginatedResponse<Script>> => {
    const response = await apiClient.get<PaginatedResponse<Script>>(`/projects/${projectId}/scripts`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  },
  
  get: async (scriptId: string): Promise<Script> => {
    const response = await apiClient.get<Script>(`/scripts/${scriptId}`);
    return response.data;
  },
  
  segment: async (scriptId: string): Promise<Scene[]> => {
    const response = await apiClient.post<Scene[]>(`/scripts/${scriptId}/segment`);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/scripts/${id}`);
  },

  create: async (projectId: string, data: { title: string; full_text: string; orientation_preference: 'all' | 'landscape' | 'portrait' | 'square' }): Promise<Script> => {
    const response = await apiClient.post<Script>(`/projects/${projectId}/scripts`, data);
    return response.data;
  },
};
