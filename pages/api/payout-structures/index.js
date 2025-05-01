import { getAllPayoutStructures } from '@/lib/structures';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const structures = getAllPayoutStructures();

    // Add IDs to each structure to maintain compatibility with database approach
    const structuresWithIds = structures.map((structure, index) => ({
      ...structure,
      id: `file-structure-${index + 1}`
    }));

    return res.status(200).json({
      message: 'Payout structures fetched successfully',
      structures: structuresWithIds || []
    });
  } catch (error) {
    console.error('Error fetching payout structures:', error);
    
    return res.status(500).json({
      message: 'Error fetching payout structures',
      error: error.message || 'Unknown error'
    });
  }
} 