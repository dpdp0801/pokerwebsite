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
    
    console.log(`Found active session: ${activeSession.title}`);
    
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
            firstName: true,
            lastName: true,
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
    
    console.log(`Found ${registrations.length} registrations`);
    
    // Group registrations by status
    const groupedRegistrations = {
      current: [],
      eliminated: [],
      waitlisted: [],
      inTheMoney: []
    };
    
    registrations.forEach(registration => {
      // Log each registration for debugging
      console.log(`Registration: ${registration.id}, Status: ${registration.status}, User: ${registration.user?.name}`);
      
      if (registration.status === 'WAITLISTED') {
        groupedRegistrations.waitlisted.push(registration);
      } else if (registration.status === 'REBOUGHT') {
        // Special case for rebuys - add to eliminated list for history, but don't count as current
        groupedRegistrations.eliminated.push(registration);
      } else if (registration.status === 'CURRENT') {
        groupedRegistrations.current.push(registration);
      } else if (registration.status === 'ELIMINATED') {
        groupedRegistrations.eliminated.push(registration);
      } else if (registration.status === 'ITM') {
        groupedRegistrations.inTheMoney.push(registration);
      } else if (registration.status === 'CONFIRMED' || registration.status === 'REGISTERED') {
        // For initial loading, move CONFIRMED or REGISTERED players to CURRENT if session is ACTIVE
        if (activeSession.status === 'ACTIVE') {
          // Only send a copy with updated status for display
          // The actual database remains CONFIRMED/REGISTERED
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
    
    // Count unique players (not counting rebuys)
    const uniquePlayerIds = new Set();
    registrations.forEach(reg => {
      if (reg.status === 'CURRENT' || reg.status === 'CONFIRMED' || reg.status === 'REGISTERED') {
        uniquePlayerIds.add(reg.userId);
      }
    });
    
    // Log group counts for debugging
    console.log(`Grouped: Current: ${groupedRegistrations.current.length}, Waitlisted: ${groupedRegistrations.waitlisted.length}, Eliminated: ${groupedRegistrations.eliminated.length}, ITM: ${groupedRegistrations.inTheMoney.length}`);
    
    // Format response
    const response = {
      exists: true,
      session: {
        ...activeSession,
        currentPlayersCount: groupedRegistrations.current.length,
        waitlistedPlayersCount: groupedRegistrations.waitlisted.length,
        eliminatedPlayersCount: groupedRegistrations.eliminated.length,
        itmPlayersCount: groupedRegistrations.inTheMoney.length,
        totalEntries: activeSession.entries || 0,
        registrations: groupedRegistrations,
        userRegistration: userRegistration,
        registrationClosed: activeSession.registrationClosed || false
      }
    };
    
    return res.status(200).json(response);
  } catch (error) {
    console.error("Error fetching session status:", error);
    return res.status(500).json({ error: "Failed to fetch session status", message: error.message });
  }
} 