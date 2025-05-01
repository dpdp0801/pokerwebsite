import fs from 'fs';
import path from 'path';
import { ensureDataDirectory } from './middleware';

// Get the absolute path to the data directory
const dataDirectory = path.join(process.cwd(), 'data');

// Ensure the data directory and files exist
if (typeof window === 'undefined') {
  try {
    ensureDataDirectory();
  } catch (error) {
    console.error('Error ensuring data directory:', error);
  }
}

/**
 * Read and parse a JSON file from the data directory
 */
function readJsonFile(filename) {
  try {
    console.log(`Attempting to read file: ${filename}`);
    console.log(`Data directory: ${dataDirectory}`);
    const filePath = path.join(dataDirectory, filename);
    console.log(`Full file path: ${filePath}`);
    console.log(`File exists: ${fs.existsSync(filePath)}`);
    
    const fileContents = fs.readFileSync(filePath, 'utf8');
    console.log(`File contents length: ${fileContents.length}`);
    
    const parsedData = JSON.parse(fileContents);
    console.log(`Successfully parsed JSON data for ${filename}`);
    return parsedData;
  } catch (error) {
    console.error(`Error reading file ${filename}:`, error);
    console.error(`Error details: ${error.stack}`);
    return null;
  }
}

/**
 * Get the blind structure data
 */
export function getBlindStructure() {
  console.log('getBlindStructure called');
  return readJsonFile('blindStructure.json');
}

/**
 * Get all payout structures
 */
export function getAllPayoutStructures() {
  console.log('getAllPayoutStructures called');
  return readJsonFile('payoutStructures.json') || [];
}

/**
 * Get a payout structure for a specific number of entries
 */
export function getPayoutStructureByEntries(entryCount) {
  console.log(`getPayoutStructureByEntries called with entryCount: ${entryCount}`);
  const structures = getAllPayoutStructures();
  
  return structures.find(
    structure => 
      entryCount >= structure.minEntries && 
      entryCount <= structure.maxEntries
  );
} 