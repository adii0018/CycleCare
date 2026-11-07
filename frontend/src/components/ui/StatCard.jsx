import { Card } from './Card';
import { Skeleton } from './Skeleton';

export function StatCard({ label, value, icon: Icon, loading = false, className = '' }) {
  return (
    <Card className={`flex items-center gap-4 ${className}`}>
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-brand-bg-secondary flex items-center justify-center text-brand-navy flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider truncate">
          {label}
        </p>
        {loading ? (
          <Skeleton className="h-8 w-16 mt-1" />
        ) : (
          <p className="text-2xl font-bold text-brand-navy tracking-tight">
            {value ?? 0}
          </p>
        )}
      </div>
    </Card>
  );
}
