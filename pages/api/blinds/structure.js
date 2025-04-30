import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the default blind structure
    const blindStructure = await prisma.blindStructure.findFirst({
      include: {
        levels: true,
      },
    });

    if (!blindStructure) {
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Sort levels by their ID to maintain the original sequence
    // This preserves the intended order of levels and breaks as defined in the database
    blindStructure.levels.sort((a, b) => {
      // Use createdAt or id for consistent ordering
      return new Date(a.createdAt) - new Date(b.createdAt);
    });

    return res.status(200).json({ structure: blindStructure });
  } catch (error) {
    console.error('Error fetching blind structure:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blind structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 