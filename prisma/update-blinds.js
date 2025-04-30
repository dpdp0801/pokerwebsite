const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Get all levels
    const allLevels = await prisma.blindLevel.findMany({
      orderBy: {
        level: 'asc'
      }
    });

    console.log(`Found ${allLevels.length} blind levels`);

    // First, identify all breaks and non-breaks
    const breaks = allLevels.filter(level => level.isBreak);
    const regularLevels = allLevels.filter(level => !level.isBreak);

    console.log(`Found ${breaks.length} breaks and ${regularLevels.length} regular levels`);

    // Re-number regular levels (1, 2, 3, 4, etc.)
    let regularLevelNumber = 1;
    for (const level of regularLevels) {
      await prisma.blindLevel.update({
        where: { id: level.id },
        data: { level: regularLevelNumber++ }
      });
      console.log(`Updated regular level to ${regularLevelNumber-1}`);
    }

    // Update breaks to have level 0 (since null is not allowed)
    for (const breakLevel of breaks) {
      await prisma.blindLevel.update({
        where: { id: breakLevel.id },
        data: { level: 0 }
      });
      console.log(`Updated break level to 0`);
    }

    // Find the second break and add "Chip up 5s" text
    if (breaks.length >= 2) {
      // Sort breaks to find the second one
      const sortedBreaks = [...breaks].sort((a, b) => 
        a.id.localeCompare(b.id) // Use ID or another reliable field for sorting
      );
      const secondBreak = sortedBreaks[1];
      
      if (secondBreak) {
        // Update the special action for the second break
        await prisma.blindLevel.update({
          where: { id: secondBreak.id },
          data: {
            specialAction: secondBreak.specialAction === 'REG_CLOSE' 
              ? 'REG_CLOSE_CHIP_UP_5S' // Create a new special action type or use a combination
              : 'CHIP_UP_5S'
          }
        });
        console.log(`Added CHIP_UP_5S to the second break (${secondBreak.breakName})`);
      }
    }

    console.log('Blind levels updated successfully');
  } catch (error) {
    console.error('Error updating blind levels:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  }); 