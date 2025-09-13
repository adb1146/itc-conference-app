/**
 * Generate Local Vector Embeddings for All Sessions
 * This script creates embeddings using local hash-based vectors (no API required)
 */

const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

// We'll use dynamic imports for ES modules
async function generateLocalEmbeddings() {
  try {
    console.log('🚀 Starting local embedding generation (no API keys required)...');
    
    // Dynamic import of local vector db module
    const { upsertSessionsToLocalDB, localVectorDB } = await import('../lib/local-vector-db.ts');
    
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
    
    // Clear existing vectors
    localVectorDB.clear();
    console.log('🧹 Cleared existing local vectors');
    
    // Generate and store embeddings locally
    console.log('🔄 Generating local embeddings...');
    const result = await upsertSessionsToLocalDB(sessions);
    
    console.log('✅ Successfully generated local embeddings!');
    console.log(`📊 Created ${result.upserted} vectors`);
    
    // Get statistics
    const stats = localVectorDB.getStats();
    console.log(`💾 Memory usage: ${Math.round(stats.memoryUsage / 1024)} KB`);
    
    // Test a sample search
    console.log('\n🔍 Testing search functionality...');
    const testResults = await localVectorDB.hybridSearch('AI and machine learning', ['AI', 'ML'], 5);
    console.log(`Found ${testResults.length} results for test query`);
    if (testResults.length > 0) {
      console.log('Top result:', testResults[0].metadata.title);
    }
    
  } catch (error) {
    console.error('❌ Error generating local embeddings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateLocalEmbeddings();