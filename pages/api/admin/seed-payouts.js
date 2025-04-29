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

    // Define payout structures
    const payoutStructures = [
      {
        name: '3-6 Players',
        minEntries: 3,
        maxEntries: 6,
        tiers: [
          { position: 1, percentage: 70 },
          { position: 2, percentage: 30 }
        ]
      },
      {
        name: '7-9 Players',
        minEntries: 7,
        maxEntries: 9,
        tiers: [
          { position: 1, percentage: 65 },
          { position: 2, percentage: 35 }
        ]
      },
      {
        name: '10-14 Players',
        minEntries: 10,
        maxEntries: 14,
        tiers: [
          { position: 1, percentage: 60 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 10 }
        ]
      },
      {
        name: '15-19 Players',
        minEntries: 15,
        maxEntries: 19,
        tiers: [
          { position: 1, percentage: 50 },
          { position: 2, percentage: 30 },
          { position: 3, percentage: 20 }
        ]
      },
      {
        name: '20-29 Players',
        minEntries: 20,
        maxEntries: 29,
        tiers: [
          { position: 1, percentage: 45 },
          { position: 2, percentage: 25 },
          { position: 3, percentage: 15 },
          { position: 4, percentage: 10 },
          { position: 5, percentage: 5 }
        ]
      },
      {
        name: '30-39 Players',
        minEntries: 30,
        maxEntries: 39,
        tiers: [
          { position: 1, percentage: 40 },
          { position: 2, percentage: 23 },
          { position: 3, percentage: 14 },
          { position: 4, percentage: 10 },
          { position: 5, percentage: 8 },
          { position: 6, percentage: 5 }
        ]
      },
      {
        name: '40+ Players',
        minEntries: 40,
        maxEntries: 999,
        tiers: [
          { position: 1, percentage: 35 },
          { position: 2, percentage: 20 },
          { position: 3, percentage: 15 },
          { position: 4, percentage: 10 },
          { position: 5, percentage: 7 },
          { position: 6, percentage: 5 },
          { position: 7, percentage: 4 },
          { position: 8, percentage: 2 },
          { position: 9, percentage: 1 },
          { position: 10, percentage: 1 }
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