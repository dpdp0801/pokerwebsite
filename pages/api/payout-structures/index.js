import { getAllPayoutStructures } from '@/lib/structures';

export default async function handler(req, res) {
  console.log('=== PAYOUT STRUCTURES API CALLED ===');
  
  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Reading payout structures from file...');
    const structures = getAllPayoutStructures();
    console.log('Payout structures read successfully, count:', structures?.length || 0);

    if (!structures || structures.length === 0) {
      console.log('No payout structures found');
    } else {
      // Log some structure info for debugging
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