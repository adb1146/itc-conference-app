/**
 * Export all data from the database to a JSON file
 * Usage: DATABASE_URL="postgresql://..." node scripts/export-data.js
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs').promises;
const path = require('path');

const prisma = new PrismaClient();

async function exportData() {
  console.log('🚀 Starting database export...');
  
  try {
    // Fetch all data from each table
    console.log('📊 Fetching data from database...');
    
    const [speakers, sessions, sessionSpeakers, users, favorites] = await Promise.all([
      prisma.speaker.findMany({
        orderBy: { name: 'asc' }
      }),
      prisma.session.findMany({
        orderBy: { startTime: 'asc' }
      }),
      prisma.sessionSpeaker.findMany(),
      prisma.user.findMany({
        select: {
          id: true,
          email: true,
          name: true,
          password: true, // We'll keep hashed passwords
          role: true,
          company: true,
          interests: true,
          goals: true,
          isAdmin: true,
          organizationType: true,
          usingSalesforce: true,
          interestedInSalesforce: true,
          createdAt: true,
          updatedAt: true
        }
      }),
      prisma.favorite.findMany()
    ]);

    // Create export object
    const exportData = {
      metadata: {
        exportedAt: new Date().toISOString(),
        counts: {
          speakers: speakers.length,
          sessions: sessions.length,
          sessionSpeakers: sessionSpeakers.length,
          users: users.length,
          favorites: favorites.length
        },
        version: '1.0'
      },
      data: {
        speakers,
        sessions,
        sessionSpeakers,
        users,
        favorites
      }
    };

    // Create exports directory if it doesn't exist
    const exportsDir = path.join(process.cwd(), 'data', 'exports');
    await fs.mkdir(exportsDir, { recursive: true });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `database-export-${timestamp}.json`;
    const filepath = path.join(exportsDir, filename);

    // Write to file
    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));

    console.log('✅ Export completed successfully!');
    console.log(`📁 File saved to: ${filepath}`);
    console.log('\n📊 Export summary:');
    console.log(`  - Speakers: ${speakers.length}`);
    console.log(`  - Sessions: ${sessions.length}`);
    console.log(`  - Session-Speaker mappings: ${sessionSpeakers.length}`);
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Favorites: ${favorites.length}`);
    
    // Also create a 'latest' symlink for easy access
    const latestPath = path.join(exportsDir, 'latest-export.json');
    try {
      await fs.unlink(latestPath).catch(() => {}); // Remove old symlink if exists
      await fs.writeFile(latestPath, JSON.stringify(exportData, null, 2));
      console.log(`\n📌 Latest export also saved to: ${latestPath}`);
    } catch (err) {
      // Symlink creation might fail on some systems, that's ok
    }

    return filepath;
  } catch (error) {
    console.error('❌ Export failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the export
if (require.main === module) {
  exportData()
    .then(() => {
      console.log('\n✅ Export process completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Export process failed:', error);
      process.exit(1);
    });
}

module.exports = { exportData };