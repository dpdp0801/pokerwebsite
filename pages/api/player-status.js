import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Verify user is authenticated and has admin role
    const session = await getServerSession(req, res, authOptions);
    
    if (!session) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    if (session.role !== "ADMIN") {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { registrationId, newStatus, isRebuy } = req.body;
    
    if (!registrationId || !newStatus) {
      return res.status(400).json({ error: "Registration ID and new status are required" });
    }
    
    // Valid statuses
    const validStatuses = ["CURRENT", "ELIMINATED", "WAITLIST", "ITM"];
    if (!validStatuses.includes(newStatus)) {
      return res.status(400).json({ error: "Invalid status" });
    }

    // Get the registration to update
    const registration = await prisma.registration.findUnique({
      where: {
        id: registrationId,
      },
      include: {
        session: true,
        user: true
      }
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Start a transaction for updating registration and session
    const updatedData = await prisma.$transaction(async (prisma) => {
      // Update registration status
      const updatedRegistration = await prisma.registration.update({
        where: {
          id: registrationId,
        },
        data: {
          status: newStatus,
          isRebuy: isRebuy || registration.isRebuy, // Preserve or set rebuy status
        },
      });
      
      // Handle different status updates for the session
      let sessionUpdate = {};
      
      if (newStatus === 'ELIMINATED') {
        // Decrement current players, increment eliminated
        sessionUpdate = {
          currentPlayersCount: {
            decrement: 1
          },
          eliminatedPlayersCount: {
            increment: 1
          }
        };
      } else if (newStatus === 'ITM') {
        // For In The Money players - move from current to ITM
        sessionUpdate = {
          currentPlayersCount: {
            decrement: 1
          },
          itmPlayersCount: {
            increment: 1
          }
        };
      } else if (newStatus === 'CURRENT') {
        if (registration.status === 'ELIMINATED') {
          // Moving from eliminated back to current (rebuy)
          sessionUpdate = {
            currentPlayersCount: {
              increment: 1
            },
            eliminatedPlayersCount: {
              decrement: 1
            }
          };
        } else if (registration.status === 'WAITLIST') {
          // Moving from waitlist to current
          sessionUpdate = {
            currentPlayersCount: {
              increment: 1
            },
            waitlistedPlayersCount: {
              decrement: 1
            }
          };
        } else if (registration.status === 'ITM') {
          // Moving from ITM back to current (shouldn't normally happen)
          sessionUpdate = {
            currentPlayersCount: {
              increment: 1
            },
            itmPlayersCount: {
              decrement: 1
            }
          };
        } else if (registration.status === 'CURRENT') {
          // Already in current status, no need to change player counts
          sessionUpdate = {};
        }

        // If this is a rebuy, increment total entries
        if (isRebuy) {
          sessionUpdate.entries = {
            increment: 1
          };
        }
      } else if (newStatus === 'WAITLIST') {
        if (registration.status === 'CURRENT') {
          // Moving from current to waitlist
          sessionUpdate = {
            currentPlayersCount: {
              decrement: 1
            },
            waitlistedPlayersCount: {
              increment: 1
            }
          };
        } else if (registration.status === 'ELIMINATED') {
          // Moving from eliminated to waitlist
          sessionUpdate = {
            eliminatedPlayersCount: {
              decrement: 1
            },
            waitlistedPlayersCount: {
              increment: 1
            }
          };
        } else if (registration.status === 'ITM') {
          // Moving from ITM to waitlist (shouldn't normally happen)
          sessionUpdate = {
            itmPlayersCount: {
              decrement: 1
            },
            waitlistedPlayersCount: {
              increment: 1
            }
          };
        }
      }
      
      // Update session counts
      const updatedSession = await prisma.pokerSession.update({
        where: {
          id: registration.sessionId,
        },
        data: sessionUpdate,
      });
      
      return { registration: updatedRegistration, session: updatedSession };
    });

    return res.status(200).json({ 
      success: true, 
      message: `Player status updated to ${newStatus}`,
      data: updatedData
    });
  } catch (error) {
    console.error("Error updating player status:", error);
    return res.status(500).json({ error: "Failed to update player status" });
  }
} 