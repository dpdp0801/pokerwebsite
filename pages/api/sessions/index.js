import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method === 'GET') {
    // Find the first session that is ACTIVE or NOT_STARTED
    // This assumes there is only one such session relevant for the /status page
    try {
      const currentSession = await prisma.pokerSession.findFirst({
        where: {
          OR: [
            { status: 'ACTIVE' },
            { status: 'NOT_STARTED' },
          ],
        },
        orderBy: {
          // Prioritize ACTIVE sessions, then by creation date
          status: 'asc', // ACTIVE comes before NOT_STARTED alphabetically
          createdAt: 'desc',
        },
        select: {
          id: true, // Only need the ID initially
          status: true, // Include status for logging/debugging
        },
      });

      if (currentSession) {
        console.log(`Found relevant session for /status: ${currentSession.id} (Status: ${currentSession.status})`);
        return res.status(200).json({ sessionId: currentSession.id });
      } else {
        console.log('No ACTIVE or NOT_STARTED session found for /status');
        // Return success but with null ID if none found
        return res.status(200).json({ sessionId: null });
      }
    } catch (error) {
      console.error('Error finding current session:', error);
      return res.status(500).json({ message: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    // --- TODO: Logic for creating a new session (POST /api/sessions) ---
    // Requires admin check, validation, etc.
    return res.status(501).json({ message: 'Session creation not implemented yet' });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
} 