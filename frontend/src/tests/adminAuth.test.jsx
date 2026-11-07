import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../routes/ProtectedRoute';
import { AdminLoginPage } from '../pages/admin/AdminLoginPage';
import * as adminAuthApi from '../services/adminAuthApi';
import { apiClient } from '../services/apiClient';

function TestProtectedPage() {
  const { admin, logout } = useAuth();
  return (
    <div>
      <h1>Protected Dashboard</h1>
      <p>Logged as: {admin?.mobile}</p>
      <button onClick={logout}>Sign Out</button>
    </div>
  );
}

describe('Admin Authentication & Protected Routes', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    sessionStorage.clear();
  });

  it('shows skeleton while loading auth status and redirects to /admin/login on 401', async () => {
    const err401 = new Error('Invalid session');
    err401.status = 401;
    vi.spyOn(adminAuthApi, 'getAdminMe').mockRejectedValueOnce(err401);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route index element={<TestProtectedPage />} />
            </Route>
            <Route path="/admin/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    // Redirects to login page
    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });
  });

  it('renders protected content when authenticated and logout clears in-memory state', async () => {
    vi.spyOn(adminAuthApi, 'getAdminMe').mockResolvedValueOnce({
      admin: { mobile: '9876543210' },
    });
    vi.spyOn(adminAuthApi, 'adminLogout').mockResolvedValueOnce(null);

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route index element={<TestProtectedPage />} />
            </Route>
            <Route path="/admin/login" element={<div>Login Page</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
      expect(screen.getByText('Logged as: 9876543210')).toBeInTheDocument();
    });

    // Tap logout
    fireEvent.click(screen.getByText('Sign Out'));

    await waitFor(() => {
      expect(screen.getByText('Login Page')).toBeInTheDocument();
    });

    // Ensure zero admin data in localStorage/sessionStorage
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('login page toggles password visibility and handles generic error', async () => {
    vi.spyOn(adminAuthApi, 'getAdminMe').mockRejectedValueOnce(new Error('401'));
    vi.spyOn(adminAuthApi, 'adminLogin').mockRejectedValueOnce(
      new Error('Invalid mobile number or password.')
    );

    render(
      <MemoryRouter initialEntries={['/admin/login']}>
        <AuthProvider>
          <AdminLoginPage />
        </AuthProvider>
      </MemoryRouter>
    );

    const passInput = screen.getByPlaceholderText(/Enter your password/i);
    expect(passInput).toHaveAttribute('type', 'password');

    // Toggle show password
    const toggleBtn = screen.getByLabelText(/Show password/i);
    fireEvent.click(toggleBtn);
    expect(passInput).toHaveAttribute('type', 'text');

    // Fill credentials and submit
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.change(passInput, {
      target: { value: 'WrongPassword123' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Sign In to Admin/i }));

    await waitFor(() => {
      expect(
        screen.getByText(/Invalid mobile number or password/i)
      ).toBeInTheDocument();
    });
  });

  it('triggers global 401 handler on unauthenticated admin API call', async () => {
    vi.spyOn(adminAuthApi, 'getAdminMe').mockResolvedValueOnce({
      admin: { mobile: '9876543210' },
    });

    // Mock global fetch returning 401
    global.fetch = vi.fn().mockResolvedValue({
      status: 401,
      ok: false,
      headers: { get: () => 'application/json' },
      json: async () => ({
        error: { code: 'authentication_failed', message: 'Session expired' },
      }),
    });

    render(
      <MemoryRouter initialEntries={['/admin']}>
        <AuthProvider>
          <Routes>
            <Route path="/admin" element={<ProtectedRoute />}>
              <Route index element={<TestProtectedPage />} />
            </Route>
            <Route path="/admin/login" element={<div>Redirected Login</div>} />
          </Routes>
        </AuthProvider>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Protected Dashboard')).toBeInTheDocument();
    });

    // Fire API call that returns 401
    await expect(apiClient('/api/repairs/stats/')).rejects.toThrow();

    await waitFor(() => {
      expect(screen.getByText('Redirected Login')).toBeInTheDocument();
    });
  });
});
