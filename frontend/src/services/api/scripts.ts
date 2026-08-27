import { apiClient } from './client';
import { Script, Scene } from '../../types/api';

export const scriptsApi = {
  listForProject: async (projectId: string): Promise<Script[]> => {
    const response = await apiClient.get<Script[]>(`/projects/${projectId}/scripts`);
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

  create: async (projectId: string, data: { title: string; full_text: string; orientation_preference: 'landscape' | 'portrait' | 'square' }): Promise<Script> => {
    const response = await apiClient.post<Script>(`/projects/${projectId}/scripts`, data);
    return response.data;
  },
};
