import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Only admins can process waitlist
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

  const { sessionId } = req.query;
  
  if (!sessionId) {
    return res.status(400).json({ 
      success: false, 
      message: 'Missing session ID' 
    });
  }

  try {
    // Update all waitlisted registrations to confirmed with REGISTERED player status
    const result = await prisma.registration.updateMany({
      where: {
        sessionId,
        status: 'WAITLISTED'
      },
      data: {
        status: 'CONFIRMED',
        playerStatus: 'REGISTERED'
      }
    });
    
    return res.status(200).json({
      success: true,
      message: 'Waitlisted players have been moved to registered successfully',
      movedCount: result.count
    });
    
  } catch (error) {
    console.error('Error processing waitlist:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to process waitlist',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 