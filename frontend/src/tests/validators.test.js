import { describe, it, expect } from 'vitest';
import {
  customerNameSchema,
  mobileSchema,
  normalizeMobileInput,
  repairProblemsSchema,
  baseRepairFormSchema,
  customerRegistrationSchema,
  adminLoginSchema,
} from '../lib/validators';

describe('Validators Test Suite', () => {
  it('validates customer name rules including Hindi Devanagari', () => {
    // English valid
    expect(customerNameSchema.safeParse('Ramesh Kumar').success).toBe(true);
    expect(customerNameSchema.safeParse('O. P. Sharma').success).toBe(true);
    expect(customerNameSchema.safeParse("Mary O'Connor").success).toBe(true);

    // Hindi Devanagari valid
    expect(customerNameSchema.safeParse('राहुल शर्मा').success).toBe(true);
    expect(customerNameSchema.safeParse('अमित पटेल').success).toBe(true);

    // Invalid: numbers, special chars, too short, too long
    expect(customerNameSchema.safeParse('R').success).toBe(false);
    expect(customerNameSchema.safeParse('Ramesh123').success).toBe(false);
    expect(customerNameSchema.safeParse('Ramesh @ Garage').success).toBe(false);
    expect(customerNameSchema.safeParse('A'.repeat(61)).success).toBe(false);
  });

  it('normalizes mobile numbers and rejects invalid Indian numbers', () => {
    // Normalization helper
    expect(normalizeMobileInput('+91 98765 43210')).toBe('9876543210');
    expect(normalizeMobileInput('09876543210')).toBe('9876543210');
    expect(normalizeMobileInput('98765 43210')).toBe('9876543210');
    expect(normalizeMobileInput('987-654-3210')).toBe('9876543210');

    // Schema validation (transform + pipe)
    expect(mobileSchema.safeParse('9876543210').success).toBe(true);
    expect(mobileSchema.safeParse('+91 98765 43210').success).toBe(true);
    expect(mobileSchema.safeParse('09876543210').success).toBe(true);
    expect(mobileSchema.safeParse('6123456789').success).toBe(true);
    expect(mobileSchema.safeParse('7123456789').success).toBe(true);
    expect(mobileSchema.safeParse('8123456789').success).toBe(true);

    // Invalid: starts with 1-5, wrong length, letters
    expect(mobileSchema.safeParse('5123456789').success).toBe(false);
    expect(mobileSchema.safeParse('1234567890').success).toBe(false);
    expect(mobileSchema.safeParse('987654321').success).toBe(false); // 9 digits
    expect(mobileSchema.safeParse('98765432100').success).toBe(false); // 11 digits
    expect(mobileSchema.safeParse('abcdefghij').success).toBe(false);
  });

  it('validates repair problems selection and required other text', () => {
    // Valid problem codes
    expect(repairProblemsSchema.safeParse(['puncture_tyre', 'brake']).success).toBe(true);
    expect(repairProblemsSchema.safeParse(['general_service']).success).toBe(true);

    // Empty list invalid
    expect(repairProblemsSchema.safeParse([]).success).toBe(false);
    // Invalid code
    expect(repairProblemsSchema.safeParse(['flying_bicycle']).success).toBe(false);

    // "other" selected without description fails
    const formWithOtherEmpty = {
      customer_name: 'Rahul',
      mobile: '9876543210',
      repair_problems: ['other'],
      other_problem_text: '',
      idempotency_key: 'test-key',
    };
    const resOtherEmpty = baseRepairFormSchema.safeParse(formWithOtherEmpty);
    expect(resOtherEmpty.success).toBe(false);

    // "other" selected with description succeeds
    const formWithOtherFilled = {
      customer_name: 'Rahul',
      mobile: '9876543210',
      repair_problems: ['other'],
      other_problem_text: 'Carrier bent',
      idempotency_key: 'test-key',
    };
    const resOtherFilled = baseRepairFormSchema.safeParse(formWithOtherFilled);
    expect(resOtherFilled.success).toBe(true);
  });

  it('validates honeypot field strictly on customerRegistrationSchema', () => {
    // Empty honeypot succeeds
    const validCustomer = {
      customer_name: 'Ramesh',
      mobile: '9876543210',
      repair_problems: ['brake'],
      idempotency_key: 'test-key',
      website: '',
    };
    expect(customerRegistrationSchema.safeParse(validCustomer).success).toBe(true);

    // Filled honeypot fails
    const botCustomer = {
      ...validCustomer,
      website: 'http://spam.com',
    };
    expect(customerRegistrationSchema.safeParse(botCustomer).success).toBe(false);
  });

  it('validates admin login credentials schema', () => {
    expect(
      adminLoginSchema.safeParse({ mobile: '9876543210', password: 'Short' }).success
    ).toBe(false);
    expect(
      adminLoginSchema.safeParse({ mobile: '9876543210', password: 'ValidPassword123' })
        .success
    ).toBe(true);
  });
});
