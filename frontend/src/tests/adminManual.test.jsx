import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AdminManualPage } from '../pages/admin/AdminManualPage';
import * as adminRepairsApi from '../services/adminRepairsApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Admin Manual Registration Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders without honeypot, posts to /api/repairs/manual/ and navigates to detail on success', async () => {
    const submitSpy = vi
      .spyOn(adminRepairsApi, 'submitManualRepair')
      .mockResolvedValueOnce({
        repair_id: 'CC-2026-00099',
        customer_name: 'Manoj Gupta',
        received_at: '2026-11-07T13:00:00Z',
      });

    const { container } = render(
      <BrowserRouter>
        <AdminManualPage />
      </BrowserRouter>
    );

    // Verify NO honeypot input is in the DOM
    const honeypotInput = container.querySelector('#website-field');
    expect(honeypotInput).toBeNull();

    // Fill valid walk-in details
    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: 'Manoj Gupta' },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Gear/i }));

    const submitBtn = screen.getByRole('button', {
      name: /Register Bicycle Walk-in/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(submitSpy).toHaveBeenCalledTimes(1);
    });

    const submittedFormData = submitSpy.mock.calls[0][0];
    expect(submittedFormData.get('customer_name')).toBe('Manoj Gupta');
    expect(submittedFormData.get('mobile')).toBe('9876543210');
    expect(submittedFormData.get('repair_problems')).toBe('gear');
    expect(submittedFormData.get('website')).toBeNull();

    // Successful submit navigates to the new record's detail page
    expect(mockNavigate).toHaveBeenCalledWith('/admin/repairs/CC-2026-00099');
  });
});
