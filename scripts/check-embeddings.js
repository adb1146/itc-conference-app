const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEmbeddings() {
  console.log('=== Checking Embedding Status ===\n');

  try {
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' }
    });

    const withEmbeddings = sessions.filter(s => s.embedding && s.embedding.length > 0);
    const withoutEmbeddings = sessions.filter(s => !s.embedding || s.embedding.length === 0);

    console.log('Current Status:');
    console.log(`  Total sessions: ${sessions.length}`);
    console.log(`  ✅ With embeddings: ${withEmbeddings.length}`);
    console.log(`  ❌ Without embeddings: ${withoutEmbeddings.length}`);
    console.log(`  Coverage: ${((withEmbeddings.length / sessions.length) * 100).toFixed(1)}%\n`);

    if (withoutEmbeddings.length > 0) {
      console.log('Sessions missing embeddings (showing first 20):');
      withoutEmbeddings.slice(0, 20).forEach(s => {
        const date = new Date(s.startTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        console.log(`  - [${date}] ${s.title.substring(0, 50)}...`);
      });

      if (withoutEmbeddings.length > 20) {
        console.log(`  ... and ${withoutEmbeddings.length - 20} more\n`);
      }
    }

    // Check if embeddings need updating due to date changes
    if (withEmbeddings.length > 0) {
      console.log('\nSample sessions with embeddings:');
      withEmbeddings.slice(0, 5).forEach(s => {
        const date = new Date(s.startTime).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric'
        });
        console.log(`  ✓ [${date}] ${s.title.substring(0, 50)}...`);
      });
    }

    // Recommendation
    console.log('\n=== Recommendation ===');
    if (withoutEmbeddings.length === 0) {
      console.log('✅ All sessions have embeddings!');
    } else if (withoutEmbeddings.length === sessions.length) {
      console.log('⚠️  No sessions have embeddings. Run: npm run generate-embeddings');
    } else {
      console.log('⚠️  Some sessions are missing embeddings.');
      console.log('   Since we updated dates/data, it\'s recommended to regenerate ALL embeddings.');
      console.log('   Run: DATABASE_URL="postgresql://postgres:postgres@localhost:5442/itc_dev" node scripts/generate-embeddings.js');
    }

  } catch (error) {
    console.error('Error checking embeddings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEmbeddings();