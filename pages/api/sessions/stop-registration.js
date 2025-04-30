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

    const isAdmin = 
      session.user?.isAdmin === true || 
      session.role === "ADMIN" || 
      session.user?.role === "ADMIN";
      
    if (!isAdmin) {
      return res.status(403).json({ error: "Forbidden: Admin access required" });
    }

    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID is required" });
    }

    console.log("Attempting to close registration for session:", sessionId);

    // Update the pokerSession to mark registration as closed
    // The Prisma error showed that 'registrationClosed' doesn't exist on 'session' but on 'pokerSession'
    const updatedSession = await prisma.pokerSession.update({
      where: {
        id: sessionId,
      },
      data: {
        registrationClosed: true,
      },
    });

    console.log("Registration closed successfully:", updatedSession);

    return res.status(200).json({ 
      success: true, 
      message: "Session registration has been closed",
      session: updatedSession
    });
  } catch (error) {
    console.error("Error stopping registration:", error);
    return res.status(500).json({ error: "Failed to stop registration", message: error.message });
  }
} 