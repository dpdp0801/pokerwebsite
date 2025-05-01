import { getBlindStructure } from '@/lib/structures';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check for admin authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { sessionId, levelIndex } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    if (levelIndex === undefined || levelIndex === null) {
      return res.status(400).json({ message: 'Level index is required' });
    }

    // Get the blind structure from file
    const blindStructure = getBlindStructure();
    
    if (!blindStructure) {
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Validate level index
    if (levelIndex < 0 || levelIndex >= blindStructure.levels.length) {
      return res.status(400).json({ 
        message: `Invalid level index. Must be between 0 and ${blindStructure.levels.length - 1}` 
      });
    }

    // Update the session with the new level index
    const updatedSession = await prisma.pokerSession.update({
      where: { id: sessionId },
      data: {
        currentBlindLevel: levelIndex,
        levelStartTime: new Date() // Reset the level start time
      }
    });

    return res.status(200).json({
      message: 'Blind level updated successfully',
      session: updatedSession,
      levelIndex
    });
  } catch (error) {
    console.error('Error updating blind level:', error);
    return res.status(500).json({ 
      message: 'Failed to update blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 