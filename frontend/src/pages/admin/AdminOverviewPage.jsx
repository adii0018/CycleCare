import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ClipboardList,
  CalendarCheck,
  Archive,
  ImageOff,
  ArrowRight,
  Phone,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '../../components/ui/StatCard';
import { SearchBar } from '../../components/ui/SearchBar';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/Skeleton';
import { useStats } from '../../hooks/useStats';
import { useRepairs } from '../../hooks/useRepairs';
import { formatISTDate, formatMobileDisplay } from '../../lib/formatters';

export function AdminOverviewPage() {
  const navigate = useNavigate();
  const [searchVal, setSearchVal] = useState('');

  const { stats, loading: statsLoading, error: statsError, refetch: refetchStats } = useStats();
  const { repairs, loading: repairsLoading } = useRepairs({ page: 1, page_size: 5 });

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/admin/repairs?q=${encodeURIComponent(searchVal.trim())}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Search Bar */}
      <div className="space-y-4">
        <div>
          <h1 className="text-2xl font-extrabold text-brand-navy tracking-tight">
            Dashboard Overview
          </h1>
          <p className="text-sm text-brand-muted">
            Welcome to Rajput Auto Garage bicycle service management.
          </p>
        </div>

        <form onSubmit={handleSearchSubmit} className="max-w-xl">
          <SearchBar
            value={searchVal}
            onChange={setSearchVal}
            onClear={() => setSearchVal('')}
            placeholder="Quick search records by name, mobile, or ID..."
          />
        </form>
      </div>

      {/* Stats Error Alert */}
      {statsError && (
        <div className="p-4 bg-red-50 border border-brand-error/30 rounded-xl text-brand-error flex items-center justify-between text-sm">
          <span>{statsError}</span>
          <Button variant="outline" size="sm" onClick={refetchStats}>
            <RefreshCw className="w-4 h-4 mr-1" /> Retry
          </Button>
        </div>
      )}

      {/* 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Total Records"
          value={stats?.total}
          icon={ClipboardList}
          loading={statsLoading}
        />
        <StatCard
          label="Today's Walk-ins"
          value={stats?.today}
          icon={CalendarCheck}
          loading={statsLoading}
        />
        <StatCard
          label="Archived"
          value={stats?.archived}
          icon={Archive}
          loading={statsLoading}
        />
        <StatCard
          label="Expired Photos"
          value={stats?.expired_photos}
          icon={ImageOff}
          loading={statsLoading}
        />
      </div>

      {/* Latest Records Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-brand-navy">Latest Registrations</h2>
          <Link
            to="/admin/repairs"
            className="text-sm font-semibold text-brand-blue hover:text-brand-navy inline-flex items-center gap-1 transition-colors"
          >
            View all records <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <Card className="p-0 overflow-hidden">
          {repairsLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : repairs.length === 0 ? (
            <div className="p-6 text-center text-sm text-brand-muted">
              No repair records found.
            </div>
          ) : (
            <div className="divide-y divide-brand-border/60">
              {repairs.slice(0, 5).map((repair) => (
                <div
                  key={repair.repair_id}
                  onClick={() => navigate(`/admin/repairs/${repair.repair_id}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') navigate(`/admin/repairs/${repair.repair_id}`);
                  }}
                  role="button"
                  tabIndex={0}
                  className="p-4 flex items-center justify-between hover:bg-brand-bg-secondary/40 transition-colors cursor-pointer focus:outline-none focus:bg-brand-bg-secondary/40 select-none"
                >
                  <div className="space-y-1 min-w-0 pr-3">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-brand-navy truncate">
                        {repair.customer_name}
                      </span>
                      <span className="font-mono text-xs text-brand-muted">
                        ({repair.repair_id})
                      </span>
                    </div>
                    <p className="text-xs text-brand-muted truncate">
                      {repair.problem_summary || 'No problem specified'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="text-xs text-brand-muted hidden sm:inline">
                      {formatISTDate(repair.received_at)}
                    </span>
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
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
