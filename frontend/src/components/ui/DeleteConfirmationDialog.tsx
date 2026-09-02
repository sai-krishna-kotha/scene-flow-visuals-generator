import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Button } from './index';

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  warnings: string[];
  isDeleting: boolean;
  deleteButtonText?: string;
}

export const DeleteConfirmationDialog: React.FC<DeleteConfirmationDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  warnings,
  isDeleting,
  deleteButtonText = 'Delete'
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isDeleting) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scrolling
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, isDeleting]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        ref={dialogRef}
        className="bg-surface rounded-xl shadow-xl border border-border-main w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-red-500/10">
          <div className="flex items-center gap-3">
            <div className="bg-red-500/20 p-2 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <h2 id="delete-dialog-title" className="text-lg font-bold text-text-main">
              {title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="text-text-muted hover:text-text-secondary transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-text-secondary mb-4">
            Are you sure you want to delete <span className="font-bold text-text-main">"{itemName}"</span>?
          </p>
          
          <div className="bg-surface-muted border border-border-main rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-text-main mb-2">This will permanently delete:</p>
            <ul className="list-disc pl-5 text-sm text-text-secondary space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
          
          <p className="text-sm text-red-500 font-medium">
            This action cannot be undone.
          </p>
        </div>
        
        <div className="px-6 py-4 bg-surface-muted border-t border-border-main flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="w-full sm:w-auto inline-flex items-center justify-center rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 h-10 px-4 py-2 text-sm bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50 disabled:pointer-events-none"
          >
            {isDeleting ? (
              <>
                <Trash2 className="w-4 h-4 mr-2 animate-pulse shrink-0" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4 mr-2 shrink-0" />
                {deleteButtonText}
              </>
            )}
          </button>
          <Button 
            variant="outline" 
            onClick={onClose} 
            disabled={isDeleting}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
};
