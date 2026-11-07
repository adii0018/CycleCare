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
      {required && (
        <span className="text-brand-error ml-1" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
});
