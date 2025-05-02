import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';
import { getBlindStructure } from '@/lib/structures';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  const { id: sessionId } = req.query;
  console.log(`[${req.method}] /api/sessions/${sessionId} called`);

  if (!sessionId) {
    console.log('Session ID missing from query');
    return res.status(400).json({ message: 'Session ID is required' });
  }

  // TODO: Add permission checks (e.g., only admin or registered player?)
  // const session = await getServerSession(req, res, authOptions);
  // if (!session) { ... }

  if (req.method === 'GET') {
    console.log(`Fetching session details for ID: ${sessionId}`);
    try {
      const sessionData = await prisma.pokerSession.findUnique({
        where: { id: sessionId },
        include: {
          registrations: {
            where: {
              NOT: { status: 'CANCELLED' }
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  firstName: true,
                  lastName: true,
                  image: true,
                  venmoId: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
            },
          },
        },
      });

      if (!sessionData) {
        console.log(`Session not found for ID: ${sessionId}`);
        return res.status(404).json({ exists: false, message: 'Session not found' });
      }
      console.log(`Session data found for ID: ${sessionId}`);

      // Process registrations
      const registrations = {
        current: [],
        eliminated: [],
        waitlist: [],
        itm: [],
        finished: [],
      };
      let currentPlayersCount = 0;
      let eliminatedPlayersCount = 0;
      let waitlistedPlayersCount = 0;
      let itmPlayersCount = sessionData.itmPlayersCount || 0;
      let finishedPlayersCount = 0;

      sessionData.registrations.forEach((reg) => {
        switch (reg.playerStatus) {
          case 'CURRENT':
          case 'REGISTERED': 
            registrations.current.push(reg);
            currentPlayersCount++;
            break;
          case 'ELIMINATED':
            registrations.eliminated.push(reg);
            eliminatedPlayersCount++;
            break;
          case 'WAITLISTED':
            registrations.waitlist.push(reg);
            waitlistedPlayersCount++;
            break;
          case 'ITM':
            registrations.itm.push(reg);
            break;
          case 'FINISHED':
             registrations.finished.push(reg);
             finishedPlayersCount++;
             break;
          default:
            break;
        }
      });
      registrations.itm.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
      console.log(`Processed ${sessionData.registrations.length} registrations for session ${sessionId}`);

      // Blind structure logic
      let blindInfo = {};
      if (sessionData.type === 'TOURNAMENT') {
          console.log(`Fetching blind structure from file for tournament session ${sessionId}`);
          const blindStructure = getBlindStructure();
          if (!blindStructure) {
              console.error('Blind structure file (tournamentConfig.json) not found!');
              blindInfo = { levels: [], currentLevelIndex: 0, currentLevel: null };
          } else {
             const sortedLevels = [...blindStructure.levels].sort((a, b) => a.level - b.level);
             const currentLevelIndex = sessionData.currentBlindLevel ?? 0;
             const currentLevel = sortedLevels[currentLevelIndex] || null;
             blindInfo = {
                 id: 'file-based-structure',
                 name: blindStructure.name,
                 description: blindStructure.description,
                 startingStack: blindStructure.startingStack,
                 levels: sortedLevels,
                 currentLevelIndex,
                 currentLevel,
             };
             console.log(`Blind info prepared for session ${sessionId}, current level index: ${currentLevelIndex}`);
          }
      } else {
          console.log(`Session ${sessionId} is a cash game, skipping blind structure file.`);
      }
      
      const responsePayload = {
        exists: true,
        session: {
          ...sessionData,
          registrations: registrations, 
          currentPlayersCount,
          eliminatedPlayersCount,
          waitlistedPlayersCount,
          itmPlayersCount,
          finishedPlayersCount,
        },
        blindInfo: {
           ...blindInfo,
           levelStartTime: sessionData.levelStartTime || null,
           sessionStatus: sessionData.status || 'NOT_STARTED'
        }
      };
      // Log the exact payload before sending
      console.log(`[GET /api/sessions/${sessionId}] Returning payload:`, JSON.stringify(responsePayload, null, 2)); 
      return res.status(200).json(responsePayload);

    } catch (error) {
      console.error(`[GET /api/sessions/${sessionId}] Error fetching session status:`, error);
      return res.status(500).json({ exists: false, message: 'Internal server error', error: error.message });
    }

  } else if (req.method === 'PUT') {
    // --- Logic from potential session update routes --- 
    // Example: Close registration, update title etc.
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.user.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Forbidden: Admin access required.' });
    }
    try {
        const { registrationClosed, title, description /* other fields */ } = req.body;
        const updateData = {};
        if (registrationClosed !== undefined) {
            updateData.registrationClosed = registrationClosed;
        }
        if (title !== undefined) {
            updateData.title = title;
        }
        // Add other updatable fields

        if (Object.keys(updateData).length === 0) {
             return res.status(400).json({ message: 'No update data provided.' });
        }

        const updatedSession = await prisma.pokerSession.update({
            where: { id: sessionId },
            data: updateData,
        });
        return res.status(200).json({ success: true, session: updatedSession });
    } catch(error) {
         console.error(`Error updating session ${sessionId}:`, error);
         return res.status(500).json({ success: false, message: 'Failed to update session' });
    }

  } else if (req.method === 'DELETE') {
    // --- Logic for cancelling/deleting a session ---
     const session = await getServerSession(req, res, authOptions);
     if (!session || session.user.role !== 'ADMIN') {
         return res.status(403).json({ message: 'Forbidden: Admin access required.' });
     }
     try {
         // Check if session exists and can be deleted (e.g., not ACTIVE?)
         // Option 1: Mark as CANCELLED
         // await prisma.pokerSession.update({ where: { id: sessionId }, data: { status: 'CANCELLED' } });
         // Option 2: Actually delete (more dangerous, cascades?)
         await prisma.pokerSession.delete({ where: { id: sessionId } });
         return res.status(204).end(); // No content
     } catch(error) {
          console.error(`Error deleting session ${sessionId}:`, error);
          return res.status(500).json({ success: false, message: 'Failed to delete session' });
     }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
  }
}