import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AdminRepairsPage } from '../pages/admin/AdminRepairsPage';
import * as adminRepairsApi from '../services/adminRepairsApi';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

describe('Admin Repairs List Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockRepairsData = {
    results: [
      {
        repair_id: 'CC-2026-00001',
        customer_name: 'Rahul Sharma',
        mobile: '9876543210',
        repair_problems: ['brake'],
        problem_summary: 'Brake Problem',
        photo_count: 2,
        has_active_photos: true,
        archived: false,
        received_at: '2026-11-07T10:00:00Z',
      },
    ],
    page: 1,
    page_size: 20,
    total: 1,
    total_pages: 1,
  };

  it('renders records list with search bar and call button that stops propagation', async () => {
    vi.spyOn(adminRepairsApi, 'getRepairsList').mockResolvedValue(mockRepairsData);

    render(
      <MemoryRouter initialEntries={['/admin/repairs']}>
        <AdminRepairsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getAllByText('Rahul Sharma').length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText('CC-2026-00001').length).toBeGreaterThanOrEqual(1);
    });

    // Call button click does NOT trigger card navigation
    const callBtn = screen.getAllByLabelText(/Call Rahul Sharma/i)[0];
    fireEvent.click(callBtn);
    expect(mockNavigate).not.toHaveBeenCalled();

    // Clicking card/row triggers navigation to detail
    const card = screen.getAllByRole('button', { name: /Rahul Sharma/i })[0];
    fireEvent.click(card);
    expect(mockNavigate).toHaveBeenCalledWith('/admin/repairs/CC-2026-00001');
  });

  it('shows empty state when no records match search', async () => {
    vi.spyOn(adminRepairsApi, 'getRepairsList').mockResolvedValue({
      results: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 0,
    });

    render(
      <MemoryRouter initialEntries={['/admin/repairs']}>
        <AdminRepairsPage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText(/No repair records yet/i)).toBeInTheDocument();
    });
  });
});
