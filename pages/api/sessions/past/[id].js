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
        // Fetch the session with all registrations
        const pastSession = await prisma.pokerSession.findUnique({
          where: { 
            id,
            status: 'COMPLETED' // Ensure it's a completed session
          },
          include: {
            registrations: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    image: true,
                    venmoId: true
                  }
                }
              }
            }
          }
        });
        
        if (!pastSession) {
          return res.status(404).json({ success: false, message: 'Past session not found' });
        }
        
        // Organize player registrations by status
        const current = pastSession.registrations.filter(r => r.status === 'ACTIVE');
        const waitlist = pastSession.registrations.filter(r => r.status === 'WAITLIST');
        const eliminated = pastSession.registrations.filter(r => r.status === 'ELIMINATED');
        const itm = pastSession.registrations.filter(r => r.status === 'ITM');
        const noShow = pastSession.registrations.filter(r => r.status === 'NO_SHOW');
        
        // Format the session data similar to the status page
        const formattedSession = {
          ...pastSession,
          registrations: {
            current,
            waitlist,
            eliminated,
            itm,
            noShow
          },
          currentPlayersCount: current.length,
          waitlistedPlayersCount: waitlist.length,
          eliminatedPlayersCount: eliminated.length,
          totalEntries: pastSession.registrations.reduce((sum, reg) => sum + (reg.rebuys || 0) + 1, 0)
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