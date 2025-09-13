/**
 * Generate Vector Embeddings for All Sessions
 * This script creates embeddings and stores them in Pinecone
 */

const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

// We'll use dynamic imports for ES modules
async function generateEmbeddings() {
  try {
    console.log('🚀 Starting embedding generation...');
    
    // Dynamic import of vector-db module (TypeScript)
    const { upsertSessionVectors, getOrCreateIndex } = await import('../lib/vector-db.ts');
    
    // Check if we have API keys
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      console.error('❌ Missing API keys. Please set PINECONE_API_KEY and OPENAI_API_KEY in .env');
      return;
    }
    
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
    
    console.log(`Found ${sessions.length} sessions to process`);
    
    // Generate and store embeddings
    console.log('🔄 Generating embeddings and storing in Pinecone...');
    await upsertSessionVectors(sessions);
    
    console.log('✅ Successfully generated embeddings for all sessions!');
    
  } catch (error) {
    console.error('❌ Error generating embeddings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateEmbeddings();