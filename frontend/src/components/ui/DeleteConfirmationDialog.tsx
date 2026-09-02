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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-900/50 backdrop-blur-sm">
      <div 
        ref={dialogRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-dialog-title"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-200 bg-red-50/50">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 id="delete-dialog-title" className="text-lg font-bold text-surface-900">
              {title}
            </h2>
          </div>
          <button 
            onClick={onClose}
            disabled={isDeleting}
            className="text-surface-400 hover:text-surface-600 transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-surface-700 mb-4">
            Are you sure you want to delete <span className="font-bold text-surface-900">"{itemName}"</span>?
          </p>
          
          <div className="bg-surface-50 border border-surface-200 rounded-lg p-4 mb-6">
            <p className="text-sm font-semibold text-surface-900 mb-2">This will permanently delete:</p>
            <ul className="list-disc pl-5 text-sm text-surface-600 space-y-1">
              {warnings.map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
          </div>
          
          <p className="text-sm text-red-600 font-medium">
            This action cannot be undone.
          </p>
        </div>
        
        <div className="px-6 py-4 bg-surface-50 border-t border-surface-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
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
