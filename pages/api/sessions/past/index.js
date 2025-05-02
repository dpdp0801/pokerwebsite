import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";
import { parseISO } from 'date-fns';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Get user session
  const session = await getServerSession(req, res, authOptions);
  
  if (!session) {
    return res.status(401).json({ success: false, message: "Not authenticated" });
  }
  
  if (req.method === "GET") {
    try {
      // Get all past sessions (completed or cancelled)
      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { status: 'COMPLETED' },
            { status: 'CANCELLED' }
          ]
        },
        orderBy: {
          date: 'desc'
        }
      });
      
      if (!sessions || sessions.length === 0) {
        return res.status(200).json({ success: true, sessions: [] });
      }
      
      // Format the sessions data for the client
      const formattedSessions = await Promise.all(sessions.map(async (session) => {
        // Get the first in-the-money player to show as winner
        const itmPlayer = await prisma.registration.findFirst({
          where: {
            sessionId: session.id,
            playerStatus: 'ITM',
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                image: true,
                firstName: true,
                lastName: true,
              }
            }
          },
          orderBy: {
            place: 'asc'
          }
        });
        
        // For tournaments, calculate total entries based on rebuys
        let totalEntries = session.registeredPlayers || 0;
        if (session.type === 'TOURNAMENT') {
          const rebuys = await prisma.registration.aggregate({
            where: {
              sessionId: session.id,
              rebuys: {
                gt: 0
              }
            },
            _sum: {
              rebuys: true
            }
          });
          
          if (rebuys._sum.rebuys) {
            totalEntries += rebuys._sum.rebuys;
          }
        }
        
        // For cash games, count finished players
        let finishedPlayersCount = 0;
        if (session.type === 'CASH_GAME') {
          const finished = await prisma.registration.count({
            where: {
              sessionId: session.id,
              playerStatus: 'FINISHED'
            }
          });
          finishedPlayersCount = finished;
        }
        
        // Make sure time is preserved properly
        const startTime = session.startTime ? new Date(session.startTime).toISOString() : null;
        
        return {
          id: session.id,
          title: session.title,
          date: session.date,
          startTime: startTime,
          type: session.type,
          buyIn: session.buyIn,
          totalEntries,
          finishedPlayersCount,
          registrations: itmPlayer ? [itmPlayer] : []
        };
      }));
      
      return res.status(200).json({ 
        success: true, 
        sessions: formattedSessions 
      });
    } catch (error) {
      console.error("Error fetching past sessions:", error);
      return res.status(500).json({ 
        success: false, 
        message: "Server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  } 
  
  return res.status(405).json({ success: false, message: "Method not allowed" });
} 