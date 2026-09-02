import { apiClient } from './client';
import { SearchJobResponse, JobResultsResponse } from '../../types/api';

export const jobsApi = {
  getJob: async (jobId: string): Promise<SearchJobResponse> => {
    const response = await apiClient.get<SearchJobResponse>(`/jobs/${jobId}`);
    return response.data;
  },
  
  getResults: async (jobId: string, page = 1, pageSize = 20): Promise<JobResultsResponse> => {
    const response = await apiClient.get<JobResultsResponse>(`/jobs/${jobId}/results`, {
      params: { page, page_size: pageSize }
    });
    return response.data;
  }
};
