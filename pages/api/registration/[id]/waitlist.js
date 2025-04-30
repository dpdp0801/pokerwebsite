import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Only admins can move players to waitlist
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
    
    // Ensure the registration is confirmed and current
    if (registration.status !== 'CONFIRMED' || registration.playerStatus !== 'CURRENT') {
      return res.status(400).json({ 
        success: false, 
        message: 'Player is not currently active' 
      });
    }
    
    // Update the registration status to WAITLISTED
    await prisma.registration.update({
      where: { id },
      data: {
        status: 'WAITLISTED'
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Player moved to waitlist successfully'
    });
    
  } catch (error) {
    console.error('Error moving player to waitlist:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to move player to waitlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 