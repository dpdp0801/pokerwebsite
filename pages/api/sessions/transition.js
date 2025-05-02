import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Get structure data from the consolidated config file
function getTournamentConfig() {
  try {
    const dataDirectory = path.join(process.cwd(), 'data');
    const configFilePath = path.join(dataDirectory, 'tournamentConfig.json');
    if (!fs.existsSync(configFilePath)) {
      console.error(`[API /api/sessions/transition] Config file not found: ${configFilePath}`);
      return null;
    }
    const fileContents = fs.readFileSync(configFilePath, 'utf8');
    const config = JSON.parse(fileContents);
    // Basic validation
    if (!config || typeof config !== 'object' || !config.blindStructure) {
         console.error('[API /api/sessions/transition] Invalid config file format or missing blindStructure.');
         return null;
    }
    console.log('[API /api/sessions/transition] Using structure from tournamentConfig.json');
    return config;
  } catch (err) {
    console.error('[API /api/sessions/transition] Error reading tournament config:', err);
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
        await prisma.$transaction(async (prisma) => {
          const updateData = { status: status };
          
          if (pokerSession.type === "TOURNAMENT") {
            const tournamentConfig = getTournamentConfig(); // Read the consolidated config
            let firstLevelIndex = 0;
            
            // Use the blindStructure from the config
            if (tournamentConfig?.blindStructure?.levels) {
              firstLevelIndex = tournamentConfig.blindStructure.levels.findIndex(level => !level.isBreak);
              if (firstLevelIndex < 0) firstLevelIndex = 0;
            }
            
            updateData.currentBlindLevel = firstLevelIndex;
            updateData.levelStartTime = new Date(); 
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