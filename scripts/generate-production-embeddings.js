/**
 * Generate Vector Embeddings for Production Database
 * This script creates embeddings and stores them in Pinecone
 *
 * Usage:
 * 1. Set environment variables (or use .env.production.local)
 * 2. Run: DATABASE_URL="your-production-db-url" node scripts/generate-production-embeddings.js
 */

const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');
const path = require('path');

// Load production environment variables
config({ path: path.resolve(__dirname, '../.env.production.local') });

// Override with command line DATABASE_URL if provided
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is required. Please provide production database URL.');
  console.log('Usage: DATABASE_URL="your-production-db-url" node scripts/generate-production-embeddings.js');
  process.exit(1);
}

// Create Prisma client with production database
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl
    }
  }
});

async function generateProductionEmbeddings() {
  try {
    console.log('🚀 Starting production embedding generation...');
    console.log('📊 Database:', databaseUrl.split('@')[1]?.split('/')[0] || 'Production');

    // Check if we have API keys
    if (!process.env.PINECONE_API_KEY) {
      console.error('❌ Missing PINECONE_API_KEY in environment');
      process.exit(1);
    }

    if (!process.env.OPENAI_API_KEY) {
      console.error('❌ Missing OPENAI_API_KEY in environment');
      process.exit(1);
    }

    console.log('✅ API keys found');

    // Dynamic import of vector-db module
    const { upsertSessionVectors, getOrCreateIndex } = await import('../lib/vector-db.ts');

    // Initialize Pinecone index
    console.log('📦 Initializing Pinecone index...');
    await getOrCreateIndex();

    // Fetch all sessions with speakers
    console.log('📚 Fetching sessions from production database...');
    const sessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    console.log(`Found ${sessions.length} sessions to process`);

    if (sessions.length === 0) {
      console.warn('⚠️  No sessions found in database. Please ensure data is loaded first.');
      return;
    }

    // Show sample of sessions to be processed
    console.log('\nSample sessions:');
    sessions.slice(0, 3).forEach(session => {
      console.log(`  - ${session.title}`);
    });

    // Generate and store embeddings in batches
    console.log('\n🔄 Generating embeddings and storing in Pinecone...');
    const batchSize = 20;
    for (let i = 0; i < sessions.length; i += batchSize) {
      const batch = sessions.slice(i, i + batchSize);
      await upsertSessionVectors(batch);
      console.log(`  ✓ Processed ${Math.min(i + batchSize, sessions.length)}/${sessions.length} sessions`);
    }

    console.log('\n✅ Successfully generated embeddings for all production sessions!');
    console.log('🎉 Your AI concierge should now be able to answer questions about sessions and speakers.');

  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
    if (error.message?.includes('API key')) {
      console.log('\n💡 Tip: Make sure your API keys are set in Vercel environment variables');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateProductionEmbeddings();