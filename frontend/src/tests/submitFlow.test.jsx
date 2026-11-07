import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from '../pages/customer/RegisterPage';
import * as repairsApi from '../services/repairsApi';
import { SESSION_STORAGE_KEY } from '../lib/constants';

describe('Submit Flow & Error Mapping', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  const renderRegister = () =>
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

  it('navigates and saves only non-sensitive data to sessionStorage on success', async () => {
    vi.spyOn(repairsApi, 'submitCustomerRepair').mockResolvedValueOnce({
      repair_id: 'CC-2026-00001',
      customer_name: 'Anil Kumar',
      received_at: '2026-11-07T10:00:00Z',
    });

    renderRegister();

    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: 'Anil Kumar' },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Brake/i }));

    fireEvent.click(screen.getByRole('button', { name: /Submit Repair Request/i }));

    await waitFor(() => {
      const stored = JSON.parse(sessionStorage.getItem(SESSION_STORAGE_KEY));
      expect(stored).toEqual({
        repair_id: 'CC-2026-00001',
        customer_name: 'Anil Kumar',
        received_at: '2026-11-07T10:00:00Z',
      });
      // Ensure no mobile or photos stored
      expect(stored.mobile).toBeUndefined();
      expect(stored.photos).toBeUndefined();
    });
  });

  it('keeps form data and the SAME idempotency key when network error occurs', async () => {
    const networkErr = new Error(
      'Could not reach the server. Check your internet and try again.'
    );
    networkErr.status = 0;
    networkErr.code = 'network_error';

    const submitSpy = vi
      .spyOn(repairsApi, 'submitCustomerRepair')
      .mockRejectedValueOnce(networkErr)
      .mockResolvedValueOnce({
        repair_id: 'CC-2026-00002',
        customer_name: 'Deepak',
        received_at: '2026-11-07T10:05:00Z',
      });

    renderRegister();

    const nameInput = screen.getByLabelText(/Customer Name/i);
    const mobileInput = screen.getByLabelText(/Mobile Number/i);

    fireEvent.change(nameInput, { target: { value: 'Deepak' } });
    fireEvent.change(mobileInput, { target: { value: '9876543210' } });
    fireEvent.click(screen.getByRole('checkbox', { name: /Chain/i }));

    const submitBtn = screen.getByRole('button', {
      name: /Submit Repair Request/i,
    });

    // 1st attempt fails
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Could not reach the server/i);
    });

    // Form inputs must remain preserved
    expect(nameInput).toHaveValue('Deepak');
    expect(mobileInput).toHaveValue('9876543210');

    // Extract first call's idempotency_key
    const firstCallKey = submitSpy.mock.calls[0][0].get('idempotency_key');

    // 2nd retry
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(2);
    });

    const retryCallKey = submitSpy.mock.calls[1][0].get('idempotency_key');
    expect(retryCallKey).toBe(firstCallKey);
  });
});
