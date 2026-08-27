import { renderHook, waitFor } from '@testing-library/react';
import { useJobPolling } from '../hooks/useJobPolling';
import { jobsApi } from '../services/api/jobs';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import type { SearchJobResponse } from '../types/api';

vi.mock('../services/api/jobs', () => ({
  jobsApi: {
    getJob: vi.fn()
  }
}));

describe('useJobPolling hook', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('polls while status is PENDING or RUNNING and stops when COMPLETED', async () => {
    let mockResponseIndex = 0;
    const responses: SearchJobResponse[] = [
      { job_id: '1', scene_id: 's1', status: 'PENDING', created_at: null, updated_at: null, error_message: null },
      { job_id: '1', scene_id: 's1', status: 'RUNNING', created_at: null, updated_at: null, error_message: null },
      { job_id: '1', scene_id: 's1', status: 'COMPLETED', created_at: null, updated_at: null, error_message: null }
    ];

    vi.mocked(jobsApi.getJob).mockImplementation(() => {
      const res = responses[mockResponseIndex] || responses[responses.length - 1];
      mockResponseIndex++;
      return Promise.resolve(res);
    });

    const { result, unmount } = renderHook(() => useJobPolling('1', 50));

    // Wait for RUNNING
    await waitFor(() => expect(result.current.job?.status).toBe('RUNNING'));

    // Wait for COMPLETED
    await waitFor(() => expect(result.current.job?.status).toBe('COMPLETED'));

    // Verify it doesn't poll again after COMPLETED
    const currentCallCount = vi.mocked(jobsApi.getJob).mock.calls.length;
    await new Promise(r => setTimeout(r, 150)); // Wait extra time
    expect(vi.mocked(jobsApi.getJob).mock.calls.length).toBe(currentCallCount);
    
    unmount();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(jobsApi.getJob).mockRejectedValue(new Error('Network error'));

    const { result, unmount } = renderHook(() => useJobPolling('1', 50));

    await waitFor(() => expect(result.current.error).toBe('Network error'));
    
    unmount();
  });
});
