import { Check } from 'lucide-react';
import { REPAIR_PROBLEMS } from '../../lib/constants';

export function ProblemSelector({ selected = [], onChange, error }) {
  const toggleProblem = (code) => {
    if (selected.includes(code)) {
      onChange(selected.filter((c) => c !== code));
    } else {
      onChange([...selected, code]);
    }
  };

  return (
    <div className="space-y-2">
      <div
        role="group"
        aria-label="Select repair problems"
        className="grid grid-cols-2 gap-2.5 sm:gap-3"
      >
        {REPAIR_PROBLEMS.map((problem) => {
          const isSelected = selected.includes(problem.code);
          return (
            <button
              key={problem.code}
              type="button"
              role="checkbox"
              aria-checked={isSelected}
              onClick={() => toggleProblem(problem.code)}
              className={`flex items-center justify-between p-3.5 rounded-xl border text-left min-h-[48px] transition-all duration-150 select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring ${
                isSelected
                  ? 'bg-brand-bg-secondary border-brand-navy text-brand-navy font-semibold shadow-sm'
                  : 'bg-white border-brand-border text-brand-navy hover:bg-gray-50'
              }`}
            >
              <span className="text-sm font-medium leading-tight mr-2">
                {problem.label}
              </span>
              <div
                className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border transition-colors ${
                  isSelected
                    ? 'bg-brand-navy border-brand-navy text-white'
                    : 'border-brand-border bg-white'
                }`}
                aria-hidden="true"
              >
                {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm font-medium text-brand-error mt-1">
          {error}
        </p>
      )}
    </div>
  );
}
