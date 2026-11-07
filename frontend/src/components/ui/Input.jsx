import { forwardRef } from 'react';

export const Label = forwardRef(function Label(
  { children, required = false, htmlFor, className = '', ...props },
  ref
) {
  return (
    <label
      ref={ref}
      htmlFor={htmlFor}
      className={`block text-sm font-semibold text-brand-navy mb-1.5 ${className}`}
      {...props}
    >
      {children}
      {required && <span className="text-brand-error ml-1" aria-hidden="true">*</span>}
    </label>
  );
});

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

export const Input = forwardRef(function Input(
  {
    error,
    prefixText,
    type = 'text',
    className = '',
    id,
    disabled = false,
    ...props
  },
  ref
) {
  const hasError = Boolean(error);

  return (
    <div className="relative w-full">
      {prefixText && (
        <span
          className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted font-medium text-base select-none"
          aria-hidden="true"
        >
          {prefixText}
        </span>
      )}
      <input
        ref={ref}
        id={id}
        type={type}
        disabled={disabled}
        aria-invalid={hasError ? 'true' : 'false'}
        aria-describedby={hasError && id ? `${id}-error` : undefined}
        className={`w-full min-h-[48px] text-base bg-white text-brand-navy rounded-xl border transition-colors duration-150 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-ring focus:border-brand-navy disabled:bg-gray-100 disabled:cursor-not-allowed ${
          prefixText ? 'pl-12 pr-4' : 'px-4'
        } ${hasError ? 'border-brand-error focus:ring-red-400' : 'border-brand-border'} ${className}`}
        {...props}
      />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  {
    error,
    className = '',
    id,
    rows = 3,
    disabled = false,
    maxLength,
    value,
    ...props
  },
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
