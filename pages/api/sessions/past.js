import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log("API route /api/sessions/past called with method:", req.method);
  
  try {
    // Check authentication (any user can access this)
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // GET - List all completed sessions
    if (req.method === 'GET') {
      try {
        const pastSessions = await prisma.pokerSession.findMany({
          where: {
            status: 'COMPLETED'
          },
          orderBy: {
            date: 'desc'
          },
          include: {
            registrations: {
              where: {
                status: 'ITM'
              },
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    firstName: true,
                    lastName: true,
                    image: true
                  }
                }
              },
              take: 1 // Just get the winner to show in the list
            }
          }
        });
        
        return res.status(200).json({ 
          success: true, 
          sessions: pastSessions
        });
      } catch (error) {
        console.error('Error fetching past sessions:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch past sessions', 
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    }
    
    // If none of the above methods match
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  } catch (error) {
    console.error('Unexpected error in sessions/past API:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 