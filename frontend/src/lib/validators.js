import { z } from 'zod';
import { REPAIR_PROBLEMS } from './constants';

const VALID_PROBLEM_CODES = REPAIR_PROBLEMS.map((p) => p.code);

// Allows English letters, spaces, dots, hyphens, apostrophes, and Hindi Devanagari Unicode (\u0900-\u097F)
const NAME_REGEX = /^[A-Za-z\u0900-\u097F\s.'-]+$/;

export function normalizeMobileInput(raw) {
  if (!raw) return '';
  // Strip non-digits
  let digits = String(raw).replace(/\D/g, '');
  // If user pasted with 91 prefix and length is 12, strip 91
  if (digits.length === 12 && digits.startsWith('91')) {
    digits = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    // If user pasted with leading 0 and length is 11, strip 0
    digits = digits.slice(1);
  }
  return digits;
}

export const customerNameSchema = z
  .string()
  .trim()
  .min(2, 'Name must be at least 2 characters.')
  .max(60, 'Name cannot exceed 60 characters.')
  .regex(NAME_REGEX, 'Name can only contain letters, spaces, and . - \'');

export const mobileSchema = z
  .string()
  .trim()
  .transform(normalizeMobileInput)
  .pipe(
    z
      .string()
      .length(10, 'Mobile number must be exactly 10 digits.')
      .regex(/^[6-9]\d{9}$/, 'Please enter a valid Indian mobile number starting with 6, 7, 8, or 9.')
  );

export const repairProblemsSchema = z
  .array(z.string())
  .min(1, 'Please select at least one problem.')
  .refine(
    (problems) => problems.every((p) => VALID_PROBLEM_CODES.includes(p)),
    'One or more selected problems are invalid.'
  );

// Shared base schema for customer and manual registration
export const baseRepairFormSchema = z
  .object({
    customer_name: customerNameSchema,
    mobile: mobileSchema,
    repair_problems: repairProblemsSchema,
    other_problem_text: z.string().max(200, 'Cannot exceed 200 characters.').optional().default(''),
    additional_details: z.string().max(500, 'Cannot exceed 500 characters.').optional().default(''),
    idempotency_key: z.string().min(1, 'Idempotency key required.'),
  })
  .superRefine((data, ctx) => {
    if (data.repair_problems.includes('other')) {
      const text = (data.other_problem_text || '').trim();
      if (!text) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['other_problem_text'],
          message: 'Please describe the other problem.',
        });
      }
    }
  });

// Public customer schema includes honeypot
export const customerRegistrationSchema = baseRepairFormSchema.and(
  z.object({
    website: z.string().max(0, 'Bot detected.').optional().default(''),
  })
);

// Admin login schema
export const adminLoginSchema = z.object({
  mobile: mobileSchema,
  password: z.string().min(10, 'Password must be at least 10 characters.'),
});
