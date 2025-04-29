const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // First check if we already have a default blind structure
  const existingStructure = await prisma.blindStructure.findFirst({
    where: {
      isDefault: true
    }
  });

  if (existingStructure) {
    console.log('Default blind structure already exists, skipping seed.');
    return;
  }

  // Create the default blind structure
  const defaultStructure = await prisma.blindStructure.create({
    data: {
      name: 'Default Structure',
      description: 'Standard blind structure for our tournaments',
      startingStack: 300, // 300 chips as per requirements
      isDefault: true,
    }
  });

  console.log('Created default blind structure:', defaultStructure.id);

  // Create the blind levels
  const blindLevels = [
    // Regular levels
    { level: 1, duration: 20, smallBlind: 1, bigBlind: 2, ante: 2, isBreak: false },
    { level: 2, duration: 20, smallBlind: 1, bigBlind: 3, ante: 3, isBreak: false },
    { level: 3, duration: 20, smallBlind: 2, bigBlind: 4, ante: 4, isBreak: false },
    { level: 4, duration: 20, smallBlind: 3, bigBlind: 6, ante: 6, isBreak: false },
    
    // First break (B1) - will chip up 1s
    { level: 5, duration: 10, smallBlind: null, bigBlind: null, ante: null, isBreak: true, breakName: 'B1', specialAction: 'CHIP_UP_1S' },
    
    // Continue with regular levels
    { level: 6, duration: 20, smallBlind: 5, bigBlind: 10, ante: 10, isBreak: false },
    { level: 7, duration: 20, smallBlind: 10, bigBlind: 15, ante: 15, isBreak: false },
    { level: 8, duration: 20, smallBlind: 10, bigBlind: 20, ante: 20, isBreak: false },
    { level: 9, duration: 20, smallBlind: 15, bigBlind: 30, ante: 30, isBreak: false },
    
    // Second break (B2) - registration closes
    { level: 10, duration: 10, smallBlind: null, bigBlind: null, ante: null, isBreak: true, breakName: 'B2', specialAction: 'REG_CLOSE' },
    
    // Continue with regular levels
    { level: 11, duration: 20, smallBlind: 25, bigBlind: 50, ante: 50, isBreak: false },
    { level: 12, duration: 20, smallBlind: 25, bigBlind: 75, ante: 75, isBreak: false },
    { level: 13, duration: 20, smallBlind: 50, bigBlind: 100, ante: 100, isBreak: false },
    { level: 14, duration: 20, smallBlind: 75, bigBlind: 150, ante: 150, isBreak: false },
    
    // Third break (B3)
    { level: 15, duration: 10, smallBlind: null, bigBlind: null, ante: null, isBreak: true, breakName: 'B3' },
    
    // Continue with regular levels
    { level: 16, duration: 20, smallBlind: 100, bigBlind: 200, ante: 200, isBreak: false },
    { level: 17, duration: 20, smallBlind: 150, bigBlind: 300, ante: 300, isBreak: false },
    { level: 18, duration: 20, smallBlind: 200, bigBlind: 400, ante: 400, isBreak: false },
    { level: 19, duration: 20, smallBlind: 300, bigBlind: 600, ante: 600, isBreak: false },
  ];

  // Create all blind levels
  for (const level of blindLevels) {
    await prisma.blindLevel.create({
      data: {
        ...level,
        structureId: defaultStructure.id
      }
    });
  }

  console.log(`Created ${blindLevels.length} blind levels`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 