import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminDetailPage } from '../pages/admin/AdminDetailPage';
import * as adminRepairsApi from '../services/adminRepairsApi';

describe('Admin Repair Detail Page', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  const mockDetailData = {
    repair_id: 'CC-2026-00001',
    customer_name: 'Pooja Verma',
    mobile: '9876543210',
    repair_problems: ['puncture_tyre', 'other'],
    other_problem_text: 'Loose mudguard',
    additional_details: 'Deliver by evening',
    received_at: '2026-11-07T12:00:00Z',
    source: 'customer',
    archived: false,
    archived_at: null,
    photos: [
      {
        id: 'photo-1',
        url: '/api/repairs/CC-2026-00001/photos/photo-1/',
        expired: false,
      },
      { id: 'photo-2', url: '/api/repairs/CC-2026-00001/photos/photo-2/', expired: true },
    ],
  };

  const renderDetail = (id = 'CC-2026-00001') =>
    render(
      <MemoryRouter initialEntries={[`/admin/repairs/${id}`]}>
        <Routes>
          <Route path="/admin/repairs/:repairId" element={<AdminDetailPage />} />
        </Routes>
      </MemoryRouter>
    );

  it('renders repair details, maps problem labels, and handles expired photos', async () => {
    vi.spyOn(adminRepairsApi, 'getRepairDetail').mockResolvedValue(mockDetailData);

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('CC-2026-00001')).toBeInTheDocument();
      expect(screen.getByText('Pooja Verma')).toBeInTheDocument();
      expect(screen.getByText(/Puncture \/ Tyre Problem/i)).toBeInTheDocument();
      expect(screen.getByText(/"Loose mudguard"/i)).toBeInTheDocument();
    });

    // Check tel link format
    const callLink = screen.getByRole('link', { name: /Call Customer/i });
    expect(callLink).toHaveAttribute('href', 'tel:+919876543210');

    // Check expired photo tile
    expect(screen.getByText('Photo Expired')).toBeInTheDocument();
  });

  it('handles archive confirmation modal flow', async () => {
    vi.spyOn(adminRepairsApi, 'getRepairDetail').mockResolvedValue(mockDetailData);
    vi.spyOn(adminRepairsApi, 'toggleArchiveRepair').mockResolvedValue({
      repair_id: 'CC-2026-00001',
      archived: true,
      archived_at: '2026-11-07T12:05:00Z',
    });

    renderDetail();

    await waitFor(() => {
      expect(screen.getByText('CC-2026-00001')).toBeInTheDocument();
    });

    // Tap Archive Record button
    const archiveBtn = screen.getByRole('button', { name: /Archive Record/i });
    fireEvent.click(archiveBtn);

    // Modal appears
    expect(
      screen.getByRole('dialog', { name: /Archive this repair record\?/i })
    ).toBeInTheDocument();

    // Confirm archive
    const confirmBtn = screen.getByRole('button', { name: 'Archive' });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminRepairsApi.toggleArchiveRepair).toHaveBeenCalledWith(
        'CC-2026-00001',
        true
      );
    });
  });

  it('displays 404 message when record is not found', async () => {
    const err404 = new Error('Not found');
    err404.status = 404;
    vi.spyOn(adminRepairsApi, 'getRepairDetail').mockRejectedValue(err404);

    renderDetail('CC-2026-99999');

    await waitFor(() => {
      expect(screen.getByText(/Record Not Found/i)).toBeInTheDocument();
      expect(screen.getByText('CC-2026-99999')).toBeInTheDocument();
    });
  });
});
