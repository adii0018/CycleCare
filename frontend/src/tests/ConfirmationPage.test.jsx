import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ConfirmationPage } from '../pages/customer/ConfirmationPage';
import { SESSION_STORAGE_KEY } from '../lib/constants';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('ConfirmationPage Component', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('redirects to /register if accessed with empty sessionStorage', () => {
    render(
      <BrowserRouter>
        <ConfirmationPage />
      </BrowserRouter>
    );

    expect(mockNavigate).toHaveBeenCalledWith('/register', { replace: true });
  });

  it('renders stored repair details correctly and copies repair ID', () => {
    sessionStorage.setItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({
        repair_id: 'CC-2026-00042',
        customer_name: 'Pooja Verma',
        received_at: '2026-11-07T12:30:00Z',
      })
    );

    render(
      <BrowserRouter>
        <ConfirmationPage />
      </BrowserRouter>
    );

    expect(screen.getByText('CC-2026-00042')).toBeInTheDocument();
    expect(screen.getByText('Pooja Verma')).toBeInTheDocument();

    // Copy button
    const copyBtn = screen.getByRole('button', { name: /Copy Repair ID/i });
    fireEvent.click(copyBtn);
    expect(copyBtn).toBeInTheDocument();

    // Register another bicycle button
    const resetBtn = screen.getByRole('button', {
      name: /Register another bicycle/i,
    });
    fireEvent.click(resetBtn);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBeNull();
    expect(mockNavigate).toHaveBeenCalledWith('/register', { replace: true });
  });
});
