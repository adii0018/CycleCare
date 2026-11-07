import { apiClient } from './apiClient';

export async function adminLogin(mobile, password) {
  return apiClient('/api/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ mobile, password }),
  });
}

export async function adminLogout() {
  return apiClient('/api/auth/logout/', {
    method: 'POST',
  });
}

export async function getAdminMe() {
  return apiClient('/api/auth/me/');
}
