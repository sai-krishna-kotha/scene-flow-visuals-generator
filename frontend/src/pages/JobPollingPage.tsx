import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useJobPolling } from '../hooks/useJobPolling';
import { Card, Loader, ErrorMessage, Button } from '../components/ui';
import { CheckCircle2, Clock, PlayCircle, XCircle } from 'lucide-react';

export const JobPollingPage = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { job, error } = useJobPolling(jobId);

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
    <div className="max-w-2xl mx-auto mt-12 text-center">
      <Card className="py-16 space-y-6">
        <div className="flex justify-center mb-6">
          {display.icon}
        </div>
        <h1 className="text-3xl font-bold text-surface-900">{display.text}</h1>
        <p className="text-lg text-surface-600 max-w-md mx-auto">{display.desc}</p>
        
        {job.status === 'RUNNING' && (
          <div className="w-full max-w-md mx-auto bg-surface-200 h-2 rounded-full mt-8 overflow-hidden">
            <div className="bg-primary-600 h-full w-2/3 rounded-full animate-pulse"></div>
          </div>
        )}
      </Card>
    </div>
  );
};
