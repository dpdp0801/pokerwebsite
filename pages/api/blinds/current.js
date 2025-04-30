import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get session ID from query
    const { sessionId } = req.query;

    if (!sessionId) {
      // If no session ID, get most recent active session
      const activeSession = await prisma.pokerSession.findFirst({
        where: {
          status: 'ACTIVE',
          type: 'TOURNAMENT' // Only for tournaments
        },
        orderBy: {
          startTime: 'desc'
        }
      });

      if (!activeSession) {
        return res.status(404).json({ 
          success: false, 
          message: 'No active tournament found' 
        });
      }

      // Get default blind structure
      const blindStructure = await prisma.blindStructure.findFirst({
        where: {
          isDefault: true
        },
        include: {
          levels: {
            orderBy: {
              createdAt: 'asc' // Use creation time for consistent ordering
            }
          }
        }
      });

      if (!blindStructure) {
        return res.status(404).json({ 
          success: false, 
          message: 'No blind structure found' 
        });
      }

      // Get current blind level
      const currentLevelIndex = activeSession.currentBlindLevel || 0;
      const currentLevel = currentLevelIndex < blindStructure.levels.length 
        ? blindStructure.levels[currentLevelIndex] 
        : blindStructure.levels[blindStructure.levels.length - 1];

      // Calculate total duration
      const totalMinutes = blindStructure.levels.reduce((total, level) => total + level.duration, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return res.status(200).json({
        success: true,
        session: activeSession,
        currentLevel,
        totalLevels: blindStructure.levels.length,
        totalDuration: `${hours}h ${minutes}m`,
        blindStructure
      });
    } else {
      // Get specific session
      const session = await prisma.pokerSession.findUnique({
        where: {
          id: sessionId
        }
      });

      if (!session) {
        return res.status(404).json({ 
          success: false, 
          message: 'Session not found' 
        });
      }

      if (session.type !== 'TOURNAMENT') {
        return res.status(400).json({ 
          success: false, 
          message: 'Session is not a tournament' 
        });
      }

      // Get default blind structure
      const blindStructure = await prisma.blindStructure.findFirst({
        where: {
          isDefault: true
        },
        include: {
          levels: {
            orderBy: {
              createdAt: 'asc' // Use creation time for consistent ordering
            }
          }
        }
      });

      if (!blindStructure) {
        return res.status(404).json({ 
          success: false, 
          message: 'No blind structure found' 
        });
      }

      // Get current blind level
      const currentLevelIndex = session.currentBlindLevel || 0;
      const currentLevel = currentLevelIndex < blindStructure.levels.length 
        ? blindStructure.levels[currentLevelIndex] 
        : blindStructure.levels[blindStructure.levels.length - 1];

      // Calculate total duration
      const totalMinutes = blindStructure.levels.reduce((total, level) => total + level.duration, 0);
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;

      return res.status(200).json({
        success: true,
        session,
        currentLevel,
        totalLevels: blindStructure.levels.length,
        totalDuration: `${hours}h ${minutes}m`,
        blindStructure
      });
    }
  } catch (error) {
    console.error('Error fetching current blind level:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch current blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 