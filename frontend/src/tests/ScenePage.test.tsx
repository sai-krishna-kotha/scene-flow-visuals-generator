import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScenePage } from '../pages/ScenePage';
import { scenesApi } from '../services/api/scenes';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { Scene, Script, Project } from '../types/api';

vi.mock('../services/api/scenes', () => ({
  scenesApi: {
    get: vi.fn(),
    analyze: vi.fn(),
    search: vi.fn(),
    listForScript: vi.fn(),
    listJobs: vi.fn(),
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

const mockScene: Scene = {
  id: 'scene-123',
  script_id: 'script-123',
  order: 1,
  sentence_text: 'A test scene sentence',
  status: 'analyzed',
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
};

describe('ScenePage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends correct payload for asset search', async () => {
    vi.mocked(scenesApi.get).mockResolvedValue(mockScene);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-123', title: 'Script 1', project_id: 'proj-123', full_text: '...', orientation_preference: 'landscape', created_at: '2023-01-01', updated_at: '2023-01-01' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-123', name: 'Project 1', description: null, user_id: 'u1', created_at: '2023-01-01', updated_at: '2023-01-01' });
    vi.mocked(scenesApi.listForScript).mockResolvedValue([mockScene]);
    vi.mocked(scenesApi.listJobs).mockResolvedValue([]);
    vi.mocked(scenesApi.search).mockResolvedValue({ job_id: 'job-123', scene_id: 'scene-1', status: 'PENDING', requested_query: 'test', ranking_version: 'v1', created_at: null, updated_at: null, error_message: null });

    render(
      <MemoryRouter initialEntries={['/scenes/scene-123']}>
        <Routes>
          <Route path="/scenes/:sceneId" element={<ScenePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the scene to load
    await screen.findByText(/A test scene sentence/i);

    // Click "Search Visual Assets"
    const searchButton = screen.getByText('Search Visual Assets');
    fireEvent.click(searchButton);

    // Verify the correct payload was sent to scenesApi.search
    await waitFor(() => {
      expect(scenesApi.search).toHaveBeenCalledWith('scene-123', {
        query: 'A test scene sentence',
        limit: 20,
        orientation: 'landscape'
      });
    });
  });
});
