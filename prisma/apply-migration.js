const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

async function applyMigration() {
  try {
    console.log('Starting direct database migration process...');
    
    // Read the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '20250501000000_add_blind_structure_tables', 'migration.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('Read migration SQL file successfully');
    console.log('Applying migration SQL directly to database...');
    
    // Execute the SQL directly
    await prisma.$executeRawUnsafe(migrationSQL);
    
    console.log('Migration applied successfully');
    console.log('\nNow running seed to populate tournament structures...');
    
    // Require and run the seed-structures script
    require('./seed-structures');
    
  } catch (error) {
    console.error('Error applying migration:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
applyMigration(); 