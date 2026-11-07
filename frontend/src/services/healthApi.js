import { apiClient } from './apiClient';

export async function pingHealth(timeout = 5000) {
  return apiClient('/api/health/', { timeout });
}
