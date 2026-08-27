import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ScriptPage } from '../pages/ScriptPage';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';
import { scenesApi } from '../services/api/scenes';

vi.mock('../services/api/projects', () => ({
  projectsApi: { get: vi.fn() }
}));
vi.mock('../services/api/scripts', () => ({
  scriptsApi: { get: vi.fn() }
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
    vi.mocked(scenesApi.listForScript).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/scripts/script-1']}>
        <Routes>
          <Route path="/projects/:projectId/scripts/:scriptId" element={<ScriptPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByRole('heading', { name: 'Script 1', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Full Script Text Content')).toBeInTheDocument();
    expect(screen.getByText('No scenes yet.')).toBeInTheDocument();
  });

  it('renders scene list correctly and handles modal', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Project 1' } as any);
    vi.mocked(scriptsApi.get).mockResolvedValue({ id: 'script-1', title: 'Script 1', full_text: 'Content', orientation_preference: 'landscape' } as any);
    vi.mocked(scenesApi.listForScript).mockResolvedValue([
      { id: 'scene-1', order: 1, sentence_text: 'Scene text 1', status: 'pending' } as any
    ]);

    render(
      <MemoryRouter initialEntries={['/projects/proj-1/scripts/script-1']}>
        <Routes>
          <Route path="/projects/:projectId/scripts/:scriptId" element={<ScriptPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Scene text 1')).toBeInTheDocument();
    
    // Check Modal
    const addSceneBtns = screen.getAllByRole('button', { name: /Add Scene/i });
    fireEvent.click(addSceneBtns[0]);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Describe the visual action or setting/i)).toBeInTheDocument();
  });
});
