import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Fallback function to get blind structure from JSON file if database fails
async function getFallbackBlindStructure() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'blindStructure.json');
    const fileData = fs.readFileSync(dataPath, 'utf8');
    const blindStructure = JSON.parse(fileData);
    console.log('Using fallback blind structure from JSON file');
    return blindStructure;
  } catch (err) {
    console.error('Error reading fallback blind structure:', err);
    return null;
  }
}

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  // Only admins can transition sessions
  if (!session || session.role !== "ADMIN") {
    return res.status(403).json({ error: "Unauthorized: Admin access required" });
  }

  // PUT request to transition a session status
  if (req.method === "PUT") {
    const { sessionId, status } = req.body;

    if (!sessionId || !status) {
      return res.status(400).json({ error: "Missing sessionId or status" });
    }

    try {
      // Get the current session
      const pokerSession = await prisma.pokerSession.findUnique({
        where: {
          id: sessionId,
        },
      });

      if (!pokerSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Validate the status transition
      const validTransitions = {
        NOT_STARTED: ["ACTIVE", "CANCELLED"],
        ACTIVE: ["COMPLETED", "CANCELLED"],
        COMPLETED: [],
        CANCELLED: [],
      };

      if (!validTransitions[pokerSession.status].includes(status)) {
        return res.status(400).json({
          error: `Invalid status transition from ${pokerSession.status} to ${status}`,
        });
      }

      // Handle transition from NOT_STARTED to ACTIVE
      if (pokerSession.status === "NOT_STARTED" && status === "ACTIVE") {
        // Update all registrations - move from upcoming to current buy-in requests
        await prisma.$transaction(async (prisma) => {
          // For tournaments, set the initial blind level and start time
          const updateData = {
            status: status
          };
          
          // For tournaments, find the first non-break level to start with
          if (pokerSession.type === "TOURNAMENT") {
            let blindStructureData = null;
            let firstLevelIndex = 0;
            
            try {
              // Try to get blind structure from database
              const dbBlindStructure = await prisma.blindStructure.findFirst({
                include: {
                  levels: {
                    orderBy: {
                      level: 'asc' // Sort by level number for correct order
                    }
                  },
                },
              });
              
              if (dbBlindStructure && dbBlindStructure.levels && dbBlindStructure.levels.length > 0) {
                blindStructureData = dbBlindStructure;
                console.log('Found blind structure in database');
              }
            } catch (error) {
              console.error('Error fetching blind structure from database:', error);
              // The error is expected if the table doesn't exist yet
            }
            
            // If no blind structure in database, try fallback from JSON file
            if (!blindStructureData) {
              const fallbackStructure = await getFallbackBlindStructure();
              if (fallbackStructure && fallbackStructure.levels) {
                blindStructureData = {
                  levels: fallbackStructure.levels
                };
                console.log('Using fallback blind structure from file');
              }
            }
            
            if (blindStructureData) {
              // Find the index of the first non-break level
              firstLevelIndex = blindStructureData.levels.findIndex(level => !level.isBreak);
              
              // If no non-break level found, default to 0
              if (firstLevelIndex < 0) firstLevelIndex = 0;
            }
            
            // Set the blind level data
            updateData.currentBlindLevel = firstLevelIndex;
            updateData.levelStartTime = new Date(); // Current time as level start
            
            console.log(`Starting tournament with level index: ${updateData.currentBlindLevel}`);
          }
          
          // Update the session status first
          const updatedSession = await prisma.pokerSession.update({
            where: {
              id: sessionId,
            },
            data: updateData
          });

          // Automatically move all REGISTERED players to CURRENT
          if (pokerSession.type === "TOURNAMENT") {
            // Find all confirmed registered players
            const registeredPlayers = await prisma.registration.findMany({
              where: {
                sessionId: sessionId,
                status: 'CONFIRMED',
                playerStatus: 'REGISTERED'
              }
            });
            
            console.log(`Moving ${registeredPlayers.length} registered players to current status`);
            
            // Update all of them to CURRENT
            if (registeredPlayers.length > 0) {
              await prisma.registration.updateMany({
                where: {
                  sessionId: sessionId,
                  status: 'CONFIRMED',
                  playerStatus: 'REGISTERED'
                },
                data: {
                  playerStatus: 'CURRENT'
                }
              });
              
              // Don't update entries count - entries only increased by buy-in
            }
          }
        });

        return res.status(200).json({
          message: "Session activated successfully",
        });
      }

      // Handle transition to COMPLETED
      if (status === "COMPLETED") {
        // We could automatically create game results here, but that's likely done separately
        // by the admin entering results for each player
        await prisma.pokerSession.update({
          where: {
            id: sessionId,
          },
          data: {
            status: status,
            endTime: new Date(), // Set the end time to now
          },
        });

        return res.status(200).json({
          message: "Session completed successfully",
        });
      }

      // Handle transition to CANCELLED
      if (status === "CANCELLED") {
        await prisma.pokerSession.update({
          where: {
            id: sessionId,
          },
          data: {
            status: status,
          },
        });

        return res.status(200).json({
          message: "Session cancelled successfully",
        });
      }

      // All other valid transitions
      const updatedSession = await prisma.pokerSession.update({
        where: {
          id: sessionId,
        },
        data: {
          status: status,
        },
      });

      return res.status(200).json({
        message: `Session status updated to ${status}`,
        session: updatedSession,
      });
    } catch (error) {
      console.error("Error transitioning session:", error);
      return res.status(500).json({ error: "Failed to transition session", details: error.message });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
} 