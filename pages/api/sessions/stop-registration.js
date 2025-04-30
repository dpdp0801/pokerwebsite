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

    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    // Update the session to mark registration as closed
    const updatedSession = await prisma.session.update({
      where: {
        id: sessionId,
      },
      data: {
        registrationClosed: true,
      },
    });

    return res.status(200).json({ 
      success: true, 
      message: "Session registration has been closed",
      session: updatedSession
    });
  } catch (error) {
    console.error("Error stopping registration:", error);
    return res.status(500).json({ error: "Failed to stop registration" });
  }
} 