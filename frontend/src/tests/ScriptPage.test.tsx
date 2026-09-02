import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScriptPage } from '../pages/ScriptPage';
import { projectsApi } from '../services/api/projects';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';

vi.mock('../services/api/projects', () => ({
  projectsApi: { get: vi.fn() }
}));
vi.mock('../services/api/scripts', () => ({
  scriptsApi: { get: vi.fn(), segment: vi.fn() }
}));
vi.mock('../services/api/scenes', () => ({
  scenesApi: { listForScript: vi.fn(), create: vi.fn() }
}));

describe('ScriptPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders script text and empty scenes', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Project 1' } as any);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-1', title: 'Script 1', full_text: 'Full Script Text Content', orientation_preference: 'landscape' } as any);
    vi.mocked(scenesApi.listForScript).mockResolvedValue({ 'items': [], 'page': 1, 'page_size': 20, 'total': 0, 'total_pages': 0 });

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/scripts/script-1']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/projects/:projectId/scripts/:scriptId" element={<ScriptPage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Script 1', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Full Script Text Content')).toBeInTheDocument();
    expect(screen.getByText('No scenes yet.')).toBeInTheDocument();
    
    // Check Generate Scenes button exists
    expect(screen.getAllByRole('button', { name: /Generate Scenes with Gemini/i })[0]).toBeInTheDocument();
  });

  it('handles generate scenes success', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Project 1' } as any);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-1', title: 'Script 1', full_text: 'Full Script Text Content', orientation_preference: 'landscape' } as any);
    vi.mocked(scenesApi.listForScript).mockResolvedValue({ 'items': [], 'page': 1, 'page_size': 20, 'total': 0, 'total_pages': 0 });
    vi.mocked(scriptsApi.segment).mockResolvedValue([
      { id: 's1', script_id: 'script-1', title: 'Gen Scene', order: 1, sentence_text: 'Generated text 1', status: 'pending', created_at: '', updated_at: '' } as any
    ]);

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/scripts/script-1']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/projects/:projectId/scripts/:scriptId" element={<ScriptPage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('No scenes yet.')).toBeInTheDocument();
    
    // Click Generate Scenes
    const generateBtns = screen.getAllByRole('button', { name: /Generate Scenes with Gemini/i });
    fireEvent.click(generateBtns[0]);
    
    expect(await screen.findByText('Gen Scene')).toBeInTheDocument();
    expect(screen.getByText('Generated text 1')).toBeInTheDocument();
  });

  it('renders scene list correctly and handles modal', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Project 1' } as any);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-1', title: 'Script 1', full_text: 'Content', orientation_preference: 'landscape' } as any);
    vi.mocked(scenesApi.listForScript).mockResolvedValue({
      items: [
        { id: 'sc1', script_id: 'script-1', title: 'Scene 1', order: 1, sentence_text: 'Scene text 1', status: 'pending', created_at: '', updated_at: '' } as any
      ],
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1
    });

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/scripts/script-1']}>
        <WorkspaceProvider>
          <Routes>
            <Route path="/projects/:projectId/scripts/:scriptId" element={<ScriptPage />} />
          </Routes>
        </WorkspaceProvider>
      </MemoryRouter>
    );

    expect(await screen.findByText('Scene text 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Scene/i })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /view more/i })).not.toBeInTheDocument();
    
    // Check Modal
    const addSceneBtns = screen.getAllByRole('button', { name: /Add Scene/i });
    fireEvent.click(addSceneBtns[0]);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the visual action or setting/i)).toBeInTheDocument();
  });
});
