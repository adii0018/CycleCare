import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useWarmup } from '../hooks/useWarmup';
import * as healthApi from '../services/healthApi';

describe('useWarmup Hook', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('sets ready to true on successful health ping', async () => {
    vi.spyOn(healthApi, 'pingHealth').mockResolvedValueOnce({ status: 'ok' });

    const { result } = renderHook(() => useWarmup());

    await waitFor(() => {
      expect(result.current.ready).toBe(true);
    });
  });

  it('sets ready to true even if health ping fails after fallback', async () => {
    vi.spyOn(healthApi, 'pingHealth').mockRejectedValueOnce(new Error('Down'));

    const { result } = renderHook(() => useWarmup());

    await waitFor(
      () => {
        expect(result.current.ready).toBe(true);
      },
      { timeout: 7000 }
    );
  });
});
