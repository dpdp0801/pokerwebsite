import { getBlindStructure } from '@/lib/structures';

export default async function handler(req, res) {
  console.log('=== BLINDS STRUCTURE API CALLED ===');
  
  if (req.method !== 'GET') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('Reading blind structure from file...');
    const blindStructure = getBlindStructure();
    console.log('Blind structure read successfully:', blindStructure ? 'yes' : 'no');

    if (!blindStructure) {
      console.log('No blind structure found');
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Log the structure for debugging
    console.log('Structure name:', blindStructure.name);
    console.log('Structure levels count:', blindStructure.levels?.length || 0);

    // Sort levels by their level number to maintain the original sequence
    const sortedLevels = [...blindStructure.levels].sort((a, b) => a.level - b.level);
    console.log('Sorted levels count:', sortedLevels.length);
    
    // Return a structure format matching what the frontend expects
    const response = { 
      structure: {
        ...blindStructure,
        levels: sortedLevels,
        id: 'file-based-structure' // Provide a consistent ID for frontend that might expect one
      } 
    };
    
    console.log('Returning blind structure response');
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching blind structure:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blind structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 