import fs from 'fs';
import path from 'path';

// Get the absolute path to the data directory
const dataDirectory = path.join(process.cwd(), 'data');

/**
 * Read and parse a JSON file from the data directory
 */
function readJsonFile(filename) {
  try {
    const filePath = path.join(dataDirectory, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(fileContents);
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error);
    return null;
  }
}

/**
 * Get the blind structure data
 */
export function getBlindStructure() {
  return readJsonFile('blindStructure.json');
}

/**
 * Get all payout structures
 */
export function getAllPayoutStructures() {
  return readJsonFile('payoutStructures.json') || [];
}

/**
 * Get a payout structure for a specific number of entries
 */
export function getPayoutStructureByEntries(entryCount) {
  const structures = getAllPayoutStructures();
  
  return structures.find(
    structure => 
      entryCount >= structure.minEntries && 
      entryCount <= structure.maxEntries
  );
} 