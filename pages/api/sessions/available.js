import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Verify user is authenticated (any role)
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  if (req.method === "GET") {
    try {
      // Get all NOT_STARTED sessions that are available for registration
      const availableSessions = await prisma.pokerSession.findMany({
        where: {
          status: "NOT_STARTED"
        },
        orderBy: {
          date: "asc"
        }
      });

      // Get the current user ID from the session
      const userId = session.user.id;
      
      // For each session, check if it would be waitlisted based on current registrations
      const sessionsWithStatus = await Promise.all(
        availableSessions.map(async (session) => {
          // Count confirmed registrations
          const confirmedCount = await prisma.registration.count({
            where: {
              sessionId: session.id,
              status: "CONFIRMED"
            }
          });

          // Calculate seats available
          const seatsAvailable = session.maxPlayers ? session.maxPlayers - confirmedCount : null;
          const wouldBeWaitlisted = seatsAvailable !== null && seatsAvailable <= 0;

          // Check if user is already registered
          const userRegistration = await prisma.registration.findFirst({
            where: {
              sessionId: session.id,
              userId: userId
            }
          });

          return {
            ...session,
            seatsAvailable,
            wouldBeWaitlisted,
            alreadyRegistered: !!userRegistration
          };
        })
      );

      return res.status(200).json({ success: true, sessions: sessionsWithStatus });
    } catch (error) {
      console.error("Error fetching available sessions:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Failed to fetch available sessions", 
        error: process.env.NODE_ENV === "development" ? error.message : undefined
      });
    }
  }

  return res.status(405).json({ success: false, message: "Method not allowed" });
} 