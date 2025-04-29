import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Get the default blind structure
    const structure = await prisma.blindStructure.findFirst({
      where: {
        isDefault: true
      },
      include: {
        levels: {
          orderBy: {
            level: 'asc'
          }
        }
      }
    });

    if (!structure) {
      return res.status(404).json({ message: 'No blind structure found' });
    }

    return res.status(200).json({ 
      success: true, 
      structure 
    });
  } catch (error) {
    console.error('Error fetching blind structure:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch blind structure', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 