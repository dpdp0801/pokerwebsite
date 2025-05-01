import { getBlindStructure } from '@/lib/structures';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const blindStructure = getBlindStructure();

    if (!blindStructure) {
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Sort levels by their level number to maintain the original sequence
    const sortedLevels = [...blindStructure.levels].sort((a, b) => a.level - b.level);
    
    // Return a structure format matching what the frontend expects
    return res.status(200).json({ 
      structure: {
        ...blindStructure,
        levels: sortedLevels,
        id: 'file-based-structure' // Provide a consistent ID for frontend that might expect one
      } 
    });
  } catch (error) {
    console.error('Error fetching blind structure:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blind structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 