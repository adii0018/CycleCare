import { useState } from 'react';
import { CheckCircle2, Copy, Check, Calendar, User } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { formatISTDateTime } from '../../lib/formatters';

export function ConfirmCard({
  repairId,
  customerName,
  receivedAt,
  onReset,
  className = '',
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(repairId);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        // Fallback for non-secure or unsupported clipboard contexts
        const textarea = document.createElement('textarea');
        textarea.value = repairId;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      // Graceful fallback: do nothing or leave copied false
    }
  };

  return (
    <Card className={`text-center p-6 sm:p-8 space-y-6 ${className}`}>
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-50 text-brand-success mx-auto">
        <CheckCircle2 className="w-10 h-10" />
      </div>

      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-brand-navy">
          Registration Confirmed!
        </h2>
        <p className="text-sm text-brand-muted mt-1">
          Your bicycle repair request has been successfully recorded.
        </p>
      </div>

      {/* Repair ID Display */}
      <div className="p-4 rounded-xl bg-brand-bg-secondary border border-brand-sky/40">
        <p className="text-xs font-semibold text-brand-muted uppercase tracking-wider mb-1">
          Your Repair ID
        </p>
        <div className="flex items-center justify-center gap-3">
          <span className="text-2xl sm:text-3xl font-extrabold tracking-wide text-brand-navy font-mono">
            {repairId}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            aria-label="Copy Repair ID"
            className="p-2 rounded-lg bg-white border border-brand-border text-brand-navy hover:bg-gray-50 active:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-ring"
          >
            {copied ? (
              <Check className="w-5 h-5 text-brand-success" />
            ) : (
              <Copy className="w-5 h-5" />
            )}
          </button>
        </div>
        {copied && (
          <p className="text-xs font-medium text-brand-success mt-1" role="status">
            Copied to clipboard!
          </p>
        )}
      </div>

      {/* Details Box */}
      <div className="space-y-2 text-left bg-gray-50 p-4 rounded-xl border border-brand-border/60 text-sm">
        <div className="flex items-center justify-between text-brand-navy">
          <span className="flex items-center gap-1.5 text-brand-muted">
            <User className="w-4 h-4" />
            Customer Name
          </span>
          <span className="font-semibold">{customerName}</span>
        </div>
        <div className="flex items-center justify-between text-brand-navy">
          <span className="flex items-center gap-1.5 text-brand-muted">
            <Calendar className="w-4 h-4" />
            Date & Time
          </span>
          <span className="font-semibold">{formatISTDateTime(receivedAt)}</span>
        </div>
      </div>

      <p className="text-xs text-brand-muted">
        Please keep this Repair ID for future reference and pickup at the garage.
      </p>

      <Button variant="outline" className="w-full" onClick={onReset}>
        Register another bicycle
      </Button>
    </Card>
  );
}
