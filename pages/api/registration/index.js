import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth-utils";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  // GET - Fetch registrations for the current user
  if (req.method === "GET") {
    try {
      const user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const registrations = await prisma.registration.findMany({
        where: {
          userId: user.id,
        },
        include: {
          session: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      });

      return res.status(200).json(registrations);
    } catch (error) {
      console.error("Error fetching registrations:", error);
      return res.status(500).json({ error: "Failed to fetch registrations" });
    }
  }

  // POST - Create a new registration
  if (req.method === "POST") {
    const { sessionId, buyInAmount } = req.body;

    if (!sessionId || !buyInAmount) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    try {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
      });
      if (!user) return res.status(404).json({ error: "User not found" });

      // Check if the session exists and is open for registration
      const pokerSession = await prisma.pokerSession.findUnique({
        where: { id: sessionId },
        select: { 
          id: true, 
          status: true, 
          maxPlayers: true, 
          type: true 
        } // Select only needed fields
      });
      if (!pokerSession) return res.status(404).json({ error: "Session not found" });
      if (pokerSession.status !== "NOT_STARTED" && pokerSession.status !== "ACTIVE") {
        return res.status(400).json({ error: "Session is not open for registration" });
      }

      // Check if user is already registered (and not cancelled)
      const existingRegistration = await prisma.registration.findFirst({
        where: {
          userId: user.id,
          sessionId: sessionId,
          NOT: { status: 'CANCELLED' } // Ensure they aren't just cancelled
        },
      });
      if (existingRegistration) {
        return res.status(400).json({ error: "You are already registered for this session" });
      }

      // Count current *active* (confirmed) registrations to check against maxPlayers
      const activeRegistrationCount = await prisma.registration.count({
        where: {
          sessionId: sessionId,
          // Count players who are confirmed and either currently playing or registered to play
          status: "CONFIRMED",
          playerStatus: { in: ['CURRENT', 'REGISTERED'] } 
        },
      });
      console.log(`Session ${sessionId}: Max Players = ${pokerSession.maxPlayers}, Current Active Count = ${activeRegistrationCount}`);

      // Determine status based on count and max players
      const isWaitlisted = pokerSession.maxPlayers && activeRegistrationCount >= pokerSession.maxPlayers;
      const registrationStatus = isWaitlisted ? "WAITLISTED" : "CONFIRMED";
      const playerStatus = isWaitlisted 
        ? "WAITLISTED" // If waitlisted, playerStatus should also be Waitlisted
        : (pokerSession.status === "ACTIVE" ? "CURRENT" : "REGISTERED");
      const paymentStatus = isWaitlisted ? "NOT_REQUIRED_YET" : "UNPAID";
      
      console.log(`Determined registration status: isWaitlisted=${isWaitlisted}, registrationStatus=${registrationStatus}, playerStatus=${playerStatus}`);

      // Generate a unique payment code (keep existing logic)
      const userIdPart = user.id.substring(0, 3).toUpperCase();
      const timestamp = new Date().getTime().toString().substring(9, 13);
      const paymentCode = `CP-${userIdPart}-${pokerSession.type.substring(0, 1)}${timestamp}`;

      // Create registration
      const registration = await prisma.registration.create({
        data: {
          userId: user.id,
          sessionId: sessionId,
          buyInAmount: buyInAmount,
          status: registrationStatus, // Use determined status
          playerStatus: playerStatus, // Use determined status
          paymentCode: paymentCode,
          paymentStatus: paymentStatus,
          wasRegistered: true
        },
      });
      
      console.log(`Registration created with ID: ${registration.id}, Status: ${registrationStatus}, PlayerStatus: ${playerStatus}`);
      
      return res.status(201).json({
        ...registration,
        wouldBeWaitlisted: isWaitlisted // Keep this flag for frontend feedback if needed
      });
    } catch (error) {
      console.error("Error creating registration:", error);
      return res.status(500).json({ error: "Failed to create registration" });
    }
  }

  // PUT - Update a registration
  if (req.method === "PUT") {
    const { id, paymentStatus } = req.body;

    if (!id) {
      return res.status(400).json({ error: "Missing registration ID" });
    }

    try {
      // Check if user is authorized to update this registration
      const user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Only admins can update payment status
      if (paymentStatus && session.role !== "ADMIN") {
        return res.status(403).json({ error: "Unauthorized to update payment status" });
      }

      // Get the registration
      const registration = await prisma.registration.findUnique({
        where: {
          id: id,
        },
      });

      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      // Only allow updates to own registrations or if admin
      if (registration.userId !== user.id && session.role !== "ADMIN") {
        return res.status(403).json({ error: "Unauthorized to update this registration" });
      }

      // Update registration
      const updatedRegistration = await prisma.registration.update({
        where: {
          id: id,
        },
        data: {
          ...(paymentStatus && { paymentStatus }),
        },
      });

      return res.status(200).json(updatedRegistration);
    } catch (error) {
      console.error("Error updating registration:", error);
      return res.status(500).json({ error: "Failed to update registration" });
    }
  }

  // DELETE - Cancel a registration
  if (req.method === "DELETE") {
    const { id } = req.query;

    if (!id) {
      return res.status(400).json({ error: "Missing registration ID" });
    }

    try {
      // Check if user is authorized to delete this registration
      const user = await prisma.user.findUnique({
        where: {
          email: session.user.email,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Get the registration
      const registration = await prisma.registration.findUnique({
        where: {
          id: id,
        },
        include: {
          session: true,
        },
      });

      if (!registration) {
        return res.status(404).json({ error: "Registration not found" });
      }

      // Only allow deleting own registrations or if admin
      if (registration.userId !== user.id && session.role !== "ADMIN") {
        return res.status(403).json({ error: "Unauthorized to delete this registration" });
      }

      // Check if the session is still open for cancellation
      if ((registration.session.status !== "NOT_STARTED" && registration.session.status !== "ACTIVE") && session.role !== "ADMIN") {
        return res.status(400).json({ error: "Session has already been completed and cannot be cancelled" });
      }

      // Delete registration
      await prisma.registration.delete({
        where: {
          id: id,
        },
      });

      return res.status(200).json({ message: "Registration cancelled successfully" });
    } catch (error) {
      console.error("Error deleting registration:", error);
      return res.status(500).json({ error: "Failed to delete registration" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
} 