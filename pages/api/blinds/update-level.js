import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Get blind structure from JSON file
function getBlindStructure() {
  try {
    const dataPath = path.join(process.cwd(), 'data', 'blindStructure.json');
    const fileData = fs.readFileSync(dataPath, 'utf8');
    return JSON.parse(fileData);
  } catch (error) {
    console.error('Error reading blind structure:', error);
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    // Check for admin authentication
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    const { sessionId, levelIndex } = req.body;

    if (!sessionId) {
      return res.status(400).json({ message: 'Session ID is required' });
    }

    if (levelIndex === undefined || levelIndex === null) {
      return res.status(400).json({ message: 'Level index is required' });
    }

    // Get the blind structure from file
    const blindStructure = getBlindStructure();
    
    if (!blindStructure) {
      return res.status(404).json({ message: 'Blind structure not found' });
    }

    // Validate level index
    if (levelIndex < 0 || levelIndex >= blindStructure.levels.length) {
      return res.status(400).json({ 
        message: `Invalid level index. Must be between 0 and ${blindStructure.levels.length - 1}` 
      });
    }

    // Update the session with the new level index
    const updatedSession = await prisma.pokerSession.update({
      where: { id: sessionId },
      data: {
        currentBlindLevel: levelIndex,
        levelStartTime: new Date() // Reset the level start time
      }
    });

    return res.status(200).json({
      message: 'Blind level updated successfully',
      session: updatedSession,
      levelIndex
    });
  } catch (error) {
    console.error('Error updating blind level:', error);
    return res.status(500).json({ 
      message: 'Failed to update blind level', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
} 