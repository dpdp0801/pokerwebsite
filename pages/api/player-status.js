import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  
  // Only admins can manage player statuses
  if (!session || session.role !== 'ADMIN') {
    return res.status(403).json({ 
      success: false, 
      message: 'Unauthorized: Admin access required' 
    });
  }

  if (req.method === 'PUT') {
    // Extract parameters
    const { registrationId, newStatus, isRebuy = false } = req.body;
    
    if (!registrationId || !newStatus) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: registrationId and newStatus' 
      });
    }
    
    try {
      // Get current registration
      const registration = await prisma.registration.findUnique({
        where: { id: registrationId },
        include: { session: true }
      });
      
      if (!registration) {
        return res.status(404).json({ 
          success: false, 
          message: 'Registration not found' 
        });
      }
      
      // Prepare update data
      const updateData = { playerStatus: newStatus };
      
      // If this is a rebuy entry and the status is changing to CURRENT, mark it as a rebuy
      if (isRebuy && newStatus === 'CURRENT') {
        updateData.isRebuy = true;
      }
      
      // Update player status
      const updatedRegistration = await prisma.registration.update({
        where: { id: registrationId },
        data: updateData
      });
      
      // Update entries count for tournament if this is a rebuy
      if (isRebuy && newStatus === 'CURRENT' && registration.session.type === 'TOURNAMENT') {
        await prisma.pokerSession.update({
          where: { id: registration.sessionId },
          data: {
            entries: {
              increment: 1
            }
          }
        });
      }
      
      return res.status(200).json({
        success: true,
        message: `Player status updated to ${newStatus}`,
        registration: updatedRegistration
      });
      
    } catch (error) {
      console.error('Error updating player status:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update player status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  // For batch operations like moving all registered to current
  if (req.method === 'POST') {
    const { sessionId, fromStatus, toStatus } = req.body;
    
    if (!sessionId || !fromStatus || !toStatus) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required parameters: sessionId, fromStatus, toStatus' 
      });
    }
    
    try {
      // Update all players with the given status in this session
      const updatedRegistrations = await prisma.registration.updateMany({
        where: {
          sessionId,
          status: 'CONFIRMED', // Only consider confirmed registrations
          playerStatus: fromStatus
        },
        data: {
          playerStatus: toStatus
        }
      });
      
      // If moving players to current and this is the first time (from REGISTERED), 
      // update total entries accordingly
      if (fromStatus === 'REGISTERED' && toStatus === 'CURRENT') {
        const session = await prisma.pokerSession.findUnique({
          where: { id: sessionId }
        });
        
        if (session && session.type === 'TOURNAMENT') {
          // Count how many non-rebuy entries we just moved to CURRENT
          const currentEntries = await prisma.registration.count({
            where: {
              sessionId,
              status: 'CONFIRMED',
              playerStatus: 'CURRENT',
              isRebuy: false
            }
          });
          
          // Update entries to match current player count (initial entries)
          await prisma.pokerSession.update({
            where: { id: sessionId },
            data: { entries: currentEntries }
          });
        }
      }
      
      return res.status(200).json({
        success: true,
        message: `Updated ${updatedRegistrations.count} players from ${fromStatus} to ${toStatus}`
      });
      
    } catch (error) {
      console.error('Error batch updating player statuses:', error);
      return res.status(500).json({ 
        success: false, 
        message: 'Failed to update player statuses',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
  
  return res.status(405).json({ 
    success: false, 
    message: 'Method not allowed' 
  });
} 