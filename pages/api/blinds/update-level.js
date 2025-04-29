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
    // Log the incoming request for debugging
    console.log("Received update-level request:", JSON.stringify(req.body));
    
    // Destructure body parameters
    const { sessionId, levelIndex } = req.body;

    // Validate required parameters
    if (!sessionId || typeof levelIndex !== 'number') {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: sessionId and levelIndex' 
      });
    }

    // Get the session first
    const pokerSession = await prisma.pokerSession.findUnique({
      where: {
        id: sessionId
      }
    });

    // Validate session exists
    if (!pokerSession) {
      return res.status(404).json({ 
        success: false, 
        message: 'Session not found' 
      });
    }

    // Validate session is a tournament
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
    
    // Prepare update data
    const updateData = {
      currentBlindLevel: levelIndex,
      levelStartTime: now
    };

    // Update the current blind level and level start time
    const updatedSession = await prisma.pokerSession.update({
      where: {
        id: sessionId
      },
      data: updateData
    });

    console.log("Updated session:", {
      id: updatedSession.id,
      level: updatedSession.currentBlindLevel,
      startTime: updatedSession.levelStartTime
    });

    // Return successful response
    return res.status(200).json({
      success: true,
      message: 'Current blind level updated successfully',
      session: updatedSession
    });
  } catch (error) {
    // Log error for debugging
    console.error('Error updating blind level:', error);
    
    // Return error response
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to update blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 