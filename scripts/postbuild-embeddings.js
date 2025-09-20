/**
 * Postbuild Script: Generate Vector Embeddings
 * Runs automatically after Vercel build to ensure embeddings are up-to-date
 */

const { PrismaClient } = require('@prisma/client');

// Skip in development or if explicitly disabled
if (process.env.NODE_ENV === 'development' || process.env.SKIP_EMBEDDINGS === 'true') {
  console.log('⏭️  Skipping embedding generation (development mode or SKIP_EMBEDDINGS=true)');
  process.exit(0);
}

const prisma = new PrismaClient();

async function generateEmbeddings() {
  try {
    console.log('🚀 Starting postbuild embedding generation (v5 - removed all track-embedding imports)...');

    // Check if we have required API keys
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      console.warn('⚠️  Missing API keys for embeddings. Skipping generation.');
      console.warn('   Set PINECONE_API_KEY and OPENAI_API_KEY in Vercel environment variables.');
      // Don't fail the build, just skip
      return;
    }

    // Check if we have a database connection
    if (!process.env.DATABASE_URL) {
      console.warn('⚠️  No DATABASE_URL found. Skipping embedding generation.');
      return;
    }

    console.log('✅ Environment check passed');

    // Dynamic import of vector-db module
    const { upsertSessionVectors, getOrCreateIndex } = await import('../lib/vector-db.ts');

    // Initialize Pinecone index
    console.log('📦 Initializing Pinecone index...');
    await getOrCreateIndex();

    // Fetch all sessions with speakers
    console.log('📚 Fetching sessions from database...');
    const sessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    if (sessions.length === 0) {
      console.log('ℹ️  No sessions found in database. Skipping embedding generation.');
      return;
    }

    console.log(`Found ${sessions.length} sessions to process`);

    // Generate embeddings in batches to avoid timeout
    console.log('🔄 Generating embeddings...');
    const batchSize = 10; // Smaller batches for production
    let processed = 0;

    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      try {
        await upsertSessionVectors(batch);
        processed += batch.length;
        console.log(`  ✓ Processed ${processed}/${sessions.length} sessions`);
      } catch (error) {
        console.error(`  ⚠️  Error processing batch ${i / batchSize + 1}:`, error.message);
        // Continue with next batch even if one fails
      }
    }

    console.log(`✅ Successfully generated embeddings for ${processed} sessions!`);

  } catch (error) {
    console.error('❌ Error in postbuild embeddings:', error);
    // Don't fail the build
    console.log('⚠️  Continuing build despite embedding generation error');
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateEmbeddings()
  .then(() => {
    console.log('📊 Postbuild embedding generation complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Postbuild script error:', error);
    // Don't fail the build
    process.exit(0);
  });