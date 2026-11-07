export const REPAIR_PROBLEMS = [
  { code: 'puncture_tyre', label: 'Puncture / Tyre Problem' },
  { code: 'brake', label: 'Brake Problem' },
  { code: 'chain', label: 'Chain Problem' },
  { code: 'gear', label: 'Gear Problem' },
  { code: 'pedal', label: 'Pedal Problem' },
  { code: 'wheel', label: 'Wheel Problem' },
  { code: 'general_service', label: 'General Servicing' },
  { code: 'other', label: 'Other' },
];

export const PROBLEM_LABEL_MAP = Object.fromEntries(
  REPAIR_PROBLEMS.map((p) => [p.code, p.label])
);

export const MAX_PHOTOS = 3;
export const MAX_PHOTO_BYTES = 400 * 1024; // Hard cap 400 KB
export const COMPRESS_TARGET_SIZE_MB = 0.22; // ~220 KB target
export const COMPRESS_MAX_SIDE = 1024; // 1024px

export const REQUEST_TIMEOUT_MS = 30000;
export const WARMUP_THRESHOLD_MS = 6000;
export const DEBOUNCE_SEARCH_MS = 400;

export const SESSION_STORAGE_KEY = 'cc_last_registration';
