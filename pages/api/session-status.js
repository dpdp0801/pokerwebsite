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
        minBuyIn: session.minBuyIn,
        maxBuyIn: session.maxBuyIn,
        buyIn: session.buyIn
      };
      
      // Use smallBlind/bigBlind from DB if available, otherwise try to extract from title/description
      if (session.smallBlind !== null && session.bigBlind !== null) {
        formattedSession.smallBlind = session.smallBlind;
        formattedSession.bigBlind = session.bigBlind;
      } else {
        // Fallback to parsing from title/description for backwards compatibility
        try {
          // First try to extract from title
          const titleMatch = session.title.match(/\$([0-9.]+)\/\$([0-9.]+)/);
          if (titleMatch && titleMatch.length === 3) {
            formattedSession.smallBlind = parseFloat(titleMatch[1]);
            formattedSession.bigBlind = parseFloat(titleMatch[2]);
          } else {
            // Try to extract from description if title parsing failed
            const descMatch = session.description.match(/\$([0-9.]+)\/\$([0-9.]+)/);
            if (descMatch && descMatch.length === 3) {
              formattedSession.smallBlind = parseFloat(descMatch[1]);
              formattedSession.bigBlind = parseFloat(descMatch[2]);
            } else {
              // Default values if we can't extract
              formattedSession.smallBlind = 0.25;
              formattedSession.bigBlind = 0.5;
            }
          }
        } catch (err) {
          console.error("Error parsing blinds from title/description:", err);
          formattedSession.smallBlind = 0.25;
          formattedSession.bigBlind = 0.5;
        }
      }
    }

    // Get registrations with user details
    const registrations = await prisma.registration.findMany({
      where: {
        sessionId: session.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Order by registration time (first come, first served)
      }
    });

    // Separate registrations into confirmed and waitlisted
    const confirmedRegistrations = registrations.filter(reg => reg.status === 'CONFIRMED');
    const waitlistedRegistrations = registrations.filter(reg => reg.status === 'WAITLISTED');

    formattedSession.registeredPlayers = confirmedRegistrations.length;
    formattedSession.waitlistedPlayers = waitlistedRegistrations.length;
    formattedSession.registrations = {
      confirmed: confirmedRegistrations,
      waitlisted: waitlistedRegistrations
    };

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