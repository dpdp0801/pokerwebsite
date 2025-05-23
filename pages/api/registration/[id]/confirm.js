import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Only admins can confirm waitlisted players
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Admin access required' 
    });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: 'Method not allowed'
    });
  }

  const { id } = req.query;
  
  if (!id) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing registration ID' 
    });
  }

  try {
    // Get the registration
    const registration = await prisma.registration.findUnique({
      where: { id },
      include: { session: true }
    });
    
    if (!registration) {
      return res.status(404).json({ 
        success: false, 
        message: 'Registration not found' 
      });
    }
    
    // Ensure the registration is waitlisted
    if (registration.status !== 'WAITLISTED') {
      return res.status(400).json({ 
        success: false, 
        message: 'Registration is not in waitlist status' 
      });
    }
    
    // Update the registration status to CONFIRMED and player status to CURRENT
    await prisma.registration.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        playerStatus: 'CURRENT' // Move directly to CURRENT
      }
    });
    
    // If this is a tournament, update the entries count
    if (registration.session.type === 'TOURNAMENT') {
      // Check if this is the first time this player is at the table (not a rebuy)
      const existingEntries = await prisma.registration.count({
        where: {
          sessionId: registration.sessionId,
          userId: registration.userId,
          status: 'CONFIRMED',
          playerStatus: 'CURRENT',
          isRebuy: false
        }
      });
      
      // If this is their first entry, increment the total entries
      if (existingEntries === 0) {
        await prisma.pokerSession.update({
          where: { id: registration.sessionId },
          data: {
            entries: {
              increment: 1
            }
          }
        });
      }
    }
    
    return res.status(200).json({
      success: true,
      message: 'Player moved from waitlist to current successfully'
    });
    
  } catch (error) {
    console.error('Error confirming waitlisted player:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to confirm waitlisted player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 