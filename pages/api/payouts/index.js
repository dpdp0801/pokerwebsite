import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../lib/auth-options';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get query parameters
    const { playerCount } = req.query;
    
    // If playerCount is provided, find the specific structure for that count
    if (playerCount && !isNaN(parseInt(playerCount))) {
      const count = parseInt(playerCount);
      const structure = await prisma.payoutStructure.findFirst({
        where: {
          minEntries: { lte: count },
          maxEntries: { gte: count }
        },
        include: {
          tiers: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      });

      if (!structure) {
        return res.status(404).json({ error: 'No payout structure found for this player count' });
      }

      return res.status(200).json(structure);
    }

    // Otherwise, return all payout structures
    const structures = await prisma.payoutStructure.findMany({
      orderBy: {
        minEntries: 'asc'
      },
      include: {
        tiers: {
          orderBy: {
            position: 'asc'
          }
        }
      }
    });

    return res.status(200).json(structures);
  } catch (error) {
    console.error('Error fetching payout structures:', error);
    return res.status(500).json({ error: 'Failed to fetch payout structures' });
  }
} 