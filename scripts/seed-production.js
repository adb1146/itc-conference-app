// Production database seeding script
// Run this after deployment to populate the database with initial data

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Starting production database seed...');
  
  try {
    // Check if database is empty
    const sessionCount = await prisma.session.count();
    
    if (sessionCount > 0) {
      console.log(`Database already has ${sessionCount} sessions. Skipping seed.`);
      return;
    }
    
    console.log('Database is empty. Run the import-fetched-agenda.js script to populate it.');
    console.log('Example: node scripts/import-fetched-agenda.js');
    
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });