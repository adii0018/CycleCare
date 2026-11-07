import { apiClient } from './apiClient';

/**
 * Builds FormData following the server contract:
 * - repair_problems repeated field (one append per code)
 * - photos repeated field (one append per compressed file)
 * - idempotency_key
 * - website honeypot (optional, customer only)
 */
export function buildRepairFormData(data, photos = []) {
  const formData = new FormData();

  formData.append('customer_name', data.customer_name);
  formData.append('mobile', data.mobile);

  // Append repeated problem codes
  (data.repair_problems || []).forEach((code) => {
    formData.append('repair_problems', code);
  });

  if (data.other_problem_text) {
    formData.append('other_problem_text', data.other_problem_text);
  }

  if (data.additional_details) {
    formData.append('additional_details', data.additional_details);
  }

  formData.append('idempotency_key', data.idempotency_key);

  // Customer registration honeypot
  if (data.website !== undefined) {
    formData.append('website', data.website || '');
  }

  // Append compressed photos (0-3)
  photos.forEach((file) => {
    formData.append('photos', file);
  });

  return formData;
}

export async function submitCustomerRepair(formData, options = {}) {
  return apiClient('/api/repairs/', {
    method: 'POST',
    body: formData,
    ...options,
  });
}
