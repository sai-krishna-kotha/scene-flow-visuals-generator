import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { JobResultsPage } from '../pages/JobResultsPage';
import { jobsApi } from '../services/api/jobs';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('../services/api/jobs', () => ({
  jobsApi: {
    getResults: vi.fn()
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
    vi.mocked(jobsApi.getResults).mockResolvedValue({ results: [] });
    
    renderWithRouter(<JobResultsPage />);
    
    expect(screen.getByText('Loading visual assets...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No assets found for this scene.')).toBeInTheDocument();
    });
  });

  it('renders ranked assets when available', async () => {
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
      expect(screen.getByText('0.930')).toBeInTheDocument(); // final score
    });
  });
});
