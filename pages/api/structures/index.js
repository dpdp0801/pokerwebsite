import fs from 'fs';
import path from 'path';

// Get the absolute path to the data file
const dataDirectory = path.join(process.cwd(), 'data');
const configFilePath = path.join(dataDirectory, 'tournamentConfig.json');

let cachedConfig = null; // Simple in-memory cache

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Use cache if available
  if (cachedConfig) {
    // console.log('[API /api/structures] Returning cached config.');
    return res.status(200).json(cachedConfig);
  }

  try {
    // console.log(`[API /api/structures] Reading config file: ${configFilePath}`);
    if (!fs.existsSync(configFilePath)) {
      console.error(`[API /api/structures] Config file not found: ${configFilePath}`);
      return res.status(404).json({ message: 'Tournament configuration not found.' });
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(fileContents);
    
    // Basic validation
    if (!config || typeof config !== 'object' || !config.blindStructure || !config.payoutStructures) {
         console.error('[API /api/structures] Invalid config file format.');
         return res.status(500).json({ message: 'Invalid tournament configuration file.' });
    }
    
    // Cache the result
    cachedConfig = config;
    // console.log('[API /api/structures] Config read and cached successfully.');
    
    return res.status(200).json(config);

  } catch (error) {
    console.error(`[API /api/structures] Error reading/parsing config file:`, error);
    return res.status(500).json({ message: 'Failed to load tournament configuration.' });
  }
} 