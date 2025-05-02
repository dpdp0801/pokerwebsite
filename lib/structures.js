import fs from 'fs';
import path from 'path';
import { ensureDataDirectory } from './middleware';

// Get the absolute path to the data directory
const dataDirectory = path.join(process.cwd(), 'data');
const configFilePath = path.join(dataDirectory, 'tournamentConfig.json');

// Ensure the data directory and file exist
if (typeof window === 'undefined') {
  try {
    ensureDataDirectory(); // Ensure directory exists
    if (!fs.existsSync(configFilePath)) {
      console.warn(`Warning: ${configFilePath} not found. Creating an empty default.`);
      // Optionally create a default empty structure if needed
      // fs.writeFileSync(configFilePath, JSON.stringify({ blindStructure: { levels: [] }, payoutStructures: [] }, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring data directory/file:', error);
  }
}

/**
 * Read and parse the tournament config JSON file
 */
function readTournamentConfig() {
  try {
    if (!fs.existsSync(configFilePath)) {
      console.error(`Config file not found: ${configFilePath}`);
      return { blindStructure: null, payoutStructures: [] }; // Return default empty structure
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(fileContents);
    // Basic validation
    if (!config || typeof config !== 'object') {
      throw new Error('Invalid config format: not an object.');
    }
    if (!config.blindStructure || !Array.isArray(config.blindStructure.levels)) {
      console.warn('Blind structure or levels array missing/invalid in config.');
      config.blindStructure = { ...(config.blindStructure || {}), levels: [] };
    }
    if (!Array.isArray(config.payoutStructures)) {
      console.warn('Payout structures array missing/invalid in config.');
      config.payoutStructures = [];
    }
    return config;
  } catch (error) {
    console.error(`Error reading or parsing ${configFilePath}:`, error);
    // Return a default empty structure on error to prevent crashes
    return { blindStructure: null, payoutStructures: [] };
  }
}

const tournamentConfig = readTournamentConfig();

/**
 * Get the blind structure data
 */
export function getBlindStructure() {
  // Return a deep copy to prevent accidental modification of the cached config
  return tournamentConfig.blindStructure ? JSON.parse(JSON.stringify(tournamentConfig.blindStructure)) : null;
}

/**
 * Get all payout structures
 */
export function getAllPayoutStructures() {
  // Return a deep copy
  return tournamentConfig.payoutStructures ? JSON.parse(JSON.stringify(tournamentConfig.payoutStructures)) : [];
}

/**
 * Get payout structures (alias for getAllPayoutStructures)
 */
export function getPayoutStructures() {
  return getAllPayoutStructures();
}

/**
 * Get a payout structure for a specific number of entries
 */
export function getPayoutStructureByEntries(entryCount) {
  const structures = getAllPayoutStructures(); // Uses the cached & copied data
  return structures.find(
    structure =>
      entryCount >= structure.minEntries &&
      entryCount <= structure.maxEntries
  );
}

export default {
  getBlindStructure,
  getPayoutStructures,
  getAllPayoutStructures,
  getPayoutStructureByEntries
}; 