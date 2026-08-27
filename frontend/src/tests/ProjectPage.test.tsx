import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ProjectPage } from '../pages/ProjectPage';
import { projectsApi } from '../services/api/projects';
import { scriptsApi } from '../services/api/scripts';

vi.mock('../services/api/projects', () => ({
  projectsApi: {
    get: vi.fn(),
  }
}));

vi.mock('../services/api/scripts', () => ({
  scriptsApi: {
    listForProject: vi.fn(),
    create: vi.fn(),
  }
}));

describe('ProjectPage Component', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders project page empty state and opens script modal', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Test Project', description: 'Desc', user_id: 'u1', created_at: '', updated_at: '' });
    vi.mocked(scriptsApi.listForProject).mockResolvedValue([]);

    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    );

    // Initial render
    expect(await screen.findByRole('heading', { name: 'Test Project', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Desc')).toBeInTheDocument();
    expect(screen.getByText('No scripts yet.')).toBeInTheDocument();
    
    // Modal shouldn't be visible yet
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    // Open Modal
    const newScriptBtns = screen.getAllByRole('button', { name: /New Script/i });
    fireEvent.click(newScriptBtns[0]);

    // Modal should appear
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Create New Script')).toBeInTheDocument();
    
    // Close Modal
    fireEvent.click(screen.getByLabelText('Close modal'));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  it('renders script items correctly', async () => {
    vi.mocked(projectsApi.get).mockResolvedValue({ id: 'proj-1', name: 'Test Project', description: null, user_id: 'u1', created_at: '', updated_at: '' });
    vi.mocked(scriptsApi.listForProject).mockResolvedValue([
      { id: 'script-1', project_id: 'proj-1', title: 'Script 1', full_text: 'Preview text for script 1', orientation_preference: 'landscape', created_at: '', updated_at: '2026-08-27T00:00:00Z' }
    ]);

    render(
      <MemoryRouter initialEntries={['/projects/proj-1']}>
        <Routes>
          <Route path="/projects/:projectId" element={<ProjectPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('Script 1')).toBeInTheDocument();
    expect(screen.getByText('Preview text for script 1')).toBeInTheDocument();
    expect(screen.getByText('landscape')).toBeInTheDocument();
    expect(screen.getByText(/Updated/)).toBeInTheDocument();
    
    expect(screen.getByText('Script 1')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Open Script/i })).toBeInTheDocument();
  });
});
