#!/usr/bin/env npx tsx

/**
 * Script to populate the dedicated meal vector database namespace
 * Creates enhanced embeddings for meal and food-related sessions
 */

import prisma from '../lib/db';
import { upsertMealVectors } from '../lib/vector-db';

async function populateMealVectors() {
  try {
    console.log('🍽️ Populating Meal Vector Database\n');
    console.log('=' .repeat(60));

    // Get all sessions from database
    const sessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    // Filter for meal-related sessions
    const mealSessions = sessions.filter(session => {
      const text = (session.title + ' ' + (session.description || '')).toLowerCase();
      return text.includes('lunch') || text.includes('breakfast') ||
             text.includes('dinner') || text.includes('reception') ||
             text.includes('meal') || text.includes('food') ||
             text.includes('networking lunch') || text.includes('coffee break');
    });

    console.log(`\nFound ${mealSessions.length} meal-related sessions out of ${sessions.length} total sessions\n`);

    if (mealSessions.length === 0) {
      console.log('No meal sessions found. Exiting.');
      return;
    }

    // Display meal sessions that will be indexed
    console.log('Meal sessions to be indexed:');
    console.log('-'.repeat(60));
    mealSessions.forEach(session => {
      const titleLower = session.title?.toLowerCase() || '';
      let mealType = 'other';

      if (titleLower.includes('breakfast')) mealType = 'breakfast';
      else if (titleLower.includes('lunch')) mealType = 'lunch';
      else if (titleLower.includes('dinner')) mealType = 'dinner';
      else if (titleLower.includes('reception')) mealType = 'reception';
      else if (titleLower.includes('coffee')) mealType = 'coffee break';

      console.log(`• [${mealType}] ${session.title}`);
      if (session.location) console.log(`  📍 ${session.location}`);
      if (session.startTime) console.log(`  🕐 ${new Date(session.startTime).toLocaleString()}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('\nUpserting meal vectors to Pinecone...\n');

    // Upsert meal vectors
    await upsertMealVectors(mealSessions);

    console.log('\n✅ Successfully populated meal vector database!');
    console.log('\nMeal queries will now return these sessions with enhanced accuracy.');

  } catch (error) {
    console.error('❌ Error populating meal vectors:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
populateMealVectors();