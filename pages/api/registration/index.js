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
        where: {
          email: session.user.email,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      // Check if the session exists and is open for registration
      const pokerSession = await prisma.pokerSession.findUnique({
        where: {
          id: sessionId,
        },
      });

      if (!pokerSession) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Allow registration for ACTIVE and NOT_STARTED sessions
      if (pokerSession.status !== "NOT_STARTED" && pokerSession.status !== "ACTIVE") {
        return res.status(400).json({ error: "Session is not open for registration" });
      }

      // Generate a unique payment code
      const userIdPart = user.id.substring(0, 3).toUpperCase();
      const timestamp = new Date().getTime().toString().substring(9, 13);
      const paymentCode = `CP-${userIdPart}-${pokerSession.type.substring(0, 1)}${timestamp}`;

      // Check if user is already registered
      const existingRegistration = await prisma.registration.findFirst({
        where: {
          userId: user.id,
          sessionId: sessionId,
        },
      });

      if (existingRegistration) {
        return res.status(400).json({ error: "You are already registered for this session" });
      }

      // Count current registrations
      const registrationCount = await prisma.registration.count({
        where: {
          sessionId: sessionId,
          status: "CONFIRMED",
        },
      });

      // Check if session is full
      const isWaitlisted = pokerSession.maxPlayers && registrationCount >= pokerSession.maxPlayers;
      const status = isWaitlisted ? "WAITLISTED" : "CONFIRMED";

      // Create registration
      const registration = await prisma.registration.create({
        data: {
          userId: user.id,
          sessionId: sessionId,
          buyInAmount: buyInAmount,
          status: status,
          paymentCode: paymentCode,
          paymentStatus: isWaitlisted ? "NOT_REQUIRED_YET" : "UNPAID",
        },
      });

      return res.status(201).json({
        ...registration,
        wouldBeWaitlisted: isWaitlisted
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