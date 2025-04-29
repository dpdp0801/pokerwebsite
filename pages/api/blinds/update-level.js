import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Check authentication and admin role
  const session = await getServerSession(req, res, authOptions);
  
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  try {
    console.log("Received update-level request:", req.body);
    const { sessionId, levelIndex } = req.body;

    if (!sessionId || typeof levelIndex !== 'number') {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: sessionId and levelIndex' 
      });
    }

    // Get the session
    const pokerSession = await prisma.pokerSession.findUnique({
      where: {
        id: sessionId
      }
    });

    if (!pokerSession) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }

    if (pokerSession.type !== 'TOURNAMENT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Session is not a tournament' 
      });
    }

    // If this is the same level as before, don't reset the timer
    if (pokerSession.currentBlindLevel === levelIndex) {
      return res.status(200).json({
        success: true,
        message: 'Already at this level, no changes made',
        session: pokerSession
      });
    }

    console.log(`Updating blind level from ${pokerSession.currentBlindLevel} to ${levelIndex}`);

    // Set the current time as the level start time
    const now = new Date();

    // Update the current blind level and level start time
    const updatedSession = await prisma.pokerSession.update({
      where: {
        id: sessionId
      },
      data: {
        currentBlindLevel: levelIndex,
        levelStartTime: now
      }
    });

    console.log("Updated session:", {
      id: updatedSession.id,
      level: updatedSession.currentBlindLevel,
      startTime: updatedSession.levelStartTime
    });

    return res.status(200).json({
      success: true,
      message: 'Current blind level updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating blind level:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 