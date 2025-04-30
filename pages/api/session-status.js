import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    // Get current user session
    const session = await getServerSession(req, res, authOptions);
    
    // Find the active session
    const activeSession = await prisma.pokerSession.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'ACTIVE']
        },
        date: {
          lte: new Date(new Date().setHours(23, 59, 59, 999)) // Today or earlier
        },
        startTime: {
          lte: new Date(new Date().setHours(23, 59, 59, 999)) // Today or earlier
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    
    if (!activeSession) {
      return res.status(200).json({ exists: false });
    }
    
    // Get all registrations for this session, including rebuys
    const registrations = await prisma.registration.findMany({
      where: {
        sessionId: activeSession.id
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            venmoId: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    // Group registrations by status
    const groupedRegistrations = {
      current: [],
      eliminated: [],
      waitlisted: [],
      inTheMoney: []
    };
    
    registrations.forEach(registration => {
      if (registration.status === 'WAITLIST') {
        groupedRegistrations.waitlisted.push(registration);
      } else if (registration.status === 'CURRENT') {
        groupedRegistrations.current.push(registration);
      } else if (registration.status === 'ELIMINATED') {
        groupedRegistrations.eliminated.push(registration);
      } else if (registration.status === 'ITM') {
        groupedRegistrations.inTheMoney.push(registration);
      } else if (registration.status === 'CONFIRMED' || registration.status === 'REGISTERED') {
        // For initial loading, move REGISTERED players to CURRENT if session is ACTIVE
        if (activeSession.status === 'ACTIVE') {
          groupedRegistrations.current.push({
            ...registration,
            status: 'CURRENT'
          });
        } else {
          groupedRegistrations.current.push(registration);
        }
      }
    });
    
    // Check if current user is registered
    let userRegistration = null;
    if (session?.user?.id) {
      userRegistration = registrations.find(reg => reg.userId === session.user.id);
    }
    
    // Update counts
    const currentPlayersCount = groupedRegistrations.current.length;
    const waitlistedPlayersCount = groupedRegistrations.waitlisted.length;
    const eliminatedPlayersCount = groupedRegistrations.eliminated.length;
    const itmPlayersCount = groupedRegistrations.inTheMoney.length;
    const registeredPlayersCount = registrations.filter(r => 
      r.status === 'CONFIRMED' || r.status === 'REGISTERED' || r.status === 'CURRENT'
    ).length;
    
    // Count unique players (not counting rebuys)
    const uniquePlayerIds = new Set();
    registrations.forEach(reg => {
      if (reg.status === 'CURRENT' || reg.status === 'CONFIRMED' || reg.status === 'REGISTERED') {
        uniquePlayerIds.add(reg.userId);
      }
    });
    
    // Don't try to update the session directly - these fields don't exist in the schema
    // Just use the calculated values in the response
    
    // Format response
    const response = {
      exists: true,
      session: {
        ...activeSession,
        currentPlayersCount: uniquePlayerIds.size,
        waitlistedPlayersCount: waitlistedPlayersCount,
        eliminatedPlayersCount: eliminatedPlayersCount,
        itmPlayersCount: itmPlayersCount,
        registeredPlayersCount: registeredPlayersCount,
        totalEntries: activeSession.totalEntries || activeSession.entries || 0,
        registrations: groupedRegistrations,
        userRegistration: userRegistration,
        registrationClosed: activeSession.registrationClosed || false
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching session status:", error);
    return res.status(500).json({ error: "Failed to fetch session status" });
  }
} 