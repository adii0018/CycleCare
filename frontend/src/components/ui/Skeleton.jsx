export function Skeleton({ className = '' }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-xl ${className}`}
      aria-hidden="true"
    />
  );
}
