import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScenePage } from '../pages/ScenePage';
import { scenesApi } from '../services/api/scenes';
import { Scene } from '../types/api';

vi.mock('../services/api/scenes', () => ({
  scenesApi: {
    get: vi.fn(),
    analyze: vi.fn(),
    search: vi.fn(),
  }
}));

const mockScene: Scene = {
  id: 'scene-123',
  script_id: 'script-123',
  order: 1,
  sentence_text: 'A test scene sentence',
  status: 'pending',
  created_at: '2023-01-01',
  updated_at: '2023-01-01',
};

describe('ScenePage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('sends correct payload for asset search', async () => {
    vi.mocked(scenesApi.get).mockResolvedValue(mockScene);
    vi.mocked(scenesApi.search).mockResolvedValue({
      job_id: 'job-123',
      scene_id: 'scene-123',
      status: 'PENDING',
      created_at: null,
      updated_at: null,
      error_message: null
    });

    render(
      <MemoryRouter initialEntries={['/scenes/scene-123']}>
        <Routes>
          <Route path="/scenes/:sceneId" element={<ScenePage />} />
        </Routes>
      </MemoryRouter>
    );

    // Wait for the scene to load
    await screen.findByText(/A test scene sentence/i);

    // Click "Find Visual Assets"
    const searchButton = screen.getByText('Find Visual Assets');
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
