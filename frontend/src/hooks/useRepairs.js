import { useState, useEffect, useRef, useCallback } from 'react';
import { getRepairsList } from '../services/adminRepairsApi';
import { DEBOUNCE_SEARCH_MS } from '../lib/constants';

export function useRepairs({ q = '', page = 1, page_size = 20, archived = false }) {
  const [data, setData] = useState({
    results: [],
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchRepairs = useCallback(async () => {
    // Abort any in-flight request so stale responses never overwrite new ones
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);

    try {
      const response = await getRepairsList(
        { q, page, page_size, archived },
        { signal: abortControllerRef.current.signal }
      );
      setData(response);
    } catch (err) {
      if (err.name === 'AbortError' || err.code === 'timeout' && abortControllerRef.current?.signal.aborted) {
        // Request was intentionally cancelled by a newer query; ignore
        return;
      }
      setError(err.message || 'Failed to load repair records.');
    } finally {
      setLoading(false);
    }
  }, [q, page, page_size, archived]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchRepairs();
    }, DEBOUNCE_SEARCH_MS);

    return () => {
      clearTimeout(timer);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchRepairs]);

  return {
    repairs: data.results,
    page: data.page,
    pageSize: data.page_size,
    total: data.total,
    totalPages: data.total_pages,
    loading,
    error,
    refetch: fetchRepairs,
  };
}
