import { apiClient } from './apiClient';

export async function getRepairStats(options = {}) {
  return apiClient('/api/repairs/stats/', options);
}

export async function getRepairsList(params = {}, options = {}) {
  const query = new URLSearchParams();
  if (params.q) query.set('q', params.q);
  if (params.archived !== undefined) query.set('archived', String(params.archived));
  if (params.page) query.set('page', String(params.page));
  if (params.page_size) query.set('page_size', String(params.page_size));

  const qs = query.toString();
  const endpoint = qs ? `/api/repairs/?${qs}` : '/api/repairs/';
  return apiClient(endpoint, options);
}

export async function getRepairDetail(repairId, options = {}) {
  return apiClient(`/api/repairs/${repairId}/`, options);
}

export async function submitManualRepair(formData, options = {}) {
  return apiClient('/api/repairs/manual/', {
    method: 'POST',
    body: formData,
    ...options,
  });
}

export async function toggleArchiveRepair(repairId, archived, options = {}) {
  return apiClient(`/api/repairs/${repairId}/archive/`, {
    method: 'PATCH',
    body: JSON.stringify({ archived }),
    ...options,
  });
}
