import { useState, useEffect } from 'react';
import { jobsApi } from '../services/api/jobs';
import { SearchJobResponse } from '../types/api';

export const useJobPolling = (jobId: string | undefined, intervalMs: number = 2000) => {
  const [job, setJob] = useState<SearchJobResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!jobId) return;

    let timeoutId: ReturnType<typeof setTimeout>;
    let isMounted = true;

    const poll = async () => {
      try {
        const data = await jobsApi.getJob(jobId);
        if (!isMounted) return;
        
        setJob(data);
        setError(null);

        if (data.status === 'PENDING' || data.status === 'RUNNING') {
          timeoutId = setTimeout(poll, intervalMs);
        }
      } catch (err: any) {
        if (!isMounted) return;
        setError(err.message || 'Failed to poll job status');
        // If it's a network error, maybe we still want to poll, but let's just stop for safety.
      }
    };

    poll();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [jobId, intervalMs]);

  return { job, error };
};
