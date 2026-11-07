import { useState, useEffect, useCallback } from 'react';
import { getRepairStats } from '../services/adminRepairsApi';

export function useStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getRepairStats();
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
