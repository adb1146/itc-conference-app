/**
 * Setup a test database for import testing
 * This creates a new database and runs migrations
 */

const { execSync } = require('child_process');
const { PrismaClient } = require('@prisma/client');

async function setupTestDatabase() {
  console.log('🔧 Setting up test database...\n');
  
  // Connect to default postgres database to create new database
  const adminPrisma = new PrismaClient({
    datasources: {
      db: {
        url: 'postgresql://postgres:postgres@localhost:5442/postgres'
      }
    }
  });

  try {
    // Drop test database if it exists
    console.log('🗑️  Dropping existing test database if it exists...');
    try {
      await adminPrisma.$executeRawUnsafe('DROP DATABASE IF EXISTS itc_test');
      console.log('✅ Old test database dropped');
    } catch (error) {
      console.log('ℹ️  No existing test database to drop');
    }

    // Create new test database
    console.log('📦 Creating new test database...');
    await adminPrisma.$executeRawUnsafe('CREATE DATABASE itc_test');
    console.log('✅ Test database created: itc_test');

    await adminPrisma.$disconnect();

    // Run Prisma migrations on the test database
    console.log('\n🔄 Running Prisma migrations on test database...');
    const testDbUrl = 'postgresql://postgres:postgres@localhost:5442/itc_test';
    
    execSync(`DATABASE_URL="${testDbUrl}" npx prisma db push --skip-generate`, {
      stdio: 'inherit'
    });

    console.log('\n✅ Test database setup complete!');
    console.log('📝 Connection string: postgresql://postgres:postgres@localhost:5442/itc_test');
    console.log('\n🚀 You can now test the import with:');
    console.log('   DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_test" node scripts/import-data.js');

  } catch (error) {
    console.error('❌ Error setting up test database:', error);
    throw error;
  } finally {
    await adminPrisma.$disconnect();
  }
}

// Run setup
if (require.main === module) {
  setupTestDatabase()
    .then(() => {
      console.log('\n✅ Setup completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Setup failed:', error);
      process.exit(1);
    });
}

module.exports = { setupTestDatabase };