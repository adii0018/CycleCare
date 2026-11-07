import { useState, useEffect, useCallback } from 'react';
import { getRepairStats } from '../services/adminRepairsApi';

let memoryStatsCache = null;

export function useStats() {
  const [stats, setStats] = useState(memoryStatsCache);
  const [loading, setLoading] = useState(!memoryStatsCache);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!memoryStatsCache) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await getRepairStats();
      memoryStatsCache = data;
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load repair statistics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
