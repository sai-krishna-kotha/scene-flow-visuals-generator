import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useJobPolling } from '../hooks/useJobPolling';
import { Card, Loader, ErrorMessage, Button } from '../components/ui';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';
import { scenesApi } from '../services/api/scenes';
import { jobsApi } from '../services/api/jobs';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export const JobPollingPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, error } = useJobPolling(jobId);
  const [searchNumber, setSearchNumber] = useState<number | null>(null);

  useDocumentTitle('Search Job');

  useEffect(() => {
    if (job?.scene_id && jobId) {
      scenesApi.listJobs(job.scene_id).then(jobsData => {
        const jobIndex = jobsData.items.findIndex(j => j.job_id === jobId);
        if (jobIndex !== -1) {
          setSearchNumber(jobsData.items.length - jobIndex);
        }
      }).catch(err => console.error("Failed to fetch jobs for search number", err));
    }
  }, [job?.scene_id, jobId]);

  useEffect(() => {
    if (job?.status === 'COMPLETED') {
      navigate(`/jobs/${jobId}/results`);
    }
  }, [job, navigate, jobId]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto mt-12">
        <ErrorMessage message={error} />
        <div className="mt-4">
          <Button onClick={() => window.location.reload()}>Retry Polling</Button>
        </div>
      </div>
    );
  }

  if (!job) return <Loader text="Connecting to job status..." />;

  const getStatusDisplay = () => {
    switch (job.status) {
      case 'PENDING':
        return { icon: <Clock className="w-12 h-12 text-yellow-500 animate-pulse" />, text: 'Queued', desc: 'Waiting for an available worker.' };
      case 'RUNNING':
        return { icon: <PlayCircle className="w-12 h-12 text-blue-500 animate-pulse" />, text: 'Processing', desc: 'Analyzing scene, retrieving assets, and ranking results.' };
      case 'COMPLETED':
        return { icon: <CheckCircle2 className="w-12 h-12 text-green-500" />, text: 'Completed', desc: 'Redirecting to results...' };
      case 'FAILED':
        return { icon: <XCircle className="w-12 h-12 text-red-500" />, text: 'Failed', desc: job.error_message || 'An unknown error occurred.' };
    }
  };

  const display = getStatusDisplay();

  return (
    <div className="max-w-3xl mx-auto mt-12">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-text-main tracking-tight">Visual Search</h1>
          {searchNumber ? (
            <p className="text-text-muted mt-2 font-medium">Search #{searchNumber}</p>
          ) : (
            <p className="text-text-muted mt-2 font-medium">Loading search context...</p>
          )}
        </div>
        {job?.scene_id && (
          <Link to={`/scenes/${job.scene_id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              Back to Scene
            </Button>
          </Link>
        )}
      </div>

      <div className="bg-surface p-10 rounded-2xl border border-border-main shadow-sm text-center">
        <div className="flex justify-center mb-6">
          {display.icon}
        </div>
        <h2 className="text-2xl font-bold text-text-main mb-2">{display.text}</h2>
        <p className="text-text-secondary max-w-md mx-auto">{display.desc}</p>
        
        {(job.status === 'RUNNING' || job.status === 'PENDING') && (
          <div className="w-full max-w-md mx-auto bg-surface-muted h-1.5 rounded-full mt-8 overflow-hidden">
            <div className="bg-primary-500 h-full w-2/3 rounded-full animate-pulse transition-all"></div>
          </div>
        )}

        {job.status === 'FAILED' && (
          <div className="mt-8">
             <Button onClick={() => window.history.back()} variant="outline">Go Back</Button>
          </div>
        )}
      </div>
    </div>
  );
};
