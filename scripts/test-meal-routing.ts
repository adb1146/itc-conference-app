#!/usr/bin/env npx tsx

/**
 * Test script for meal query routing
 * Verifies that meal queries are properly routed and return conference meal sessions
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { enhancedSessionSearch } from '../lib/enhanced-session-search';
import prisma from '../lib/db';

async function testMealRouting() {
  console.log('🍽️  Testing Meal Query Routing\n');
  console.log('=' .repeat(80));

  // Test queries that should trigger meal routing
  const mealQueries = [
    'what about lunch?',
    'when is breakfast?',
    'lunch options',
    'dinner sessions',
    'what meals are included?',
    'any food during the conference?',
    'coffee breaks'
  ];

  for (const query of mealQueries) {
    console.log(`\n📝 Query: "${query}"`);
    console.log('-'.repeat(60));

    try {
      const result = await enhancedSessionSearch(query, 5);

      console.log(`✅ Search Method: ${result.searchMethod}`);
      console.log(`✅ Query Type: ${result.queryType}`);
      console.log(`✅ Is Meal Query: ${result.isMealQuery ? 'YES' : 'NO'}`);
      console.log(`✅ Results Found: ${result.totalFound}`);

      if (result.sessions.length > 0) {
        console.log('\n🍽️  Top Results:');
        result.sessions.slice(0, 3).forEach((session, index) => {
          console.log(`\n${index + 1}. ${session.title}`);
          console.log(`   Location: ${session.location}`);
          console.log(`   Time: ${new Date(session.startTime).toLocaleString()}`);

          // Check if this is actually a meal session
          const isMealSession = ['breakfast', 'lunch', 'dinner', 'meal', 'reception', 'coffee'].some(
            keyword => session.title.toLowerCase().includes(keyword) ||
                     session.description?.toLowerCase().includes(keyword)
          );

          console.log(`   Is Meal Session: ${isMealSession ? '✅ YES' : '❌ NO'}`);
        });
      } else {
        console.log('⚠️  No results found');
      }

    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Test Summary:\n');

  // Verify meal sessions exist in database
  const mealSessions = await prisma.session.findMany({
    where: {
      OR: [
        { title: { contains: 'lunch', mode: 'insensitive' } },
        { title: { contains: 'breakfast', mode: 'insensitive' } },
        { title: { contains: 'dinner', mode: 'insensitive' } },
        { title: { contains: 'meal', mode: 'insensitive' } },
        { title: { contains: 'reception', mode: 'insensitive' } },
        { description: { contains: 'lunch', mode: 'insensitive' } },
        { description: { contains: 'breakfast', mode: 'insensitive' } },
        { description: { contains: 'dinner', mode: 'insensitive' } }
      ]
    }
  });

  console.log(`Total meal sessions in database: ${mealSessions.length}`);

  if (mealSessions.length > 0) {
    console.log('\nSample meal sessions:');
    mealSessions.slice(0, 5).forEach(session => {
      console.log(`  • ${session.title} - ${session.location}`);
    });
  }

  // Test non-meal queries to ensure they don't trigger meal routing
  console.log('\n' + '='.repeat(80));
  console.log('\n🔍 Testing Non-Meal Queries (Should NOT trigger meal routing):\n');

  const nonMealQueries = [
    'AI and machine learning',
    'keynote speakers',
    'innovation sessions'
  ];

  for (const query of nonMealQueries) {
    const result = await enhancedSessionSearch(query, 3);
    console.log(`Query: "${query}" - Is Meal Query: ${result.isMealQuery ? '❌ YES (WRONG!)' : '✅ NO (CORRECT)'}`);
  }

  console.log('\n✅ Meal Query Routing Test Complete!');

  await prisma.$disconnect();
}

// Run the test
testMealRouting().catch(console.error);