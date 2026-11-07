export function Badge({ children, variant = 'neutral', className = '' }) {
  const variants = {
    neutral: 'bg-gray-100 text-gray-700 border-gray-200',
    primary: 'bg-brand-bg-secondary text-brand-navy border-brand-sky/40',
    success: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
        variants[variant] || variants.neutral
      } ${className}`}
    >
      {children}
    </span>
  );
}
