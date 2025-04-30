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

    // Sort levels:
    // 1. Regular levels come before breaks
    // 2. Regular levels are ordered by their level number
    // 3. Breaks maintain their original order
    blindStructure.levels.sort((a, b) => {
      // If one is a break and the other isn't, place breaks after regular levels
      if (a.isBreak && !b.isBreak) return 1;
      if (!a.isBreak && b.isBreak) return -1;
      
      // If both are breaks, keep them in their original order (by id)
      if (a.isBreak && b.isBreak) return a.id - b.id;
      
      // If neither are breaks, sort by level number
      return a.level - b.level;
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