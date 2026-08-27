import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';
import { projectsApi } from '../services/api/projects';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';

vi.mock('../services/api/projects', () => ({
  projectsApi: {
    list: vi.fn(),
    create: vi.fn()
  }
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially and then empty state', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No projects found. Create one to get started.')).toBeInTheDocument();
    });
  });

  it('renders projects when available', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([
      { id: '1', name: 'Test Project', description: null, user_id: 'u1', created_at: '2023-01-01', updated_at: '2023-01-01' }
    ]);
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('handles project creation', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue([]);
    vi.mocked(projectsApi.create).mockResolvedValue(
      { id: '2', name: 'New Project', description: null, user_id: 'u1', created_at: '2023-01-02', updated_at: '2023-01-02' }
    );
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('No projects found. Create one to get started.')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('New Project Name');
    fireEvent.change(input, { target: { value: 'New Project' } });
    
    const submitBtn = screen.getByText('Create Project');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalledWith({ name: 'New Project', description: '' });
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error('Network failure'));
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Network failure')).toBeInTheDocument();
    });
  });
});
