import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { RegisterPage } from '../pages/customer/RegisterPage';
import * as repairsApi from '../services/repairsApi';

describe('RegisterPage Component Tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const renderRegister = () =>
    render(
      <BrowserRouter>
        <RegisterPage />
      </BrowserRouter>
    );

  it('renders honeypot field hidden from assistive tech and humans', () => {
    const { container } = renderRegister();
    const honeypotWrapper = container.querySelector('[aria-hidden="true"]');
    expect(honeypotWrapper).toBeInTheDocument();
    const honeypotInput = container.querySelector('#website-field');
    expect(honeypotInput).toHaveAttribute('tabIndex', '-1');
    expect(honeypotInput).toHaveValue('');
  });

  it('reveals other problem text field when "Other" is tapped', async () => {
    renderRegister();

    // Initially Other text field is not in the DOM
    expect(
      screen.queryByLabelText(/Describe Other Problem/i)
    ).not.toBeInTheDocument();

    // Tap "Other" chip
    const otherChip = screen.getByRole('checkbox', { name: /Other/i });
    fireEvent.click(otherChip);

    // Other text field appears
    await waitFor(() => {
      expect(
        screen.getByLabelText(/Describe Other Problem/i)
      ).toBeInTheDocument();
    });
  });

  it('shows validation errors when submitting empty form', async () => {
    renderRegister();

    const submitBtn = screen.getByRole('button', {
      name: /Submit Repair Request/i,
    });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(screen.getByText(/Name must be at least 2 characters/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Mobile number must be exactly 10 digits/i)
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Please select at least one problem/i)
      ).toBeInTheDocument();
    });
  });

  it('prevents double submission by disabling the submit button', async () => {
    let resolveSubmit;
    const submitPromise = new Promise((resolve) => {
      resolveSubmit = resolve;
    });
    vi.spyOn(repairsApi, 'submitCustomerRepair').mockImplementation(
      () => submitPromise
    );

    renderRegister();

    // Fill valid data
    fireEvent.change(screen.getByLabelText(/Customer Name/i), {
      target: { value: 'Ramesh Patel' },
    });
    fireEvent.change(screen.getByLabelText(/Mobile Number/i), {
      target: { value: '9876543210' },
    });
    fireEvent.click(screen.getByRole('checkbox', { name: /Puncture/i }));

    const submitBtn = screen.getByRole('button', {
      name: /Submit Repair Request/i,
    });

    // Tap submit once
    fireEvent.click(submitBtn);

    // Button should be disabled immediately
    await waitFor(() => {
      expect(submitBtn).toBeDisabled();
    });

    // Multiple clicks during in-flight request
    fireEvent.click(submitBtn);
    fireEvent.click(submitBtn);

    expect(repairsApi.submitCustomerRepair).toHaveBeenCalledTimes(1);

    // Resolve
    resolveSubmit({
      repair_id: 'CC-2026-00001',
      customer_name: 'Ramesh Patel',
      received_at: '2026-11-07T12:00:00Z',
    });
  });
});
