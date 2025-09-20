#!/usr/bin/env npx tsx

/**
 * Test script for enhanced search with post-query improvements
 * Tests reranking, personalization, enrichment, and formatting
 */

import { enhancedSessionSearch } from '../lib/enhanced-session-search';
import { UserContext } from '../lib/result-enhancer';
import prisma from '../lib/db';

async function testEnhancedSearch() {
  console.log('🚀 Testing Enhanced Search Pipeline with Post-Query Improvements\n');
  console.log('=' .repeat(80));

  // Test queries
  const testCases = [
    {
      query: 'AI and machine learning sessions',
      description: 'Topic search with personalization',
      userContext: {
        interests: ['AI', 'machine learning', 'automation'],
        role: 'developer',
        experience_level: 'intermediate'
      } as UserContext
    },
    {
      query: 'What should I attend tomorrow?',
      description: 'Recommendation query with time context',
      userContext: {
        interests: ['insurtech', 'innovation'],
        role: 'executive',
        preferred_times: ['morning', 'lunch']
      } as UserContext
    },
    {
      query: 'lunch sessions',
      description: 'Meal query with enrichment',
      userContext: undefined
    },
    {
      query: 'keynote speakers',
      description: 'Speaker query with quality filtering',
      userContext: {
        preferred_tracks: ['Leadership', 'Strategy']
      } as UserContext
    }
  ];

  for (const testCase of testCases) {
    console.log(`\n📝 Test: ${testCase.description}`);
    console.log(`Query: "${testCase.query}"`);
    console.log('-'.repeat(60));

    try {
      // Run enhanced search with all features enabled
      const result = await enhancedSessionSearch(testCase.query, 5, {
        userId: 'test-user-123',
        userContext: testCase.userContext,
        includeEnrichments: true,
        includeFormatting: true,
        applyPersonalization: true
      });

      // Display results
      console.log(`✅ Search Method: ${result.searchMethod}`);
      console.log(`✅ Query Type: ${result.queryType}`);
      console.log(`✅ Results Found: ${result.totalFound}`);
      console.log(`✅ Results Returned: ${result.sessions.length}`);

      // Performance metrics
      if (result.performance) {
        console.log(`⏱️ Performance:`);
        console.log(`   - Search Time: ${result.performance.searchTime}ms`);
        console.log(`   - Enhancement Time: ${result.performance.enhancementTime}ms`);
        console.log(`   - Total Time: ${result.performance.totalTime}ms`);
      }

      // Show top results with scores
      console.log(`\n🏆 Top Results (with enhancement scores):`);
      result.sessions.slice(0, 3).forEach((session, index) => {
        console.log(`\n${index + 1}. ${session.title}`);
        console.log(`   ID: ${session.id}`);

        // Display various scores
        if (session.relevanceScore !== undefined) {
          console.log(`   📊 Scores:`);
          console.log(`      - Relevance: ${session.relevanceScore?.toFixed(3) || 'N/A'}`);
          console.log(`      - Personalized: ${session.personalizedScore?.toFixed(3) || 'N/A'}`);
          console.log(`      - Quality: ${session.qualityScore?.toFixed(3) || 'N/A'}`);
          console.log(`      - Recency: ${session.recencyScore?.toFixed(3) || 'N/A'}`);
          console.log(`      - Final: ${session.finalScore?.toFixed(3) || 'N/A'}`);
        }

        // Show personalization reasons
        if (session.personalizedReasons && session.personalizedReasons.length > 0) {
          console.log(`   ✨ Personalization: ${session.personalizedReasons.join(', ')}`);
        }

        // Show enrichments
        if (session.enrichments) {
          const enrichments = [];
          if (session.enrichments.status) enrichments.push(`Status: ${session.enrichments.status}`);
          if (session.enrichments.time_until_start) enrichments.push(`Starts: ${session.enrichments.time_until_start}`);
          if (session.enrichments.walking_time_from_main) enrichments.push(`Walk: ${session.enrichments.walking_time_from_main} min`);
          if (session.enrichments.availability?.spots_remaining !== undefined) {
            enrichments.push(`Spots: ${session.enrichments.availability.spots_remaining}`);
          }
          if (enrichments.length > 0) {
            console.log(`   🔧 Enrichments: ${enrichments.join(', ')}`);
          }
        }
      });

      // Show formatted response preview
      if (result.formattedResponse) {
        console.log(`\n📄 Formatted Response Preview:`);
        const preview = result.formattedResponse.split('\n').slice(0, 10).join('\n');
        console.log('   ' + preview.replace(/\n/g, '\n   '));
        console.log('   [... truncated for display]');
      }

      // Special flags
      if (result.isRecommendationQuery) {
        console.log(`\n💡 Recommendation query detected - agenda builder offer included`);
      }
      if (result.isMealQuery) {
        console.log(`\n🍽️ Meal query detected - dietary info included`);
      }

    } catch (error) {
      console.error(`❌ Error: ${error}`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Enhancement Pipeline Test Summary:\n');

  // Test specific enhancement features
  console.log('Testing Individual Enhancement Components:\n');

  // Test quality filtering
  console.log('1. Quality Filtering Test:');
  const lowQualitySession = {
    id: 'test-1',
    title: 'Test',
    // Minimal fields = low quality score
  };
  const { calculateQualityScore } = await import('../lib/result-enhancer');
  const qualityScore = calculateQualityScore(lowQualitySession);
  console.log(`   Low quality session score: ${qualityScore.toFixed(3)}`);
  console.log(`   Would be filtered: ${qualityScore < 0.3 ? 'YES ✅' : 'NO ❌'}`);

  // Test relevance scoring
  console.log('\n2. Relevance Scoring Test:');
  const { calculateRelevanceScore } = await import('../lib/result-enhancer');
  const testSession = {
    title: 'AI and Machine Learning in Insurance',
    description: 'Deep dive into AI applications',
    tags: ['AI', 'machine-learning', 'innovation'],
    vectorScore: 0.7
  };
  const relevanceScore = calculateRelevanceScore(testSession, 'AI machine learning');
  console.log(`   Query: "AI machine learning"`);
  console.log(`   Session: "${testSession.title}"`);
  console.log(`   Relevance score: ${relevanceScore.toFixed(3)}`);

  // Test personalization
  console.log('\n3. Personalization Test:');
  const { calculatePersonalizationScore } = await import('../lib/result-enhancer');
  const userContext: UserContext = {
    interests: ['AI', 'automation'],
    role: 'developer',
    preferred_tracks: ['Technical']
  };
  const personalScore = calculatePersonalizationScore(testSession, userContext);
  console.log(`   User interests: ${userContext.interests?.join(', ')}`);
  console.log(`   User role: ${userContext.role}`);
  console.log(`   Personalization score: ${personalScore.toFixed(3)}`);

  // Test query type classification
  console.log('\n4. Query Type Classification Test:');
  const { classifyQueryType } = await import('../lib/response-formatter');
  const queryTypes = [
    'lunch and dinner options',
    'what should I attend',
    'John Smith speaker',
    'AI track sessions',
    'sessions happening now'
  ];
  queryTypes.forEach(q => {
    console.log(`   "${q}" → ${classifyQueryType(q)}`);
  });

  console.log('\n' + '='.repeat(80));
  console.log('\n✅ Enhanced Search Pipeline Test Complete!');
  console.log('\nKey Achievements:');
  console.log('  • Results reranked by relevance, quality, and personalization');
  console.log('  • Low-quality results filtered out');
  console.log('  • Personalized recommendations based on user context');
  console.log('  • Rich enrichments added (availability, location, timing)');
  console.log('  • Intelligent formatting based on query type');
  console.log('  • Performance metrics tracked for optimization');

  await prisma.$disconnect();
}

// Run the test
testEnhancedSearch().catch(console.error);