import { Wrench } from 'lucide-react';

export function BrandHeader({ subtitle = 'Your Cycle, Our Care.', className = '' }) {
  return (
    <header className={`text-center py-4 ${className}`}>
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-brand-navy text-white mb-2 shadow-sm">
        <Wrench className="w-6 h-6 text-brand-sky" aria-hidden="true" />
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-brand-navy tracking-tight">
        CycleCare
      </h1>
      <p className="text-xs font-semibold text-brand-muted tracking-wide uppercase mt-0.5">
        by Rajput Auto Garage
      </p>
      {subtitle && (
        <p className="text-sm font-medium text-brand-navy/80 mt-1.5">{subtitle}</p>
      )}
    </header>
  );
}
