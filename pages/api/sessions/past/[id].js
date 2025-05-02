import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/sessions/past/[id] called with method:", req.method);
  
  try {
    // Check authentication (any user can access this)
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Get the session ID from the URL
    const { id } = req.query;
    
    if (!id) {
      return res.status(400).json({ success: false, message: 'Session ID is required' });
    }

    // GET - Get details of a specific past session
    if (req.method === 'GET') {
      try {
        // First fetch the session itself
        const pokerSession = await prisma.pokerSession.findUnique({
          where: { id }
        });
        
        if (!pokerSession) {
          return res.status(404).json({ 
            success: false, 
            exists: false,
            message: 'Session not found' 
          });
        }
        
        // Get relevant player registrations with user data
        const [currentPlayers, waitlistPlayers, itmPlayers, eliminatedPlayers, noShowPlayers, finishedPlayers] = await Promise.all([
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'ACTIVE'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          }),
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'WAITLIST'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          }),
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'ITM'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          }),
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'ELIMINATED'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          }),
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'NO_SHOW'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          }),
          prisma.registration.findMany({
            where: { 
              sessionId: id,
              status: 'FINISHED'
            },
            include: { user: true },
            orderBy: { createdAt: 'asc' }
          })
        ]);
        
        // For tournaments, calculate total entries based on rebuys
        let totalEntries = pokerSession.registeredPlayers || 0;
        if (pokerSession.type === 'TOURNAMENT') {
          const rebuys = await prisma.registration.aggregate({
            where: {
              sessionId: id,
              rebuys: {
                gt: 0
              }
            },
            _sum: {
              rebuys: true
            }
          });
          
          if (rebuys._sum.rebuys) {
            totalEntries += rebuys._sum.rebuys;
          }
        }
        
        // Make sure time is preserved properly
        const startTime = pokerSession.startTime ? new Date(pokerSession.startTime).toISOString() : null;
        
        // Format session data for client
        const formattedSession = {
          ...pokerSession,
          startTime: startTime,
          totalEntries,
          registrations: {
            current: currentPlayers,
            waitlist: waitlistPlayers,
            itm: itmPlayers,
            eliminated: eliminatedPlayers,
            noShow: noShowPlayers,
            finished: finishedPlayers
          }
        };
        
        return res.status(200).json({
          success: true,
          exists: true,
          session: formattedSession
        });
      } catch (error) {
        console.error('Error fetching past session details:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch past session details', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // If none of the above methods match
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error in sessions/past/[id] API:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 