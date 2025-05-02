import { ensureDataDirectory } from './middleware'; // Keep if middleware still uses it?

// NOTE: File reading (fs module) has been moved to /api/structures
// This file should now only contain pure utility functions if needed.

/**
 * Find a payout structure for a specific number of entries from a given list.
 * (This logic is now likely duplicated in usePayoutStructure hook, consider removing)
 */
export function getPayoutStructureByEntries(allStructures, entryCount) {
  if (!allStructures || !Array.isArray(allStructures)) return null;
  const count = entryCount ?? 0;
  return allStructures.find(
    structure =>
      count >= structure.minEntries &&
      count <= structure.maxEntries
  );
}

// Example: If you needed getBlindStructure logic elsewhere without FS:
// export function getBlindStructureLogic(config) { 
//   return config?.blindStructure || null;
// }

// Default export might not be needed anymore
export default {
  getPayoutStructureByEntries // Keep export if anything else relies on it?
}; 