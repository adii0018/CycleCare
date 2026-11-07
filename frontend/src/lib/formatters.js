/**
 * Formats ISO date string to readable IST date-time.
 * Example output: "07 Nov 2026, 12:25 PM"
 */
export function formatISTDateTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Formats ISO date string to short IST date.
 * Example output: "07 Nov 2026"
 */
export function formatISTDate(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';

    return new Intl.DateTimeFormat('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Formats a 10-digit mobile number for display: "+91 98765 43210"
 */
export function formatMobileDisplay(mobile) {
  if (!mobile) return '';
  const digits = String(mobile).replace(/\D/g, '');
  if (digits.length === 10) {
    return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  return mobile;
}
