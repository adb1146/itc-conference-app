/**
 * Enhanced Embedding Generation Script
 * Generates embeddings for both tracks and sessions with improved context
 */

import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import path from 'path';
import {
  generateTrackEmbeddings,
  upsertTrackEmbeddings,
  buildTrackSimilarityMatrix
} from '../lib/track-embeddings';
import { upsertSessionVectors, getOrCreateIndex } from '../lib/vector-db';

// Load environment variables
config({ path: path.resolve(__dirname, '../.env.local') });

const prisma = new PrismaClient();

async function generateEnhancedEmbeddings() {
  try {
    console.log('🚀 Starting enhanced embedding generation...');
    console.log('================================================');

    // Check API keys
    if (!process.env.PINECONE_API_KEY || !process.env.OPENAI_API_KEY) {
      console.error('❌ Missing API keys. Please set PINECONE_API_KEY and OPENAI_API_KEY in .env.local');
      return;
    }

    // Initialize Pinecone index
    console.log('\n📦 Initializing Pinecone index...');
    await getOrCreateIndex();

    // Step 1: Generate and store track embeddings
    console.log('\n🎯 Step 1: Generating track embeddings...');
    console.log('----------------------------------------');
    const trackEmbeddings = await generateTrackEmbeddings();
    console.log(`✅ Generated embeddings for ${trackEmbeddings.size} tracks`);

    console.log('\n📤 Uploading track embeddings to Pinecone...');
    const trackUploadSuccess = await upsertTrackEmbeddings(trackEmbeddings);
    if (trackUploadSuccess) {
      console.log('✅ Track embeddings uploaded successfully');
    } else {
      console.log('⚠️  Some track embeddings failed to upload');
    }

    // Step 2: Build track similarity matrix
    console.log('\n🔗 Step 2: Building track similarity matrix...');
    console.log('--------------------------------------------');
    const similarityMatrix = await buildTrackSimilarityMatrix(trackEmbeddings);

    // Display some interesting relationships
    console.log('\n📊 Sample track relationships:');
    const sampleTracks = ['Innovation Track', 'Technology Track', 'Claims Track'];
    for (const track of sampleTracks) {
      const similarities = similarityMatrix.get(track);
      if (similarities) {
        const topRelated = Array.from(similarities.entries())
          .filter(([t, _]) => t !== track)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3);
        console.log(`\n${track}:`);
        topRelated.forEach(([relatedTrack, score]) => {
          console.log(`  → ${relatedTrack}: ${(score * 100).toFixed(1)}% similar`);
        });
      }
    }

    // Step 3: Generate enhanced session embeddings
    console.log('\n🎬 Step 3: Generating enhanced session embeddings...');
    console.log('--------------------------------------------------');

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

    // Generate and store embeddings with enhanced track context
    console.log('🔄 Generating embeddings with track context...');
    await upsertSessionVectors(sessions);

    console.log('\n✅ Successfully generated enhanced embeddings!');

    // Step 4: Display statistics
    console.log('\n📈 Embedding Statistics:');
    console.log('========================');
    console.log(`• Total tracks embedded: ${trackEmbeddings.size}`);
    console.log(`• Total sessions embedded: ${sessions.length}`);

    // Count sessions per track
    const trackCounts = new Map<string, number>();
    sessions.forEach(session => {
      if (session.track) {
        trackCounts.set(session.track, (trackCounts.get(session.track) || 0) + 1);
      }
    });

    console.log('\n📊 Sessions per track:');
    const sortedTracks = Array.from(trackCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    sortedTracks.forEach(([track, count]) => {
      console.log(`  • ${track}: ${count} sessions`);
    });

    // Step 5: Test hallucination prevention
    console.log('\n🧪 Testing hallucination prevention...');
    console.log('--------------------------------------');
    const { validateTrackQuery } = await import('../lib/track-embeddings');

    const testQueries = [
      'Tell me about the AI & Innovation Track',
      'What sessions are in the Innovation Track?',
      'Show me Data & Analytics Track sessions'
    ];

    for (const query of testQueries) {
      const validation = await validateTrackQuery(query);
      if (!validation.isValid) {
        console.log(`❌ "${query}"`);
        console.log(`   → ${validation.error}`);
      } else {
        console.log(`✅ "${query}" - Valid`);
      }
    }

    console.log('\n🎉 Enhanced embedding generation complete!');
    console.log('==========================================');
    console.log('\n💡 Benefits of enhanced embeddings:');
    console.log('• Track-aware semantic search');
    console.log('• Hallucination prevention for non-existent tracks');
    console.log('• Better session clustering by track');
    console.log('• Improved relevance scoring');

  } catch (error) {
    console.error('❌ Error generating enhanced embeddings:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
generateEnhancedEmbeddings();