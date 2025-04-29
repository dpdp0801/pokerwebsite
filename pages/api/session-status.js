import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Find active sessions (not started or in progress)
    const activeSessions = await prisma.pokerSession.findMany({
      where: {
        OR: [
          { status: 'NOT_STARTED' },
          { status: 'ACTIVE' }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 1 // Get only the most recent one
    });

    if (activeSessions.length === 0) {
      return res.status(200).json({ exists: false });
    }

    const session = activeSessions[0];
    
    // Format response based on session type
    let formattedSession = {
      id: session.id,
      type: session.type,
      date: session.date,
      startTime: session.startTime,
      maxPlayers: session.maxPlayers,
      location: session.location,
      title: session.title,
      description: session.description,
      status: session.status
    };
    
    // Add type-specific fields
    if (session.type === 'TOURNAMENT' || session.type === 'MTT') {
      formattedSession = {
        ...formattedSession,
        buyIn: session.buyIn
      };
    } else if (session.type === 'CASH_GAME' || session.type === 'CASH') {
      formattedSession = {
        ...formattedSession,
        smallBlind: session.smallBlind,
        bigBlind: session.bigBlind,
        minBuyIn: session.minBuyIn,
        maxBuyIn: session.maxBuyIn,
        buyIn: session.buyIn
      };
    }

    // Also get current registrations count
    const registrationsCount = await prisma.registration.count({
      where: {
        sessionId: session.id,
        status: {
          in: ['CONFIRMED', 'PENDING']
        }
      }
    });

    formattedSession.registeredPlayers = registrationsCount;

    return res.status(200).json({
      exists: true,
      session: formattedSession
    });
  } catch (error) {
    console.error('Error fetching session status:', error);
    return res.status(500).json({ 
      exists: false,
      error: 'Failed to fetch session status' 
    });
  }
} 