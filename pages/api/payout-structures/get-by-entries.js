import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get entries from query parameter
    const entries = parseInt(req.query.entries);
    
    // Validate entries
    if (isNaN(entries) || entries < 0) {
      return res.status(400).json({ error: 'Invalid number of entries. Must be a number greater than or equal to 0.' });
    }

    // If entries is 0, return a default empty structure
    if (entries === 0) {
      return res.status(200).json({
        id: "default",
        name: "No entries yet",
        minEntries: 0,
        maxEntries: 0,
        tiers: [],
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    // Find the appropriate structure based on entries
    const payoutStructure = await prisma.payoutStructure.findFirst({
      where: {
        minEntries: { lte: entries },
        maxEntries: { gte: entries }
      },
      include: {
        tiers: {
          orderBy: { position: 'asc' }
        }
      }
    });

    // If no exact match, get the largest structure
    if (!payoutStructure) {
      // Find the structure with the highest maxEntries
      const fallbackStructure = await prisma.payoutStructure.findFirst({
        orderBy: { maxEntries: 'desc' },
        include: {
          tiers: {
            orderBy: { position: 'asc' }
          }
        }
      });

      if (!fallbackStructure) {
        return res.status(404).json({ error: 'No payout structures found' });
      }

      return res.status(200).json(fallbackStructure);
    }

    // Return the found structure with its tiers
    return res.status(200).json(payoutStructure);
  } catch (error) {
    console.error('Error fetching payout structure:', error);
    return res.status(500).json({ error: 'Failed to fetch payout structure' });
  }
} 