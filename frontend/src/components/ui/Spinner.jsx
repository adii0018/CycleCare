export function Spinner({ size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-4 h-4 border-2',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-3',
  };

  return (
    <div
      role="status"
      aria-label="Loading"
      className={`inline-block rounded-full border-current border-t-transparent animate-spin ${
        sizes[size] || sizes.md
      } ${className}`}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
