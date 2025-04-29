import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the most recent active session
    const activeSession = await prisma.pokerSession.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'ACTIVE']
        }
      },
      orderBy: {
        date: 'desc'
      }
    });

    return res.status(200).json({
      exists: !!activeSession,
      session: activeSession ? {
        id: activeSession.id,
        title: activeSession.title,
        type: activeSession.type,
        date: activeSession.date,
        startTime: activeSession.startTime,
        location: activeSession.location,
        buyIn: activeSession.buyIn,
        maxPlayers: activeSession.maxPlayers,
        status: activeSession.status,
      } : null
    });
  } catch (error) {
    console.error('Error fetching session status:', error);
    return res.status(500).json({ 
      message: 'Error checking session status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 