import { Button } from './Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, totalPages, onPageChange, className = '' }) {
  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label="Pagination Navigation"
      className={`flex items-center justify-between gap-2 py-3 ${className}`}
    >
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        aria-label="Go to previous page"
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous
      </Button>

      <span className="text-sm font-medium text-brand-muted" aria-current="page">
        Page <span className="font-bold text-brand-navy">{page}</span> of{' '}
        <span className="font-bold text-brand-navy">{totalPages}</span>
      </span>

      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        aria-label="Go to next page"
      >
        Next
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </nav>
  );
}
