import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-utils";
import prisma from "@/lib/prisma";

export default async function handler(req, res) {
  if (req.method !== "POST") {
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

    const { registrationId } = req.body;
    
    if (!registrationId) {
      return res.status(400).json({ error: "Registration ID is required" });
    }

    // Get the registration to validate it exists and get the session
    const registration = await prisma.registration.findUnique({
      where: {
        id: registrationId,
      },
      include: {
        session: true
      }
    });

    if (!registration) {
      return res.status(404).json({ error: "Registration not found" });
    }

    // Update the registration to mark as no-show
    const updatedRegistration = await prisma.registration.update({
      where: {
        id: registrationId,
      },
      data: {
        status: "NO_SHOW",
      },
    });

    // Decrement registered player count
    const updatedSession = await prisma.session.update({
      where: {
        id: registration.sessionId,
      },
      data: {
        registeredPlayers: {
          decrement: 1
        }
      },
    });

    return res.status(200).json({ 
      success: true, 
      message: "Player has been marked as a no-show",
      registration: updatedRegistration
    });
  } catch (error) {
    console.error("Error marking no-show:", error);
    return res.status(500).json({ error: "Failed to mark player as no-show" });
  }
} 