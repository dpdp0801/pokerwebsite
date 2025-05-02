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
    if (!initialLoadComplete || !Array.isArray(allStructures)) {
      console.log(`[usePayoutStructure] Cannot find structure yet. InitialLoad: ${initialLoadComplete}, AllStructures is Array: ${Array.isArray(allStructures)}`);
      return;
    }
    
    console.log(`[usePayoutStructure] Finding structure for entry count: ${entryCount} within ${allStructures.length} total structures.`);
    const structure = allStructures.find(
      (s) => entryCount >= s.minEntries && entryCount <= s.maxEntries
    );

    if (structure) {
      console.log(`[usePayoutStructure] Found matching structure: ${structure.name}`);
      setPayoutStructure(structure);
    } else {
      console.log(`[usePayoutStructure] No structure found for ${entryCount} entries.`);
      setPayoutStructure(null);
    }
    setLastFetchedCount(entryCount);
  }, [allStructures, initialLoadComplete]);

  const fetchPayoutStructureIfNeeded = useCallback((playerCount) => {
    const entryCount = playerCount ?? 0;
    if (entryCount !== lastFetchedCount) {
      console.log(`[usePayoutStructure] Player count changed (${lastFetchedCount} -> ${entryCount}). Running findStructureForCount.`);
      findStructureForCount(entryCount);
    } else {
      // console.log(`[usePayoutStructure] Player count (${entryCount}) hasn't changed. Skipping find.`);
    }
  }, [lastFetchedCount, findStructureForCount]);

  return {
    payoutStructure,
    payoutLoading,
    fetchPayoutStructureIfNeeded
  };
} 