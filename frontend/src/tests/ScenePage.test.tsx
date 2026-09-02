import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScenePage } from '../pages/ScenePage';
import { scenesApi } from '../services/api/scenes';
import { scriptsApi } from '../services/api/scripts';
import { projectsApi } from '../services/api/projects';
import { Scene, Script, Project } from '../types/api';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

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
  title: null,
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
        <WorkspaceProvider>
          <Routes>
            <Route path="/scenes/:sceneId" element={<ScenePage />} />
          </Routes>
        </WorkspaceProvider>
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

  it('hides navigation for single-scene script', async () => {
    vi.mocked(scenesApi.get).mockResolvedValue(mockScene);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-123', title: 'Script 1', project_id: 'proj-123', full_text: '...', orientation_preference: 'landscape', created_at: '', updated_at: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-123', name: 'Project 1', description: null, user_id: 'u1', created_at: '', updated_at: '' });
    vi.mocked(scenesApi.listForScript).mockResolvedValue([mockScene]); // Only 1 scene
    vi.mocked(scenesApi.listJobs).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/scenes/scene-123']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/scenes/:sceneId" element={<ScenePage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    await screen.findByText(/A test scene sentence/i);
    expect(screen.queryByText(/Previous Scene/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Next Scene/i)).not.toBeInTheDocument();
  });

  it('shows navigation and disables correctly for multi-scene script', async () => {
    const scene2 = { ...mockScene, id: 'scene-2', order: 2 };
    const scene3 = { ...mockScene, id: 'scene-3', order: 3 };

    vi.mocked(scenesApi.get).mockResolvedValue(scene2); // Currently on middle scene
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-123', title: 'Script 1', project_id: 'proj-123', full_text: '...', orientation_preference: 'landscape', created_at: '', updated_at: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-123', name: 'Project 1', description: null, user_id: 'u1', created_at: '', updated_at: '' });
    vi.mocked(scenesApi.listForScript).mockResolvedValue([mockScene, scene2, scene3]);
    vi.mocked(scenesApi.listJobs).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/scenes/scene-2']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/scenes/:sceneId" element={<ScenePage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    await screen.findAllByText(/Scene 2 of 3/i);
    const prevBtn = screen.getByRole('button', { name: /Previous Scene/i });
    const nextBtn = screen.getByRole('button', { name: /Next Scene/i });
    expect(prevBtn).not.toBeDisabled();
    expect(nextBtn).not.toBeDisabled();

    // Now test first scene
    vi.mocked(scenesApi.get).mockResolvedValue(mockScene);
    render(
      <MemoryRouter initialEntries={['/scenes/scene-123']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/scenes/:sceneId" element={<ScenePage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );
    await screen.findAllByText(/Scene 1 of 3/i);
    expect(screen.getAllByRole('button', { name: /Previous Scene/i })[1]).toBeDisabled();
    expect(screen.getAllByRole('button', { name: /Next Scene/i })[1]).not.toBeDisabled();
  });

  it('displays correct analysis states without using Pending Analysis incorrectly', async () => {
    const unanalyzedScene: Scene = { ...mockScene, status: 'pending' };
    vi.mocked(scenesApi.get).mockResolvedValue(unanalyzedScene);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-123', title: 'Script 1', project_id: 'proj-123', full_text: '...', orientation_preference: 'landscape', created_at: '', updated_at: '' });
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-123', name: 'Project 1', description: null, user_id: 'u1', created_at: '', updated_at: '' });
    vi.mocked(scenesApi.listForScript).mockResolvedValue([unanalyzedScene]);
    vi.mocked(scenesApi.listJobs).mockResolvedValue([{ job_id: 'job-123', scene_id: 'scene-1', status: 'COMPLETED', requested_query: 'test', ranking_version: 'v1', created_at: null, updated_at: null, error_message: null }]); // Has completed visual search!

    render(
      <MemoryRouter initialEntries={['/scenes/scene-123']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/scenes/:sceneId" element={<ScenePage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    await screen.findByText(/A test scene sentence/i);
    
    // Should NOT show Pending Analysis badge just because it's not analyzed
    expect(screen.queryByText('Pending Analysis')).not.toBeInTheDocument();
    
    // Shows the completed job in history
    expect(screen.getByText('Search 1')).toBeInTheDocument();
    
    // Simulate analyzing state
    vi.mocked(scenesApi.analyze).mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ scene_id: 'scene-123', analysis: { summary: 'Analysis text', subjects: [], actions: [], environment: [], mood: 'calm', time_context: 'day', visual_queries: [] } }), 100)));
    
    fireEvent.click(screen.getAllByText('Analyze with Gemini')[0]);
    await waitFor(() => {
      expect(screen.getAllByText('Analyzing...').length).toBeGreaterThan(0);
    });
    
    // Wait for analysis to complete
    expect(await screen.findByText('Analyzed')).toBeInTheDocument();
  });
});
