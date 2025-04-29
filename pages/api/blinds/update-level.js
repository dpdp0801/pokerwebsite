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

    // Update the current blind level
    const updatedSession = await prisma.pokerSession.update({
      where: {
        id: sessionId
      },
      data: {
        currentBlindLevel: levelIndex
      }
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