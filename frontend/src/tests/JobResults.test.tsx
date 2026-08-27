import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { JobResultsPage } from '../pages/JobResultsPage';
import { jobsApi } from '../services/api/jobs';
import { scenesApi } from '../services/api/scenes';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/api/jobs', () => ({
  jobsApi: {
    getResults: vi.fn(),
    getJob: vi.fn()
  }
}));

vi.mock('../services/api/scenes', () => ({
  scenesApi: {
    get: vi.fn(),
    listJobs: vi.fn()
  }
}));

vi.mock('../services/api/scripts', () => ({
  scriptsApi: {
    get: vi.fn()
  }
}));

vi.mock('../services/api/projects', () => ({
  projectsApi: {
    get: vi.fn()
  }
}));

const renderWithRouter = (ui: React.ReactElement, { route = '/jobs/1/results' } = {}) => {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Routes>
        <Route path="/jobs/:jobId/results" element={ui} />
      </Routes>
    </MemoryRouter>
  );
};

describe('JobResultsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially and then empty state if no results', async () => {
    vi.mocked(jobsApi.getResults).mockResolvedValue({ results: [], query: 'test' });
    vi.mocked(jobsApi.getJob).mockResolvedValue({ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1' });
    vi.mocked(scenesApi.get).mockResolvedValue({ id: 's1', script_id: 'sc1', order: 1, sentence_text: 'Test', created_at: '', updated_at: '' });
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'sc1', project_id: 'p1', title: 'Script', orientation_preference: 'landscape', created_at: '', updated_at: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Project', description: '', created_at: '', updated_at: '' });
    vi.mocked(scenesApi.listJobs).mockResolvedValue([{ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1' }]);
    
    renderWithRouter(<JobResultsPage />);
    
    expect(screen.getByText('Loading visual assets...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No assets found')).toBeInTheDocument();
    });
  });

  it('renders ranked assets when available', async () => {
    vi.mocked(jobsApi.getJob).mockResolvedValue({ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1' });
    vi.mocked(scenesApi.get).mockResolvedValue({ id: 's1', script_id: 'sc1', order: 1, sentence_text: 'Test', created_at: '', updated_at: '' });
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'sc1', project_id: 'p1', title: 'Script', orientation_preference: 'landscape', created_at: '', updated_at: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Project', description: '', created_at: '', updated_at: '' });
    vi.mocked(scenesApi.listJobs).mockResolvedValue([{ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1' }]);

    vi.mocked(jobsApi.getResults).mockResolvedValue({
      query: 'test',
      results: [
        {
          asset: {
            id: 'a1',
            scene_id: 's1',
            provider: 'pexels',
            provider_asset_id: '1',
            url: 'http://img',
            thumbnail_url: 'http://thumb',
            source_url: 'http://source',
            width: 1920,
            height: 1080,
            mime_type: 'image/jpeg',
            created_at: '2023-01-01'
          },
          similarity: 0.9,
          features: {
            semantic_score: 0.9,
            resolution_score: 1.0,
            orientation_score: 1.0,
            final_score: 0.93
          }
        }
      ]
    });
    
    renderWithRouter(<JobResultsPage />);
    
    await waitFor(() => {
      expect(screen.getByText('1920 × 1080')).toBeInTheDocument();
      expect(screen.getByText('pexels')).toBeInTheDocument();
      expect(screen.getByText('0.930')).toBeInTheDocument(); // final score
    });
  });
});
