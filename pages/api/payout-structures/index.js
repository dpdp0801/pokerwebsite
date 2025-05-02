import { getAllPayoutStructures } from '@/lib/structures';
import fs from 'fs';
import path from 'path';

// Function to read tournament config from the data directory
function readTournamentConfig() {
  const dataDirectory = path.join(process.cwd(), 'data');
  const configFilePath = path.join(dataDirectory, 'tournamentConfig.json');
  try {
    if (!fs.existsSync(configFilePath)) {
      console.error(`[API /api/payout-structures] Config file not found: ${configFilePath}`);
      return null; 
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(fileContents);
    if (!config || typeof config !== 'object' || !config.payoutStructures) {
      console.error('[API /api/payout-structures] Invalid config file format - missing payoutStructures');
      return null;
    }
    return config;
  } catch (error) {
    console.error(`[API /api/payout-structures] Error reading/parsing config file:`, error);
    return null;
  }
}

export default async function handler(req, res) {
  console.log('=== PAYOUT STRUCTURES API CALLED ===');
  
  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Reading payout structures from config file...');
    const config = readTournamentConfig();
    
    if (!config || !config.payoutStructures || !Array.isArray(config.payoutStructures)) {
      console.log('No payout structures found in config');
      return res.status(200).json({
        message: 'No payout structures found',
        structures: []
      });
    }
    
    const structures = config.payoutStructures;
    console.log('Payout structures read successfully, count:', structures.length || 0);

    // Log some structure info for debugging
    if (structures.length > 0) {
      console.log('First structure name:', structures[0]?.name);
      console.log('First structure tiers count:', structures[0]?.tiers?.length || 0);
    }

    // Add IDs to each structure to maintain compatibility with database approach
    const structuresWithIds = structures.map((structure, index) => ({
      ...structure,
      id: `file-structure-${index + 1}`
    }));

    console.log('Returning payout structures response');
    return res.status(200).json({
      message: 'Payout structures fetched successfully',
      structures: structuresWithIds || []
    });
  } catch (error) {
    console.error('Error fetching payout structures:', error);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({
      message: 'Error fetching payout structures',
      error: error.message || 'Unknown error'
    });
  }
} 