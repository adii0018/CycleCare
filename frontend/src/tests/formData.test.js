import { describe, it, expect } from 'vitest';
import { buildRepairFormData } from '../services/repairsApi';

describe('FormData Builder Test', () => {
  it('appends repair_problems and photos as repeated fields without manual Content-Type', () => {
    const data = {
      customer_name: 'Rahul Sharma',
      mobile: '9876543210',
      repair_problems: ['puncture_tyre', 'gear', 'chain'],
      other_problem_text: '',
      additional_details: 'Front tyre flat',
      idempotency_key: 'test-uuid-1234',
      website: '',
    };

    const mockPhoto1 = new File(['bytes1'], 'photo1.jpg', { type: 'image/jpeg' });
    const mockPhoto2 = new File(['bytes2'], 'photo2.jpg', { type: 'image/jpeg' });

    const formData = buildRepairFormData(data, [mockPhoto1, mockPhoto2]);

    expect(formData.get('customer_name')).toBe('Rahul Sharma');
    expect(formData.get('mobile')).toBe('9876543210');
    expect(formData.get('idempotency_key')).toBe('test-uuid-1234');
    expect(formData.get('website')).toBe('');

    // Check repeated repair_problems
    const problems = formData.getAll('repair_problems');
    expect(problems).toEqual(['puncture_tyre', 'gear', 'chain']);

    // Check repeated photos
    const photos = formData.getAll('photos');
    expect(photos.length).toBe(2);
    expect(photos[0].name).toBe('photo1.jpg');
    expect(photos[1].name).toBe('photo2.jpg');
  });
});
