import { useState, useEffect, useRef, useCallback } from 'react';
import { getRepairsList } from '../services/adminRepairsApi';
import { DEBOUNCE_SEARCH_MS } from '../lib/constants';

// Fast in-memory cache for instant tab transitions
const repairsMemoryCache = new Map();

export function useRepairs({ q = '', page = 1, page_size = 20, archived = false }) {
  const cacheKey = `${q.trim().toLowerCase()}:${page}:${page_size}:${archived}`;
  const cachedData = repairsMemoryCache.get(cacheKey);

  const [data, setData] = useState(
    cachedData || {
      results: [],
      page: 1,
      page_size: 20,
      total: 0,
      total_pages: 1,
    }
  );
  const [loading, setLoading] = useState(!cachedData);
  const [error, setError] = useState(null);

  const abortControllerRef = useRef(null);

  const fetchRepairs = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    if (!repairsMemoryCache.has(cacheKey)) {
      setLoading(true);
    }
    setError(null);

    try {
      const response = await getRepairsList(
        { q, page, page_size, archived },
        { signal: abortControllerRef.current.signal }
      );
      repairsMemoryCache.set(cacheKey, response);
      setData(response);
    } catch (err) {
      if (
        err.name === 'AbortError' ||
        (err.code === 'timeout' && abortControllerRef.current?.signal.aborted)
      ) {
        return;
      }
      setError(err.message || 'Failed to load repair records.');
    } finally {
      setLoading(false);
    }
  }, [q, page, page_size, archived, cacheKey]);

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
