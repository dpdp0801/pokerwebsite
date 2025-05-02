import { useState, useEffect } from 'react';
import { getPayoutStructureByEntries } from '@/lib/structures';

export default function usePayoutStructure() {
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [lastFetchedCount, setLastFetchedCount] = useState(null);

  const fetchPayoutStructureIfNeeded = async (playerCount) => {
    const entryCount = playerCount ?? 0;
    
    if (entryCount === lastFetchedCount) {
      return;
    }

    console.log(`[usePayoutStructure] Fetching for entry count: ${entryCount}`);
    setPayoutLoading(true);
    try {
      const structure = getPayoutStructureByEntries(entryCount);

      if (structure) {
        console.log(`[usePayoutStructure] Found structure: ${structure.name}`);
        setPayoutStructure(structure);
      } else {
        console.log(`[usePayoutStructure] No structure found for ${entryCount} entries.`);
        setPayoutStructure(null);
      }
      setLastFetchedCount(entryCount);
    } catch (error) {
      console.error('Error getting payout structure:', error);
      setPayoutStructure(null);
      setLastFetchedCount(entryCount);
    } finally {
      setPayoutLoading(false);
    }
  };

  return {
    payoutStructure,
    payoutLoading,
    fetchPayoutStructureIfNeeded
  };
} 