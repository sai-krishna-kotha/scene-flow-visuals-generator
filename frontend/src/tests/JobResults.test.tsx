import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { JobResultsPage } from '../pages/JobResultsPage';
import { jobsApi } from '../services/api/jobs';
import { scenesApi } from '../services/api/scenes';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

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
      <WorkspaceProvider>
        <Routes>
          <Route path="/jobs/:jobId/results" element={ui} />
        </Routes>
      </WorkspaceProvider>
    </MemoryRouter>
  );
};

describe('JobResultsPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially and then empty state if no results', async () => {
    vi.mocked(jobsApi.getResults).mockResolvedValue({ results: [] });
    vi.mocked(jobsApi.getJob).mockResolvedValue({ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1', error_message: null });
    vi.mocked(scenesApi.get).mockResolvedValue({ id: 's1', script_id: 'sc1', order: 1, title: null, sentence_text: 'Test', created_at: '', updated_at: '', status: 'analyzed' });
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'sc1', project_id: 'p1', title: 'Script', orientation_preference: 'landscape', created_at: '', updated_at: '', full_text: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Project', description: '', created_at: '', updated_at: '', user_id: 'u1' });
    vi.mocked(scenesApi.listJobs).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 1, total_pages: 1 });
    
    renderWithRouter(<JobResultsPage />);
    
    expect(screen.getByText('Loading visual assets...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No assets found')).toBeInTheDocument();
    });
  });

  it('renders ranked assets when available', async () => {
    vi.mocked(jobsApi.getJob).mockResolvedValue({ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1', error_message: null });
    vi.mocked(scenesApi.get).mockResolvedValue({ id: 's1', script_id: 'sc1', order: 1, title: null, sentence_text: 'Test', created_at: '', updated_at: '', status: 'analyzed' });
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'sc1', project_id: 'p1', title: 'Script', orientation_preference: 'landscape', created_at: '', updated_at: '', full_text: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Project', description: '', created_at: '', updated_at: '', user_id: 'u1' });
    vi.mocked(scenesApi.listJobs).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 1, total_pages: 1 });

    vi.mocked(jobsApi.getResults).mockResolvedValue({
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
      expect(screen.getAllByText('0.930').length).toBeGreaterThan(0); // final score
    });
  });

  it('handles flip card interactions correctly', async () => {
    vi.mocked(jobsApi.getJob).mockResolvedValue({ job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: '', updated_at: '', requested_query: 'test', ranking_version: '1', error_message: null });
    vi.mocked(scenesApi.get).mockResolvedValue({ id: 's1', script_id: 'sc1', order: 1, title: null, sentence_text: 'Test', created_at: '', updated_at: '', status: 'analyzed' });
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'sc1', project_id: 'p1', title: 'Script', orientation_preference: 'landscape', created_at: '', updated_at: '', full_text: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'p1', name: 'Project', description: '', created_at: '', updated_at: '', user_id: 'u1' });
    vi.mocked(scenesApi.listJobs).mockResolvedValue({ items: [], page: 1, page_size: 20, total: 1, total_pages: 1 });

    vi.mocked(jobsApi.getResults).mockResolvedValue({
      results: [
        {
          asset: { id: 'a1', scene_id: 's1', provider: 'pexels', provider_asset_id: '1', url: 'http://img1', thumbnail_url: 'http://thumb1', source_url: 'http://source1', width: 1920, height: 1080, mime_type: 'image/jpeg', created_at: '2023-01-01' },
          similarity: 0.9,
          features: { semantic_score: 0.796, resolution_score: 0.900, orientation_score: 1.0, final_score: 0.844 }
        },
        {
          asset: { id: 'a2', scene_id: 's1', provider: 'pexels', provider_asset_id: '2', url: 'http://img2', thumbnail_url: 'http://thumb2', source_url: 'http://source2', width: 1920, height: 1080, mime_type: 'image/jpeg', created_at: '2023-01-01' },
          similarity: 0.8,
          features: { semantic_score: 0.700, resolution_score: 0.800, orientation_score: 0.9, final_score: 0.750 }
        }
      ]
    });
    
    renderWithRouter(<JobResultsPage />);
    
    // Wait for the info buttons to render
    const infoButtons = await screen.findAllByRole('button', { name: 'Why this ranked here' });
    expect(infoButtons).toHaveLength(2);

    const card1 = screen.getByTestId('flip-card-a1');
    const card2 = screen.getByTestId('flip-card-a2');

    // 1. all cards initially show FRONT
    expect(card1).toHaveStyle({ transform: 'rotateY(0deg)' });
    expect(card2).toHaveStyle({ transform: 'rotateY(0deg)' });

    // 2. clicking Card A info flips only Card A
    fireEvent.click(infoButtons[0]);
    expect(card1).toHaveStyle({ transform: 'rotateY(180deg)' });
    
    // 3. Card B remains FRONT
    expect(card2).toHaveStyle({ transform: 'rotateY(0deg)' });

    // 4. Card B can independently flip
    fireEvent.click(infoButtons[1]);
    expect(card2).toHaveStyle({ transform: 'rotateY(180deg)' });

    // 5. multiple cards can remain flipped simultaneously
    expect(card1).toHaveStyle({ transform: 'rotateY(180deg)' });
    expect(card2).toHaveStyle({ transform: 'rotateY(180deg)' });

    // 6. clicking Card A "See Image" returns only Card A to FRONT
    const seeImageButtons = await screen.findAllByRole('button', { name: 'See image' });
    expect(seeImageButtons).toHaveLength(2);
    
    fireEvent.click(seeImageButtons[0]);
    expect(card1).toHaveStyle({ transform: 'rotateY(0deg)' });
    expect(card2).toHaveStyle({ transform: 'rotateY(180deg)' });
  });
});
