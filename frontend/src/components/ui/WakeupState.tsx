import React from 'react';
import { Loader2, ServerCrash } from 'lucide-react';
import { Button } from './index';

interface WakeupStateProps {
  attempts: number;
  maxAttempts: number;
  onRetry: () => void;
  failed: boolean;
}

export const WakeupState: React.FC<WakeupStateProps> = ({ attempts, maxAttempts, onRetry, failed }) => {
  if (failed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-surface-200 rounded-xl shadow-sm">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
          <ServerCrash className="w-8 h-8 text-red-500" />
        </div>
        <h3 className="text-xl font-bold text-surface-900 mb-2">Couldn't connect to SceneFlow</h3>
        <p className="text-surface-500 mb-8 max-w-sm">Check your connection and try again.</p>
        <Button onClick={onRetry}>Retry</Button>
      </div>
    );
  }

  const isTakingLonger = attempts >= 3;
  
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center bg-white border border-surface-200 rounded-xl shadow-sm">
      <Loader2 className="w-10 h-10 text-primary-500 animate-spin mb-6" />
      <h3 className="text-xl font-bold text-surface-900 mb-2">
        {isTakingLonger ? 'Still starting...' : 'Waking up SceneFlow...'}
      </h3>
      <p className="text-surface-500 max-w-sm">
        {isTakingLonger 
          ? 'SceneFlow is taking a little longer than usual.' 
          : 'The server is starting. This may take a few seconds.'}
      </p>
    </div>
  );
};
