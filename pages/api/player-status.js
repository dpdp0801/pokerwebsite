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
    if (!session) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Check for admin role in multiple possible locations
    const isAdmin = 
      session.user?.isAdmin === true || 
      session.role === "ADMIN" || 
      session.user?.role === "ADMIN";
    
    if (!isAdmin) {
      console.log("Unauthorized access attempt:", session);
      return res.status(401).json({ message: "Unauthorized - Admin access required" });
    }

    const { registrationId, newStatus, playerStatus, isRebuy = false } = req.body;

    // For rebuys, we only need registrationId
    if (!registrationId || (!newStatus && !isRebuy)) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    console.log(`Updating player status: ${registrationId} to ${newStatus}, playerStatus: ${playerStatus} (isRebuy: ${isRebuy})`);

    // Fetch the registration to update
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { session: true, user: true }
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found" });
    }

    console.log(`Current status: ${registration.status}, User: ${registration.user?.name}`);

    const currentStatus = registration.status;
    const sessionId = registration.sessionId;

    // Standardize status values
    let normalizedNewStatus = newStatus;
    let normalizedCurrentStatus = currentStatus;

    // Handle WAITLIST vs WAITLISTED 
    if (newStatus === 'WAITLIST') normalizedNewStatus = 'WAITLISTED';
    if (currentStatus === 'WAITLIST') normalizedCurrentStatus = 'WAITLISTED';

    console.log(`Normalized: Current ${normalizedCurrentStatus} → New ${normalizedNewStatus}`);

    // Update player counts based on status change
    let sessionUpdateData = {};
    
    // Handle rebuy case separately
    if (isRebuy) {
      console.log(`Processing rebuy for ${registration.user?.name}`);
      
      // Increment the rebuys/entries count
      try {
        // Update the player's rebuy count
        await prisma.registration.update({
          where: { id: registrationId },
          data: {
            rebuys: {
              increment: 1
            }
          }
        });
        
        console.log(`Successfully incremented rebuys for registration ${registrationId}`);
        
        // Update session entries count
        await prisma.pokerSession.update({
          where: { id: sessionId },
          data: {
            entries: { 
              increment: 1 
            }
          }
        });
        
        console.log(`Successfully incremented session entries count for session ${sessionId}`);
        
        return res.status(200).json({ 
          success: true, 
          message: "Buy-in count incremented successfully",
          newRebuyCount: (registration.rebuys || 0) + 1
        });
      } catch (error) {
        console.error("Error updating session entries:", error);
        return res.status(500).json({ message: "Error updating entries", error: error.message });
      }
    } else {
      // Only process status changes if there's an actual change
      if (normalizedCurrentStatus !== normalizedNewStatus) {
        console.log(`Changing status from ${normalizedCurrentStatus} to ${normalizedNewStatus}`);
        
        try {
          // Update the registration status directly, no counters to update since they don't exist
          await prisma.registration.update({
            where: { id: registrationId },
            data: { 
              status: normalizedNewStatus,
              // Ensure playerStatus is set correctly, with special handling for waitlisted
              playerStatus: normalizedNewStatus === "WAITLISTED" 
                ? "WAITLISTED"
                : (playerStatus || normalizedNewStatus)
            }
          });
          
          console.log(`Updated registration ${registrationId} - Status: ${normalizedNewStatus}, PlayerStatus: ${normalizedNewStatus === "WAITLISTED" ? "WAITLISTED" : (playerStatus || normalizedNewStatus)}`);
          
          // If moving from non-current to current in a tournament, increment entries
          if (normalizedNewStatus === "CURRENT" && 
              (normalizedCurrentStatus === "WAITLISTED" || normalizedCurrentStatus === "REGISTERED") &&
              registration.session.type === "TOURNAMENT") {
            
            await prisma.pokerSession.update({
              where: { id: sessionId },
              data: {
                entries: { increment: 1 }
              }
            });
          }
        } catch (error) {
          console.error("Error updating registration status:", error);
          return res.status(500).json({ message: "Error updating status", error: error.message });
        }
      } else {
        console.log(`Status unchanged: ${normalizedCurrentStatus}`);
      }
    }

    console.log("Status update completed successfully");

    // Fetch the updated session data to return (doesn't include the registration changes immediately)
    return res.status(200).json({ success: true, message: "Status updated successfully" });
  } catch (error) {
    console.error("Error updating player status:", error);
    return res.status(500).json({ message: "Internal server error", error: error.message });
  }
} 