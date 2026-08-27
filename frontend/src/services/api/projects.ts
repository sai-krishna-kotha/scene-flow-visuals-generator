import { apiClient } from './client';
import { Project } from '../../types/api';

export const projectsApi = {
  list: async (): Promise<Project[]> => {
    const response = await apiClient.get<Project[]>('/projects/');
    return response.data;
  },
  
  get: async (id: string): Promise<Project> => {
    const response = await apiClient.get<Project>(`/projects/${id}`);
    return response.data;
  },
  
  create: async (data: { name: string; description?: string }): Promise<Project> => {
    const response = await apiClient.post<Project>('/projects/', data);
    return response.data;
  },
};
