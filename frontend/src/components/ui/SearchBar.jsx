import { Search, X } from 'lucide-react';

export function SearchBar({
  value,
  onChange,
  onClear,
  placeholder = 'Search by name, mobile, or Repair ID...',
  className = '',
}) {
  return (
    <div className={`relative w-full ${className}`}>
      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-brand-muted">
        <Search className="w-5 h-5" aria-hidden="true" />
      </div>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full min-h-[48px] pl-11 pr-10 text-base bg-white text-brand-navy rounded-xl border border-brand-border transition-colors placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-ring focus:border-brand-navy"
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-brand-muted hover:text-brand-navy"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}
