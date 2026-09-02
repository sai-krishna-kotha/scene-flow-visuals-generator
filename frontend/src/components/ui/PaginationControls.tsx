import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
}

export function PaginationControls({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null;
  }

  const handlePrev = () => {
    if (page > 1) {
      onPageChange(page - 1);
    }
  };

  const handleNext = () => {
    if (page < totalPages) {
      onPageChange(page + 1);
    }
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, total);

  return (
    <div className="flex items-center justify-between px-4 py-3 sm:px-6">
      <div className="flex flex-1 justify-between sm:hidden">
        <button
          onClick={handlePrev}
          disabled={page === 1}
          className={`relative inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium ${
            page === 1
              ? 'text-white/30 cursor-not-allowed bg-black/20'
              : 'text-white/70 hover:bg-white/5 hover:text-white bg-black/40'
          }`}
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={page === totalPages}
          className={`relative ml-3 inline-flex items-center rounded-md border border-white/10 px-4 py-2 text-sm font-medium ${
            page === totalPages
              ? 'text-white/30 cursor-not-allowed bg-black/20'
              : 'text-white/70 hover:bg-white/5 hover:text-white bg-black/40'
          }`}
        >
          Next
        </button>
      </div>
      <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
        <div>
          <p className="text-sm text-white/50">
            Showing <span className="font-medium text-white/90">{startItem}</span> to{' '}
            <span className="font-medium text-white/90">{endItem}</span> of{' '}
            <span className="font-medium text-white/90">{total}</span> results
          </p>
        </div>
        <div>
          <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
            <button
              onClick={handlePrev}
              disabled={page === 1}
              className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-white/50 ring-1 ring-inset ring-white/10 focus:z-20 focus:outline-offset-0 ${
                page === 1 ? 'cursor-not-allowed bg-black/20' : 'hover:bg-white/5 hover:text-white bg-black/40'
              }`}
            >
              <span className="sr-only">Previous</span>
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <span className="relative inline-flex items-center px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/10 bg-indigo-500/20">
              {page}
            </span>
            <button
              onClick={handleNext}
              disabled={page === totalPages}
              className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-white/50 ring-1 ring-inset ring-white/10 focus:z-20 focus:outline-offset-0 ${
                page === totalPages ? 'cursor-not-allowed bg-black/20' : 'hover:bg-white/5 hover:text-white bg-black/40'
              }`}
            >
              <span className="sr-only">Next</span>
              <ChevronRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </nav>
        </div>
      </div>
    </div>
  );
}
