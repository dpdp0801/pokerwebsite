import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-options';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check if the user is authenticated and is an admin
    const session = await getServerSession(req, res, authOptions);
    
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    // Delete existing data (to prevent duplicates)
    await prisma.payoutTier.deleteMany();
    await prisma.payoutStructure.deleteMany();
    
    console.log('Deleted existing payout structures');

    // Define payout structures based on user requirements
    const payoutStructures = [
      {
        name: '2-10 Players',
        minEntries: 2,
        maxEntries: 10,
        tiers: [
          { position: 1, percentage: 65 },
          { position: 2, percentage: 35 }
        ]
      },
      {
        name: '11-20 Players',
        minEntries: 11,
        maxEntries: 20,
        tiers: [
          { position: 1, percentage: 50 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 20 }
        ]
      },
      {
        name: '21-30 Players',
        minEntries: 21,
        maxEntries: 30,
        tiers: [
          { position: 1, percentage: 40 },
          { position: 2, percentage: 27 },
          { position: 3, percentage: 18 },
          { position: 4, percentage: 15 }
        ]
      },
      {
        name: '31-40 Players',
        minEntries: 31,
        maxEntries: 40,
        tiers: [
          { position: 1, percentage: 38 },
          { position: 2, percentage: 24 },
          { position: 3, percentage: 17 },
          { position: 4, percentage: 12 },
          { position: 5, percentage: 9 }
        ]
      },
      {
        name: '41-50 Players',
        minEntries: 41,
        maxEntries: 50,
        tiers: [
          { position: 1, percentage: 35 },
          { position: 2, percentage: 22 },
          { position: 3, percentage: 15 },
          { position: 4, percentage: 11 },
          { position: 5, percentage: 9 },
          { position: 6, percentage: 8 }
        ]
      },
      {
        name: '51-60 Players',
        minEntries: 51,
        maxEntries: 60,
        tiers: [
          { position: 1, percentage: 32 },
          { position: 2, percentage: 20 },
          { position: 3, percentage: 14 },
          { position: 4, percentage: 10 },
          { position: 5, percentage: 8 },
          { position: 6, percentage: 8 },
          { position: 7, percentage: 8 }
        ]
      },
      {
        name: '61-75 Players',
        minEntries: 61,
        maxEntries: 75,
        tiers: [
          { position: 1, percentage: 30 },
          { position: 2, percentage: 19 },
          { position: 3, percentage: 13 },
          { position: 4, percentage: 10 },
          { position: 5, percentage: 8 },
          { position: 6, percentage: 7 },
          { position: 7, percentage: 7 },
          { position: 8, percentage: 6 }
        ]
      },
      {
        name: '76-100 Players',
        minEntries: 76,
        maxEntries: 100,
        tiers: [
          { position: 1, percentage: 28 },
          { position: 2, percentage: 17 },
          { position: 3, percentage: 12 },
          { position: 4, percentage: 9 },
          { position: 5, percentage: 7 },
          { position: 6, percentage: 6 },
          { position: 7, percentage: 6 },
          { position: 8, percentage: 5 },
          { position: 9, percentage: 5 },
          { position: 10, percentage: 5 }
        ]
      }
    ];

    // Create the payout structures and tiers
    const createdStructures = [];

    for (const structure of payoutStructures) {
      console.log(`Creating payout structure: ${structure.name}`);
      
      const createdStructure = await prisma.payoutStructure.create({
        data: {
          name: structure.name,
          minEntries: structure.minEntries,
          maxEntries: structure.maxEntries,
          tiers: {
            create: structure.tiers
          }
        },
        include: {
          tiers: true
        }
      });
      
      createdStructures.push(createdStructure);
    }

    console.log('Payout structures seeded successfully');

    return res.status(200).json({
      message: 'Payout structures seeded successfully',
      structures: createdStructures
    });
  } catch (error) {
    console.error('Error seeding payout structures:', error);
    return res.status(500).json({
      message: 'Error seeding payout structures',
      error: error.message
    });
  }
} 