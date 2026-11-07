import { useSearchParams, useNavigate } from 'react-router-dom';
import { Phone, ClipboardList, RefreshCw } from 'lucide-react';
import { SearchBar } from '../../components/ui/SearchBar';
import { Pagination } from '../../components/ui/Pagination';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Skeleton } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useRepairs } from '../../hooks/useRepairs';
import { formatISTDate, formatMobileDisplay } from '../../lib/formatters';

export function AdminRepairsPage({ isArchiveView = false }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const q = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const { repairs, totalPages, loading, error, refetch } = useRepairs({
    q,
    page,
    page_size: 20,
    archived: isArchiveView,
  });

  const handleSearchChange = (newQ) => {
    const params = new URLSearchParams(searchParams);
    if (newQ) {
      params.set('q', newQ);
    } else {
      params.delete('q');
    }
    params.set('page', '1'); // Reset to page 1 on new search
    setSearchParams(params);
  };

  const handlePageChange = (newPage) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderPhotoBadge = (repair) => {
    if (repair.photo_count === 0) {
      return <Badge variant="neutral">No photos</Badge>;
    }
    if (repair.has_active_photos) {
      return <Badge variant="primary">Photos ({repair.photo_count})</Badge>;
    }
    return <Badge variant="warning">Photo Expired</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            {isArchiveView ? 'Archived Records' : 'Bicycle Repair Records'}
          </h1>
          <p className="text-sm text-brand-muted">
            {isArchiveView
              ? 'Archived bicycles and repair history.'
              : 'Active customer repair requests and walk-in records.'}
          </p>
        </div>

        <SearchBar
          value={q}
          onChange={handleSearchChange}
          onClear={() => handleSearchChange('')}
          placeholder="Search by customer name, mobile, or Repair ID..."
        />
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 bg-red-50 border border-brand-error/30 rounded-xl text-brand-error flex items-center justify-between text-sm">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={refetch}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* Loading Skeletons */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      ) : repairs.length === 0 ? (
        /* Empty States */
        <EmptyState
          icon={ClipboardList}
          title={q ? 'No records match your search' : 'No repair records yet'}
          description={
            q
              ? `We couldn't find any repairs matching "${q}". Try another name or phone number.`
              : isArchiveView
                ? 'No archived records found.'
                : 'Repair records submitted by customers or admin will appear here.'
          }
          action={
            q ? (
              <Button variant="outline" size="sm" onClick={() => handleSearchChange('')}>
                Clear Search
              </Button>
            ) : null
          }
        />
      ) : (
        /* List: Stacked Cards on Mobile, Table on Desktop (>=1024) */
        <div className="space-y-4">
          {/* Mobile Cards (<1024px) */}
          <div className="space-y-3 lg:hidden">
            {repairs.map((repair) => (
              <Card
                key={repair.repair_id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/admin/repairs/${repair.repair_id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') navigate(`/admin/repairs/${repair.repair_id}`);
                }}
                className="p-4 hover:border-brand-navy cursor-pointer transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-brand-ring"
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h2 className="font-bold text-brand-navy text-base">
                      {repair.customer_name}
                    </h2>
                    <p className="font-mono text-xs text-brand-muted">
                      {repair.repair_id}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {renderPhotoBadge(repair)}
                    <a
                      href={`tel:+91${repair.mobile}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Call ${repair.customer_name}`}
                      className="p-2 rounded-lg bg-brand-bg-secondary text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                    >
                      <Phone className="w-4 h-4" />
                    </a>
                  </div>
                </div>

                <p className="text-xs text-brand-muted mb-3 line-clamp-1">
                  {repair.problem_summary || 'General service'}
                </p>

                <div className="flex items-center justify-between text-xs text-brand-muted pt-2 border-t border-brand-border/60">
                  <span>{formatMobileDisplay(repair.mobile)}</span>
                  <span>{formatISTDate(repair.received_at)}</span>
                </div>
              </Card>
            ))}
          </div>

          {/* Desktop Table (>=1024px) */}
          <div className="hidden lg:block bg-white rounded-2xl border border-brand-border shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-brand-bg-secondary/60 border-b border-brand-border text-xs font-bold text-brand-navy uppercase tracking-wider">
                  <th className="py-3.5 px-4">Repair ID</th>
                  <th className="py-3.5 px-4">Customer</th>
                  <th className="py-3.5 px-4">Mobile</th>
                  <th className="py-3.5 px-4">Problems</th>
                  <th className="py-3.5 px-4">Photos</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/60 text-sm">
                {repairs.map((repair) => (
                  <tr
                    key={repair.repair_id}
                    onClick={() => navigate(`/admin/repairs/${repair.repair_id}`)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        navigate(`/admin/repairs/${repair.repair_id}`);
                    }}
                    tabIndex={0}
                    className="hover:bg-brand-bg-secondary/40 cursor-pointer transition-colors focus:outline-none focus:bg-brand-bg-secondary/50"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-brand-navy">
                      {repair.repair_id}
                    </td>
                    <td className="py-3 px-4 font-semibold text-brand-navy">
                      {repair.customer_name}
                    </td>
                    <td className="py-3 px-4 text-brand-muted">
                      {formatMobileDisplay(repair.mobile)}
                    </td>
                    <td className="py-3 px-4 text-brand-muted max-w-xs truncate">
                      {repair.problem_summary || '—'}
                    </td>
                    <td className="py-3 px-4">{renderPhotoBadge(repair)}</td>
                    <td className="py-3 px-4 text-brand-muted">
                      {formatISTDate(repair.received_at)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <a
                        href={`tel:+91${repair.mobile}`}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Call ${repair.customer_name}`}
                        className="inline-flex items-center gap-1.5 p-2 rounded-lg bg-brand-bg-secondary text-brand-navy hover:bg-brand-navy hover:text-white transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="text-xs font-semibold">Call</span>
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <Pagination
            page={page}
            totalPages={totalPages}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}
