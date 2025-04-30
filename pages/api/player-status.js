import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "PUT") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    // Ensure the user is authorized as an admin
    const session = await getServerSession(req, res, authOptions);
    if (!session || !session.user || !session.user.isAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const { registrationId, newStatus, isRebuy = false } = req.body;

    if (!registrationId || !newStatus) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // Fetch the registration to update
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { session: true, user: true }
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    const currentStatus = registration.status;
    const sessionId = registration.sessionId;

    // Update player counts based on status change
    let sessionUpdateData = {};
    
    // Handle rebuy case separately
    if (isRebuy) {
      // Always increment totalEntries for rebuys
      sessionUpdateData = {
        totalEntries: { increment: 1 }
      };
      
      // If player isn't already CURRENT, we need to update their status
      if (currentStatus !== "CURRENT") {
        // Decrement counter for old status
        if (currentStatus === "WAITLIST") {
          sessionUpdateData.waitlistCount = { decrement: 1 };
        } else if (currentStatus === "ELIMINATED") {
          sessionUpdateData.eliminatedPlayersCount = { decrement: 1 };
        } else if (currentStatus === "ITM") {
          sessionUpdateData.itmCount = { decrement: 1 };
        }
        
        // Increment current player count
        sessionUpdateData.currentPlayers = { increment: 1 };
        
        // Update the session with the new counts
        await prisma.session.update({
          where: { id: sessionId },
          data: sessionUpdateData
        });
        
        // Update player status to CURRENT
        await prisma.registration.update({
          where: { id: registrationId },
          data: { status: "CURRENT" }
        });
      } else {
        // Just update the session counts
        await prisma.session.update({
          where: { id: sessionId },
          data: sessionUpdateData
        });
      }
      
      // Create a new registration entry to track the rebuy
      await prisma.registration.create({
        data: {
          userId: registration.userId,
          sessionId: registration.sessionId,
          status: "CURRENT",
          isRebuy: true,
          entryType: registration.entryType || "NORMAL"
        }
      });
    } else {
      // Only process status changes if there's an actual change
      if (currentStatus !== newStatus) {
        // Decrement counter for old status
        if (currentStatus === "CURRENT") {
          sessionUpdateData.currentPlayers = { decrement: 1 };
        } else if (currentStatus === "WAITLIST") {
          sessionUpdateData.waitlistCount = { decrement: 1 };
        } else if (currentStatus === "ELIMINATED") {
          sessionUpdateData.eliminatedPlayersCount = { decrement: 1 };
        } else if (currentStatus === "ITM") {
          sessionUpdateData.itmCount = { decrement: 1 };
        }

        // Increment counter for new status
        if (newStatus === "CURRENT") {
          sessionUpdateData.currentPlayers = { increment: 1 };
          // Only increment totalEntries if player is coming from waitlist or is new
          if (currentStatus === "WAITLIST" || currentStatus === "REGISTERED") {
            sessionUpdateData.totalEntries = { increment: 1 };
          }
        } else if (newStatus === "WAITLIST") {
          sessionUpdateData.waitlistCount = { increment: 1 };
        } else if (newStatus === "ELIMINATED") {
          sessionUpdateData.eliminatedPlayersCount = { increment: 1 };
        } else if (newStatus === "ITM") {
          sessionUpdateData.itmCount = { increment: 1 };
        }
        
        // Update the session with the new counts
        await prisma.session.update({
          where: { id: sessionId },
          data: sessionUpdateData
        });
        
        // Update the registration status
        await prisma.registration.update({
          where: { id: registrationId },
          data: { status: newStatus }
        });
      }
    }

    // Fetch the updated session data to return
    const updatedSession = await prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        registrations: {
          include: {
            user: true
          }
        }
      }
    });

    return res.status(200).json(updatedSession);
  } catch (error) {
    console.error("Error updating player status:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
} 