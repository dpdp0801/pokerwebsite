import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  try {
    // Get current user session
    const session = await getServerSession(req, res, authOptions);
    
    // Current date in Pacific Time
    const now = new Date();
    const pacificNow = new Date(now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" }));
    console.log("Current Pacific Time:", pacificNow.toISOString());
    
    // Fixed query: Find the active session with simplified date logic
    // Just check for status NOT_STARTED or ACTIVE
    const activeSession = await prisma.pokerSession.findFirst({
      where: {
        status: {
          in: ['NOT_STARTED', 'ACTIVE']
        }
      },
      orderBy: [
        { status: 'asc' }, // NOT_STARTED comes before ACTIVE
        { date: 'asc' } // Earlier date comes first
      ]
    });
    
    if (!activeSession) {
      console.log("No active sessions found");
      return res.status(200).json({ exists: false });
    }
    
    console.log(`Found active session: ${activeSession.title}`);
    console.log(`Session date: ${new Date(activeSession.date).toISOString()}`);
    console.log(`Session start time: ${new Date(activeSession.startTime).toISOString()}`);
    
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
      waitlist: [],
      itm: []
    };
    
    registrations.forEach(registration => {
      // Log each registration for debugging
      console.log(`Registration: ${registration.id}, Status: ${registration.status}, Player Status: ${registration.playerStatus}, User: ${registration.user?.name}`);
      
      // Check for waitlisted players first - prioritize this check
      if (registration.status === 'WAITLISTED' || registration.playerStatus === 'WAITLISTED') {
        console.log(`→ Adding to WAITLIST: ${registration.user?.name}`);
        groupedRegistrations.waitlist.push(registration);
      } else if (registration.status === 'ELIMINATED' || registration.playerStatus === 'ELIMINATED') {
        console.log(`→ Adding to ELIMINATED: ${registration.user?.name}`);
        groupedRegistrations.eliminated.push(registration);
      } else if (registration.status === 'ITM' || registration.playerStatus === 'ITM') {
        console.log(`→ Adding to ITM: ${registration.user?.name}`);
        groupedRegistrations.itm.push(registration);
      } else if (registration.status === 'CURRENT' || registration.playerStatus === 'CURRENT' || 
                registration.status === 'CONFIRMED' || registration.status === 'REGISTERED') {
        // For initial loading, move CONFIRMED or REGISTERED players to CURRENT if session is ACTIVE
        if (activeSession.status === 'ACTIVE') {
          // Only send a copy with updated status for display
          // The actual database remains CONFIRMED/REGISTERED
          console.log(`→ Adding to CURRENT (active): ${registration.user?.name}`);
          groupedRegistrations.current.push({
            ...registration,
            status: 'CURRENT'
          });
        } else {
          console.log(`→ Adding to CURRENT (not active): ${registration.user?.name}`);
          groupedRegistrations.current.push(registration);
        }
      } else {
        console.log(`→ UNHANDLED STATUS for ${registration.user?.name}: ${registration.status}, PlayerStatus: ${registration.playerStatus}`);
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
    console.log(`Grouped: Current: ${groupedRegistrations.current.length}, Waitlisted: ${groupedRegistrations.waitlist.length}, Eliminated: ${groupedRegistrations.eliminated.length}, ITM: ${groupedRegistrations.itm.length}`);
    
    // Format response
    const response = {
      exists: true,
      session: {
        ...activeSession,
        currentPlayersCount: groupedRegistrations.current.length,
        waitlistedPlayersCount: groupedRegistrations.waitlist.length,
        eliminatedPlayersCount: groupedRegistrations.eliminated.length,
        itmPlayersCount: groupedRegistrations.itm.length,
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