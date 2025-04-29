import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../auth/[...nextauth]';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Check request method
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  // Check authentication and admin role
  const session = await getServerSession(req, res, authOptions);
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  try {
    const { sessionId, status } = req.body;

    if (!sessionId || !status) {
      return res.status(400).json({ 
        success: false, 
        message: 'Session ID and status are required' 
      });
    }

    // Validate status
    const validStatuses = ['NOT_STARTED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status provided. Status must be one of: ' + validStatuses.join(', ')
      });
    }

    // Update the session in the database
    const updatedSession = await prisma.pokerSession.update({
      where: {
        id: sessionId
      },
      data: {
        status: status
      },
    });

    return res.status(200).json({
      success: true,
      message: 'Session status updated successfully',
      session: updatedSession
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update session status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 