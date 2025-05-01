import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth-utils';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

/**
 * API route to run migrations and seed tournament structures
 * Only accessible by admin users
 */
export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Method not allowed' });
  }

  try {
    // Ensure user is authenticated as admin
    const session = await getServerSession(req, res, authOptions);
    if (!session || session.role !== 'ADMIN') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Check if we have tables
    let hasBlindStructureTable = true;
    try {
      // Try to check for BlindStructure table by querying it
      await prisma.$executeRaw`SELECT 1 FROM "BlindStructure" LIMIT 1`;
    } catch (error) {
      hasBlindStructureTable = false;
      console.log('BlindStructure table not found, will create it');
    }

    // Array to track the actions taken
    const actions = [];

    // Create tables if they don't exist
    if (!hasBlindStructureTable) {
      try {
        // Execute SQL to create tables
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "BlindStructure" (
            "id" TEXT NOT NULL,
            "name" TEXT NOT NULL,
            "description" TEXT,
            "startingStack" INTEGER NOT NULL,
            "isDefault" BOOLEAN NOT NULL DEFAULT false,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            CONSTRAINT "BlindStructure_pkey" PRIMARY KEY ("id")
          );
        `;
        
        await prisma.$executeRaw`
          CREATE TABLE IF NOT EXISTS "BlindLevel" (
            "id" TEXT NOT NULL,
            "level" INTEGER NOT NULL,
            "duration" INTEGER NOT NULL,
            "smallBlind" INTEGER,
            "bigBlind" INTEGER,
            "ante" INTEGER,
            "isBreak" BOOLEAN NOT NULL DEFAULT false,
            "breakName" TEXT,
            "specialAction" TEXT,
            "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" TIMESTAMP(3) NOT NULL,
            "structureId" TEXT NOT NULL,
            CONSTRAINT "BlindLevel_pkey" PRIMARY KEY ("id")
          );
        `;
        
        await prisma.$executeRaw`
          ALTER TABLE IF EXISTS "BlindLevel" 
          ADD CONSTRAINT IF NOT EXISTS "BlindLevel_structureId_fkey" 
          FOREIGN KEY ("structureId") 
          REFERENCES "BlindStructure"("id") 
          ON DELETE RESTRICT ON UPDATE CASCADE;
        `;
        
        actions.push('Created BlindStructure and BlindLevel tables');
      } catch (error) {
        console.error('Error creating tables:', error);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to create tournament tables', 
          error: error.message 
        });
      }
    }

    // Check if we need to populate the blind structure
    let needsBlindStructure = true;
    try {
      const existingStructures = await prisma.blindStructure.findMany({
        take: 1
      });
      
      if (existingStructures.length > 0) {
        needsBlindStructure = false;
        actions.push('Found existing blind structure, skipping creation');
      }
    } catch (error) {
      console.log('Error checking for existing blind structures, will try to create:', error);
    }

    // Create blind structure if needed
    if (needsBlindStructure) {
      try {
        // Read blindStructure.json
        const dataPath = path.join(process.cwd(), 'data', 'blindStructure.json');
        
        if (fs.existsSync(dataPath)) {
          const fileData = fs.readFileSync(dataPath, 'utf8');
          const blindStructureData = JSON.parse(fileData);
          
          // Create blind structure in database
          const blindStructure = await prisma.blindStructure.create({
            data: {
              name: blindStructureData.name,
              description: blindStructureData.description,
              startingStack: blindStructureData.startingStack,
              isDefault: blindStructureData.isDefault,
              levels: {
                create: blindStructureData.levels.map(level => ({
                  level: level.level,
                  duration: level.duration,
                  smallBlind: level.smallBlind,
                  bigBlind: level.bigBlind,
                  ante: level.ante,
                  isBreak: level.isBreak,
                  breakName: level.breakName,
                  specialAction: level.specialAction
                }))
              }
            }
          });
          
          actions.push(`Created blind structure: ${blindStructure.name}`);
        } else {
          actions.push('blindStructure.json not found, skipping blind structure creation');
        }
      } catch (error) {
        console.error('Error creating blind structure:', error);
        actions.push(`Error creating blind structure: ${error.message}`);
      }
    }

    // Check if we need to create payout structures
    let needsPayoutStructures = true;
    try {
      const existingPayoutStructures = await prisma.payoutStructure.findMany({
        take: 1
      });
      
      if (existingPayoutStructures.length > 0) {
        needsPayoutStructures = false;
        actions.push('Found existing payout structures, skipping creation');
      }
    } catch (error) {
      console.log('Error checking for existing payout structures, will try to create:', error);
    }

    // Create payout structures if needed
    if (needsPayoutStructures) {
      try {
        // Read payoutStructures.json
        const dataPath = path.join(process.cwd(), 'data', 'payoutStructures.json');
        
        if (fs.existsSync(dataPath)) {
          const fileData = fs.readFileSync(dataPath, 'utf8');
          const payoutStructuresData = JSON.parse(fileData);
          
          // Create payout structures in database
          for (const structure of payoutStructuresData) {
            const { name, minEntries, maxEntries, tiers } = structure;
            
            await prisma.payoutStructure.create({
              data: {
                name,
                minEntries,
                maxEntries,
                tiers: {
                  create: tiers
                }
              }
            });
            
            actions.push(`Created payout structure: ${name}`);
          }
        } else {
          actions.push('payoutStructures.json not found, skipping payout structure creation');
        }
      } catch (error) {
        console.error('Error creating payout structures:', error);
        actions.push(`Error creating payout structures: ${error.message}`);
      }
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Database setup completed',
      actions
    });
  } catch (error) {
    console.error('Error setting up database:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to set up database', 
      error: error.message
    });
  }
} 