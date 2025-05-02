import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  console.log(`[${req.method}] /api/sessions called`); // Log entry
  if (req.method === 'GET') {
    // Find the first session that is ACTIVE or NOT_STARTED
    // This assumes there is only one such session relevant for the /status page
    try {
      console.log('Searching for ACTIVE or NOT_STARTED session...');
      const currentSession = await prisma.pokerSession.findFirst({
        where: {
          OR: [
            { status: 'ACTIVE' },
            { status: 'NOT_STARTED' },
          ],
        },
        orderBy: [
          // Wrap the order conditions in an array
          { status: 'asc' }, 
          { createdAt: 'desc' }
        ],
        select: {
          id: true, // Only need the ID initially
          status: true, // Include status for logging/debugging
        },
      });

      if (currentSession) {
        // ** Add a check to verify the session still exists **
        const stillExists = await prisma.pokerSession.findUnique({
             where: { id: currentSession.id },
             select: { id: true } // Just need to confirm existence
        });
        
        if (stillExists) {
             console.log(`[GET /api/sessions] Found and verified session: ${currentSession.id} (Status: ${currentSession.status})`);
             return res.status(200).json({ sessionId: currentSession.id });
        } else {
             console.warn(`[GET /api/sessions] Session ${currentSession.id} found by findFirst but NOT by findUnique. Returning null.`);
             return res.status(200).json({ sessionId: null });
        }
      } else {
        console.log('[GET /api/sessions] No ACTIVE or NOT_STARTED session found for /status');
        // Return success but with null ID if none found
        return res.status(200).json({ sessionId: null });
      }
    } catch (error) {
      console.error('[GET /api/sessions] Error finding current session:', error);
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