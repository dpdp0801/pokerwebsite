import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id: sessionId } = req.query;

  // Ensure it's a PUT request
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }

  // Check admin authentication
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden: Admin access required.' });
  }

  if (!sessionId) {
    return res.status(400).json({ message: 'Session ID is required' });
  }

  const { levelIndex } = req.body;

  if (typeof levelIndex !== 'number' || levelIndex < 0) {
    return res.status(400).json({ message: 'Valid level index is required' });
  }

  // --- Logic from pages/api/blinds/update-level.js --- 
  try {
    // We need to also reset the levelStartTime when the level changes
    const updatedSession = await prisma.pokerSession.update({
      where: { id: sessionId },
      data: {
        currentBlindLevel: levelIndex,
        levelStartTime: new Date(), // Set to current time when level changes
      },
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Blind level updated', 
      currentBlindLevel: updatedSession.currentBlindLevel,
      levelStartTime: updatedSession.levelStartTime
    });

  } catch (error) {
    console.error(`Error updating blind level for session ${sessionId}:`, error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update blind level',
      error: error.message
    });
  }
} 