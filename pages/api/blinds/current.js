import { getBlindStructure } from '@/lib/structures';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.query;
    
    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    // Get the blind structure from file
    const blindStructure = getBlindStructure();
    
    if (!blindStructure) {
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Get current blind level from the session
    const session = await prisma.pokerSession.findUnique({
      where: { id: sessionId },
      select: { currentBlindLevel: true }
    });

    // If session doesn't exist or doesn't have a currentBlindLevel, default to 0
    const currentLevelIndex = session?.currentBlindLevel ?? 0;
    
    // Sort levels by level number to ensure correct order
    const sortedLevels = [...blindStructure.levels].sort((a, b) => a.level - b.level);
    
    // Get the current level data
    const currentLevel = sortedLevels[currentLevelIndex] || null;
    
    // Get session with level start time
    const sessionWithTime = await prisma.pokerSession.findUnique({
      where: { id: sessionId },
      select: { levelStartTime: true, status: true }
    });
    
    return res.status(200).json({
      id: 'file-based-structure',
      name: blindStructure.name,
      description: blindStructure.description,
      startingStack: blindStructure.startingStack,
      levels: sortedLevels,
      currentLevelIndex,
      currentLevel,
      levelStartTime: sessionWithTime?.levelStartTime || null,
      sessionStatus: sessionWithTime?.status || 'NOT_STARTED'
    });
  } catch (error) {
    console.error('Error fetching current blind level:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch current blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 