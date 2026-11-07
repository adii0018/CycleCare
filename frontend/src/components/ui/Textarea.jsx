import { forwardRef } from 'react';

export const Textarea = forwardRef(function Textarea(
  { error, className = '', id, rows = 3, disabled = false, maxLength, value, ...props },
  ref
) {
  const hasError = Boolean(error);
  const currentLength = typeof value === 'string' ? value.length : 0;

  return (
    <div className="relative w-full">
      <textarea
        ref={ref}
        id={id}
        rows={rows}
        maxLength={maxLength}
        value={value}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError && id ? `${id}-error` : undefined}
        className={`w-full text-base bg-white text-brand-navy rounded-xl border p-3.5 transition-colors duration-150 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-ring focus:border-brand-navy disabled:bg-gray-100 disabled:cursor-not-allowed ${
          hasError ? 'border-brand-error focus:ring-red-400' : 'border-brand-border'
        } ${className}`}
        {...props}
      />
      {maxLength && (
        <div className="flex justify-end mt-1 text-xs text-brand-muted">
          <span>
            {currentLength} / {maxLength}
          </span>
        </div>
      )}
    </div>
  );
});
