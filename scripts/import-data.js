/**
 * Import data from a JSON export file into the database
 * Usage: DATABASE_URL="postgresql://..." node scripts/import-data.js [filename]
 * 
 * By default, imports from data/exports/latest-export.json
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function importData(filename = null) {
  console.log('🚀 Starting database import...');
  
  try {
    // Determine which file to import
    const exportsDir = path.join(process.cwd(), 'data', 'exports');
    const filepath = filename 
      ? path.join(exportsDir, filename)
      : path.join(exportsDir, 'latest-export.json');
    
    console.log(`📁 Reading from: ${filepath}`);
    
    // Read and parse the export file
    const fileContent = await fs.readFile(filepath, 'utf-8');
    const exportData = JSON.parse(fileContent);
    
    console.log(`📊 Export metadata:`);
    console.log(`  - Exported at: ${exportData.metadata.exportedAt}`);
    console.log(`  - Version: ${exportData.metadata.version}`);
    console.log(`  - Counts:`, exportData.metadata.counts);
    
    // Ask for confirmation before clearing existing data
    if (process.env.CLEAR_EXISTING !== 'false') {
      console.log('\n⚠️  WARNING: This will clear existing data in the database!');
      console.log('   Set CLEAR_EXISTING=false to preserve existing data');
      console.log('   Proceeding with data clear...\n');
      
      // Clear existing data in correct order (respect foreign keys)
      console.log('🗑️  Clearing existing data...');
      await prisma.favorite.deleteMany({});
      await prisma.sessionSpeaker.deleteMany({});
      await prisma.session.deleteMany({});
      await prisma.speaker.deleteMany({});
      await prisma.user.deleteMany({});
      console.log('✅ Existing data cleared');
    }
    
    // Import data in correct order
    console.log('\n📥 Starting import...');
    
    // 1. Import Speakers
    if (exportData.data.speakers && exportData.data.speakers.length > 0) {
      console.log(`  Importing ${exportData.data.speakers.length} speakers...`);
      for (const speaker of exportData.data.speakers) {
        await prisma.speaker.create({
          data: {
            ...speaker,
            lastProfileSync: speaker.lastProfileSync ? new Date(speaker.lastProfileSync) : null
          }
        });
      }
      console.log('  ✅ Speakers imported');
    }
    
    // 2. Import Sessions
    if (exportData.data.sessions && exportData.data.sessions.length > 0) {
      console.log(`  Importing ${exportData.data.sessions.length} sessions...`);
      for (const session of exportData.data.sessions) {
        await prisma.session.create({
          data: {
            ...session,
            startTime: session.startTime ? new Date(session.startTime) : null,
            endTime: session.endTime ? new Date(session.endTime) : null
          }
        });
      }
      console.log('  ✅ Sessions imported');
    }
    
    // 3. Import SessionSpeakers (relationships)
    if (exportData.data.sessionSpeakers && exportData.data.sessionSpeakers.length > 0) {
      console.log(`  Importing ${exportData.data.sessionSpeakers.length} session-speaker relationships...`);
      for (const sessionSpeaker of exportData.data.sessionSpeakers) {
        await prisma.sessionSpeaker.create({
          data: sessionSpeaker
        });
      }
      console.log('  ✅ Session-Speaker relationships imported');
    }
    
    // 4. Import Users (if any)
    if (exportData.data.users && exportData.data.users.length > 0) {
      console.log(`  Importing ${exportData.data.users.length} users...`);
      for (const user of exportData.data.users) {
        await prisma.user.create({
          data: {
            ...user,
            createdAt: user.createdAt ? new Date(user.createdAt) : new Date(),
            updatedAt: user.updatedAt ? new Date(user.updatedAt) : new Date()
          }
        });
      }
      console.log('  ✅ Users imported');
    }
    
    // 5. Import Favorites (if any)
    if (exportData.data.favorites && exportData.data.favorites.length > 0) {
      console.log(`  Importing ${exportData.data.favorites.length} favorites...`);
      for (const favorite of exportData.data.favorites) {
        await prisma.favorite.create({
          data: {
            ...favorite,
            createdAt: favorite.createdAt ? new Date(favorite.createdAt) : new Date()
          }
        });
      }
      console.log('  ✅ Favorites imported');
    }
    
    // Verify the import
    console.log('\n📊 Verifying import...');
    const counts = {
      speakers: await prisma.speaker.count(),
      sessions: await prisma.session.count(),
      sessionSpeakers: await prisma.sessionSpeaker.count(),
      users: await prisma.user.count(),
      favorites: await prisma.favorite.count()
    };
    
    console.log('  Current database counts:');
    console.log(`    - Speakers: ${counts.speakers}`);
    console.log(`    - Sessions: ${counts.sessions}`);
    console.log(`    - Session-Speakers: ${counts.sessionSpeakers}`);
    console.log(`    - Users: ${counts.users}`);
    console.log(`    - Favorites: ${counts.favorites}`);
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
if (require.main === module) {
  const filename = process.argv[2] || null;
  
  importData(filename)
    .then(() => {
      console.log('\n✅ Import process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Import process failed:', error);
      process.exit(1);
    });
}

module.exports = { importData };