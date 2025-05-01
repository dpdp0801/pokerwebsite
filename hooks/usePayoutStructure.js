import { useState } from 'react';

export default function usePayoutStructure() {
  const [payoutStructure, setPayoutStructure] = useState(null);
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Only fetch payout structure if it's not loaded or entries have changed
  const fetchPayoutStructureIfNeeded = async (playerCount) => {
    // Skip if already loading
    if (payoutLoading) return;
    
    // Skip if we already have the data and the player count hasn't changed significantly
    if (
      payoutStructure && 
      payoutStructure.playerCount === playerCount
    ) {
      return;
    }
    
    try {
      setPayoutLoading(true);
      // Ensure playerCount is a valid number
      const entryCount = Math.max(playerCount || 0, 0);
      const response = await fetch(`/api/payout-structures/get-by-entries?entries=${entryCount}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch payout structure');
      }
      
      const data = await response.json();
      
      // The file-based API returns the structure in a different format
      setPayoutStructure({
        ...data.structure,
        playerCount // Store the player count for future comparisons
      });
    } catch (error) {
      console.error('Error fetching payout structure:', error);
      // Initialize with an empty structure on error
      setPayoutStructure({
        id: "default",
        name: "No entries yet",
        minEntries: 0,
        maxEntries: 0,
        tiers: [],
        playerCount
      });
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