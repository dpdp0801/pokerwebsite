import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
          // Update the session status first
          const updatedSession = await prisma.pokerSession.update({
            where: {
              id: sessionId,
            },
            data: {
              status: status,
            },
          });

          // No need to update registrations since their relation to the session
          // means they'll be filtered differently in the profile page based on session status
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
      return res.status(500).json({ error: "Failed to transition session" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
} 