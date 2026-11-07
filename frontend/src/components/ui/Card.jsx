import { forwardRef } from 'react';

export const Card = forwardRef(function Card(
  { children, className = '', ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-white rounded-2xl border border-brand-border p-5 shadow-sm transition-shadow duration-150 ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
