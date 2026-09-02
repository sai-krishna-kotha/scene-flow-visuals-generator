import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DashboardPage } from '../pages/DashboardPage';
import { projectsApi } from '../services/api/projects';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { WorkspaceProvider } from '../contexts/WorkspaceContext';

vi.mock('../services/api/projects', () => ({
  projectsApi: {
    list: vi.fn(),
    create: vi.fn()
  }
}));

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>
    <WorkspaceProvider>{children}</WorkspaceProvider>
  </BrowserRouter>
);

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('renders loading state initially and then empty state', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({ 'items': [], 'page': 1, 'page_size': 20, 'total': 0, 'total_pages': 0 });
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });
  });

  it('renders projects when available', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({
      items: [
        { id: '1', name: 'Test Project', description: null, user_id: 'u1', created_at: '2023-01-01', updated_at: '2023-01-01' }
      ],
      page: 1,
      page_size: 20,
      total: 1,
      total_pages: 1
    });
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Test Project')).toBeInTheDocument();
    });
  });

  it('handles project creation', async () => {
    vi.mocked(projectsApi.list).mockResolvedValue({ 'items': [], 'page': 1, 'page_size': 20, 'total': 0, 'total_pages': 0 });
    vi.mocked(projectsApi.create).mockResolvedValue(
      { id: '2', name: 'New Project', description: null, user_id: 'u1', created_at: '2023-01-02', updated_at: '2023-01-02' }
    );
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('No projects yet')).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText('Project Name...');
    fireEvent.change(input, { target: { value: 'New Project' } });
    
    const submitBtn = screen.getByText('Create');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(projectsApi.create).toHaveBeenCalledWith({ name: 'New Project', description: '' });
      expect(screen.getByText('New Project')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(projectsApi.list).mockRejectedValue(new Error('Random API error'));
    
    render(<DashboardPage />, { wrapper: Wrapper });
    
    await waitFor(() => {
      expect(screen.getByText('Random API error')).toBeInTheDocument();
    });
  });

  it('handles initial connection failure followed by success (wake up state)', async () => {
    // Fail first request with a wake-up error
    const wakeupError = new Error('Network Error');
    vi.mocked(projectsApi.list)
      .mockRejectedValueOnce(wakeupError)
      .mockResolvedValueOnce({
        items: [
          { id: '1', name: 'Woke Up Project', description: null, user_id: 'u1', created_at: '2023-01-01', updated_at: '2023-01-01' }
        ],
        page: 1,
        page_size: 20,
        total: 1,
        total_pages: 1
      });
      
    render(<DashboardPage />, { wrapper: Wrapper });
    
    // Initially shows default loader
    expect(screen.getByText('Loading projects...')).toBeInTheDocument();
    
    // Will transition to wake-up state and then succeed very quickly due to test delay=10ms
    await waitFor(() => {
      expect(screen.getByText('Waking up SceneFlow...')).toBeInTheDocument();
      expect(screen.getByText('The server is starting. This may take a few seconds.')).toBeInTheDocument();
    });
    
    // Wait for the second fetch (success) to resolve
    await waitFor(() => {
      expect(screen.getByText('Woke Up Project')).toBeInTheDocument();
    });
  });

  it('handles repeated failure leading to Still starting and eventually Retry state', async () => {
    // Fail all requests with a wake-up error
    const wakeupError = new Error('Network Error');
    vi.mocked(projectsApi.list).mockRejectedValue(wakeupError);
      
    render(<DashboardPage />, { wrapper: Wrapper });
    
    // Attempt 0 -> fails -> sets attempt 1 -> Wakeup state
    await waitFor(() => {
      expect(screen.getByText('Waking up SceneFlow...')).toBeInTheDocument();
    });
    
    // Should now show the "Still starting" message (after 3 attempts * 10ms)
    await waitFor(() => {
      expect(screen.getByText('Still starting...')).toBeInTheDocument();
      expect(screen.getByText('SceneFlow is taking a little longer than usual.')).toBeInTheDocument();
    });
    
    // Should show failure state (after 5 attempts)
    await waitFor(() => {
      expect(screen.getByText("Couldn't connect to SceneFlow")).toBeInTheDocument();
      expect(screen.getByText('Check your connection and try again.')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Retry' })).toBeInTheDocument();
    });
  });
});
