import { getPayoutStructureByEntries } from '@/lib/structures';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { entries } = req.query;
    
    if (!entries || isNaN(parseInt(entries))) {
      return res.status(400).json({ 
        message: 'Invalid entries parameter. Please provide a valid number.' 
      });
    }
    
    const entryCount = parseInt(entries);
    const payoutStructure = getPayoutStructureByEntries(entryCount);
    
    if (!payoutStructure) {
      return res.status(404).json({ 
        message: `No payout structure found for ${entryCount} entries` 
      });
    }
    
    // Add an ID to the structure to maintain compatibility with database approach
    const structureWithId = {
      ...payoutStructure,
      id: `file-structure-${entryCount}`
    };

    return res.status(200).json({
      message: 'Payout structure fetched successfully',
      structure: structureWithId
    });
  } catch (error) {
    console.error('Error fetching payout structure:', error);
    
    return res.status(500).json({
      message: 'Error fetching payout structure',
      error: error.message || 'Unknown error'
    });
  }
} 