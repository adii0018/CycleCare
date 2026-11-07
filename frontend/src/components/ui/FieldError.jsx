import { forwardRef } from 'react';

export const FieldError = forwardRef(function FieldError(
  { error, id, className = '' },
  ref
) {
  if (!error) return null;
  return (
    <p
      ref={ref}
      id={id}
      role="alert"
      className={`mt-1.5 text-sm font-medium text-brand-error flex items-center gap-1 ${className}`}
    >
      <span>{error}</span>
    </p>
  );
});
