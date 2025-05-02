import { useState, useEffect, useCallback } from 'react';

export default function usePayoutStructure() {
  const [allStructures, setAllStructures] = useState([]);
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  const fetchAllStructures = useCallback(async () => {
    if (initialLoadComplete) return;
    console.log('[usePayoutStructure] Fetching all structures from /api/structures...');
    setPayoutLoading(true);
    try {
      const response = await fetch('/api/structures');
      if (!response.ok) {
        throw new Error('Failed to fetch structures');
      }
      const data = await response.json();
      if (data && Array.isArray(data.payoutStructures)) {
        setAllStructures(data.payoutStructures);
        console.log(`[usePayoutStructure] Loaded ${data.payoutStructures.length} payout structures.`);
      } else {
        console.error('[usePayoutStructure] Invalid data received from /api/structures');
        setAllStructures([]);
      }
    } catch (error) {
      console.error('Error fetching all payout structures:', error);
      setAllStructures([]);
    } finally {
      setPayoutLoading(false);
      setInitialLoadComplete(true);
    }
  }, [initialLoadComplete]);

  useEffect(() => {
    fetchAllStructures();
  }, [fetchAllStructures]);

  const findStructureForCount = useCallback((entryCount) => {
    if (!initialLoadComplete) return;
    
    console.log(`[usePayoutStructure] Finding structure for entry count: ${entryCount}`);
    const structure = allStructures.find(
      (s) => entryCount >= s.minEntries && entryCount <= s.maxEntries
    );

    if (structure) {
      setPayoutStructure(structure);
    } else {
      setPayoutStructure(null);
    }
    setLastFetchedCount(entryCount);
  }, [allStructures, initialLoadComplete]);

  const fetchPayoutStructureIfNeeded = useCallback((playerCount) => {
    const entryCount = playerCount ?? 0;
    if (entryCount !== lastFetchedCount) {
      findStructureForCount(entryCount);
    }
  }, [lastFetchedCount, findStructureForCount]);

  return {
    payoutStructure,
    payoutLoading,
    fetchPayoutStructureIfNeeded
  };
} 