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
      structures: structures || []
    });
  } catch (error) {
    console.error('Error fetching payout structures:', error);
    
    // Check for specific Prisma errors
    const errorMessage = error.message || 'Error fetching payout structures';
    const isPrismaError = error.code && error.code.startsWith('P');
    
    if (isPrismaError) {
      if (error.code === 'P2021') {
        return res.status(500).json({
          message: 'Database table not found. You may need to run "npx prisma db push" to create the tables.',
          error: errorMessage
        });
      }
    }
    
    return res.status(500).json({
      message: 'Error fetching payout structures',
      error: errorMessage
    });
  }
} 