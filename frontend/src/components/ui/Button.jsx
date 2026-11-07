import { forwardRef } from 'react';
import { Spinner } from './Spinner';

export const Button = forwardRef(function Button(
  {
    children,
    variant = 'primary',
    size = 'md',
    loading = false,
    disabled = false,
    className = '',
    type = 'button',
    ...props
  },
  ref
) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none';

  const variants = {
    primary: 'bg-brand-navy text-white hover:bg-[#071D33] active:bg-[#051424] shadow-sm',
    secondary:
      'bg-brand-bg-secondary text-brand-navy border border-brand-border hover:bg-[#DDE9FF] active:bg-[#CFE0FF]',
    outline:
      'border border-brand-border bg-transparent text-brand-navy hover:bg-brand-bg-secondary active:bg-[#DDE9FF]',
    ghost:
      'bg-transparent text-brand-navy hover:bg-brand-bg-secondary active:bg-[#DDE9FF]',
    danger: 'bg-brand-error text-white hover:bg-red-700 active:bg-red-800 shadow-sm',
  };

  const sizes = {
    sm: 'min-h-[40px] px-3 text-sm gap-1.5',
    md: 'min-h-[48px] px-4 text-base gap-2',
    lg: 'min-h-[52px] px-6 text-lg gap-2.5',
  };

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${
        sizes[size] || sizes.md
      } ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" className="mr-1.5" />}
      {children}
    </button>
  );
});
