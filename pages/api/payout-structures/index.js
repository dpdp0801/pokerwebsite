import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    const structures = await prisma.payoutStructure.findMany({
      include: {
        tiers: {
          orderBy: {
            position: 'asc'
          }
        }
      },
      orderBy: {
        minEntries: 'asc'
      }
    });

    return res.status(200).json({
      message: 'Payout structures fetched successfully',
      structures
    });
  } catch (error) {
    console.error('Error fetching payout structures:', error);
    return res.status(500).json({
      message: 'Error fetching payout structures',
      error: error.message
    });
  }
} 