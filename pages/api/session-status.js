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
    
    // Get all registrations for this session
    const registrations = await prisma.registration.findMany({
      where: {
        sessionId: activeSession.id,
        status: {
          in: ['CONFIRMED', 'WAITLISTED']
        }
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
      if (registration.status === 'WAITLISTED') {
        groupedRegistrations.waitlisted.push(registration);
      } else if (registration.status === 'CONFIRMED') {
        // For initial loading, move REGISTERED players to CURRENT if session is ACTIVE
        if (registration.playerStatus === 'REGISTERED' && activeSession.status === 'ACTIVE') {
          registration.playerStatus = 'CURRENT';
          groupedRegistrations.current.push(registration);
        } else if (registration.playerStatus === 'CURRENT') {
          groupedRegistrations.current.push(registration);
        } else if (registration.playerStatus === 'ELIMINATED') {
          groupedRegistrations.eliminated.push(registration);
        } else if (registration.playerStatus === 'ITM') {
          groupedRegistrations.inTheMoney.push(registration);
        } else {
          // Default any unrecognized status to current as well
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
    const registeredPlayersCount = registrations.filter(r => r.status === 'CONFIRMED').length;
    
    // Update the session data with accurate counts if needed
    if (activeSession.status === 'ACTIVE' && (
        activeSession.currentPlayersCount !== currentPlayersCount ||
        activeSession.entries === 0 && registeredPlayersCount > 0
    )) {
      try {
        await prisma.pokerSession.update({
          where: { id: activeSession.id },
          data: {
            currentPlayersCount: currentPlayersCount,
            waitlistedPlayersCount: waitlistedPlayersCount,
            eliminatedPlayersCount: eliminatedPlayersCount,
            itmPlayersCount: itmPlayersCount,
            entries: registeredPlayersCount, // Set entries to match registered players if it's 0
          }
        });
      } catch (updateError) {
        console.error("Error updating session counts:", updateError);
      }
    }
    
    // Format response
    const response = {
      exists: true,
      session: {
        ...activeSession,
        currentPlayersCount: currentPlayersCount,
        waitlistedPlayersCount: waitlistedPlayersCount,
        eliminatedPlayersCount: eliminatedPlayersCount,
        itmPlayersCount: itmPlayersCount,
        registeredPlayersCount: registeredPlayersCount,
        totalEntries: Math.max(activeSession.entries || 0, registeredPlayersCount),
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