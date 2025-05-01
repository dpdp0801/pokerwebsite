const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

/**
 * Script to set up tournament structures in the database
 * This will:
 * 1. Run prisma migrations if needed
 * 2. Seed the database with blind structures
 * 3. Seed the database with payout structures
 */

console.log('=== Setting up tournament structures ===');

try {
  console.log('\n1. Running Prisma migrations to ensure database schema is updated');
  // Run migrate deploy to apply migrations without prompts
  execSync('npx prisma migrate deploy', { stdio: 'inherit' });
  
  console.log('\n2. Generating Prisma client');
  execSync('npx prisma generate', { stdio: 'inherit' });
  
  console.log('\n3. Seeding database with tournament structures');
  // Run the seed-structures script
  execSync('node prisma/seed-structures.js', { stdio: 'inherit' });
  
  console.log('\n=== Tournament structures setup complete ===');
  console.log('You can now start or restart your application.');
} catch (error) {
  console.error('\nError setting up tournament structures:', error.message);
  process.exit(1);
} 