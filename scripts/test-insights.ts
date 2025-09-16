#!/usr/bin/env npx tsx

import { generateIntelligentAgenda } from '../lib/tools/schedule/intelligent-agenda-builder';

async function testAgendaWithInsights() {
  console.log('\n🧪 Testing Intelligent Agenda Generation with Insights\n');

  // Test user ID (you can adjust this)
  const testUserId = 'cm4ihn4el0000137vvnbh0bvu';

  try {
    console.log('📊 Generating agenda for user:', testUserId);
    const result = await generateIntelligentAgenda(testUserId, {});

    if (result.success && result.agenda) {
      console.log('\n✅ Agenda generated successfully!\n');

      // Check for insights
      if (result.agenda.insights) {
        console.log('🎯 AI INSIGHTS FOUND:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        const insights = result.agenda.insights;

        console.log('\n📍 Personalized For:');
        console.log(`   • Role: ${insights.personalizedFor.role}`);
        console.log(`   • Company: ${insights.personalizedFor.company}`);
        console.log(`   • Interests: ${insights.personalizedFor.interests.join(', ')}`);

        console.log('\n🎯 Primary Focus Areas:');
        insights.primaryFocus.forEach(focus => {
          console.log(`   • ${focus}`);
        });

        console.log('\n📋 Optimization Strategy:');
        console.log(`   ${insights.optimizationStrategy}`);

        console.log('\n🔑 Key Selection Reasons:');
        insights.keyReasons.forEach(reason => {
          console.log(`   • ${reason}`);
        });

        console.log('\n📊 Statistics:');
        console.log(`   • Sessions Analyzed: ${insights.stats.totalSessionsAnalyzed}`);
        console.log(`   • Interest Matches: ${insights.stats.matchingInterests}`);
        console.log(`   • Networking Opportunities: ${insights.stats.networkingOpportunities}`);
        console.log(`   • Expert Speakers: ${insights.stats.expertSpeakers}`);

        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

        // Show sample sessions with match scores
        console.log('\n📅 Sample Sessions with Match Scores:');
        const sampleSessions = result.agenda.days[0]?.schedule.slice(0, 3) || [];
        sampleSessions.forEach((session, idx) => {
          if (session.type === 'session') {
            console.log(`\n   ${idx + 1}. ${session.item.title}`);
            console.log(`      Score: ${session.matchScore || 'N/A'}`);
            console.log(`      Reasons: ${session.matchReasons?.join(', ') || 'N/A'}`);
          }
        });

      } else {
        console.log('\n⚠️  WARNING: No insights found in agenda!');
        console.log('   This indicates the insights generation is not working properly.');
      }

      console.log('\n📈 Agenda Metrics:');
      console.log(`   • Total Sessions: ${result.agenda.metrics.totalSessions}`);
      console.log(`   • Favorites Included: ${result.agenda.metrics.favoritesIncluded}`);
      console.log(`   • AI Suggestions: ${result.agenda.metrics.aiSuggestionsAdded}`);

    } else {
      console.error('\n❌ Failed to generate agenda:', result.error);
    }
  } catch (error) {
    console.error('\n❌ Error testing agenda generation:', error);
  }

  process.exit(0);
}

testAgendaWithInsights();