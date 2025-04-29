const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Delete existing data
  await prisma.payoutTier.deleteMany();
  await prisma.payoutStructure.deleteMany();

  // Create payout structures
  const structures = [
    {
      name: '3-6 Players',
      minEntries: 3,
      maxEntries: 6,
      tiers: [
        { position: 1, percentage: 65 },
        { position: 2, percentage: 35 }
      ]
    },
    {
      name: '7-9 Players',
      minEntries: 7,
      maxEntries: 9,
      tiers: [
        { position: 1, percentage: 50 },
        { position: 2, percentage: 30 },
        { position: 3, percentage: 20 }
      ]
    },
    {
      name: '10-19 Players',
      minEntries: 10,
      maxEntries: 19,
      tiers: [
        { position: 1, percentage: 45 },
        { position: 2, percentage: 27 },
        { position: 3, percentage: 18 },
        { position: 4, percentage: 10 }
      ]
    },
    {
      name: '20-29 Players',
      minEntries: 20,
      maxEntries: 29,
      tiers: [
        { position: 1, percentage: 42 },
        { position: 2, percentage: 25 },
        { position: 3, percentage: 16 },
        { position: 4, percentage: 10 },
        { position: 5, percentage: 7 }
      ]
    },
    {
      name: '30-39 Players',
      minEntries: 30,
      maxEntries: 39,
      tiers: [
        { position: 1, percentage: 40 },
        { position: 2, percentage: 23 },
        { position: 3, percentage: 15 },
        { position: 4, percentage: 10 },
        { position: 5, percentage: 7 },
        { position: 6, percentage: 5 }
      ]
    },
    {
      name: '40+ Players',
      minEntries: 40,
      maxEntries: 100,
      tiers: [
        { position: 1, percentage: 35 },
        { position: 2, percentage: 20 },
        { position: 3, percentage: 14 },
        { position: 4, percentage: 10 },
        { position: 5, percentage: 8 },
        { position: 6, percentage: 6 },
        { position: 7, percentage: 4 },
        { position: 8, percentage: 3 }
      ]
    }
  ];

  // Create each structure with its tiers
  for (const structure of structures) {
    const { tiers, ...structureData } = structure;
    
    const createdStructure = await prisma.payoutStructure.create({
      data: {
        ...structureData,
        tiers: {
          create: tiers
        }
      }
    });
    
    console.log(`Created payout structure: ${createdStructure.name}`);
  }

  console.log('Seeding completed');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 