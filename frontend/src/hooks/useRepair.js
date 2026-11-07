import { useState, useEffect, useCallback } from 'react';
import { getRepairDetail, toggleArchiveRepair } from '../services/adminRepairsApi';

export function useRepair(repairId) {
  const [repair, setRepair] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [is404, setIs404] = useState(false);

  const fetchRepair = useCallback(async () => {
    if (!repairId) return;
    setLoading(true);
    setError(null);
    setIs404(false);

    try {
      const data = await getRepairDetail(repairId);
      setRepair(data);
    } catch (err) {
      if (err.status === 404) {
        setIs404(true);
      }
      setError(err.message || 'Failed to load repair details.');
    } finally {
      setLoading(false);
    }
  }, [repairId]);

  useEffect(() => {
    fetchRepair();
  }, [fetchRepair]);

  const setArchived = useCallback(
    async (shouldArchive) => {
      const result = await toggleArchiveRepair(repairId, shouldArchive);
      setRepair((prev) =>
        prev
          ? {
              ...prev,
              archived: result.archived,
              archived_at: result.archived_at,
            }
          : null
      );
      return result;
    },
    [repairId]
  );

  return {
    repair,
    loading,
    error,
    is404,
    refetch: fetchRepair,
    setArchived,
  };
}
