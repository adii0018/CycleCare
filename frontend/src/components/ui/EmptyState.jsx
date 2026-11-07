export function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-white rounded-2xl border border-brand-border/60 ${className}`}
    >
      {Icon && (
        <div className="w-12 h-12 mb-3 rounded-full bg-brand-bg-secondary flex items-center justify-center text-brand-navy">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-base font-bold text-brand-navy mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-brand-muted max-w-sm mb-4">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
