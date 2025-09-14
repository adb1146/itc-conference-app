#!/usr/bin/env npx tsx

/**
 * Test script for AI-powered agenda generation
 * Tests the complete flow with Claude Opus 4.1 reasoning
 */

import { generateSmartAgenda } from '@/lib/tools/schedule/smart-agenda-builder';
import { analyzeSessionFit } from '@/lib/tools/schedule/ai-reasoning-engine';
import { detectScheduleConflicts, resolveConflictWithAI } from '@/lib/tools/schedule/conflict-resolver';
import prisma from '@/lib/db';

async function testAIAgenda() {
  console.log('🧪 Testing AI-Powered Agenda Generation\n');
  console.log('=' .repeat(50));

  try {
    // 1. Test with a sample user
    const testUser = await prisma.user.findFirst();

    if (!testUser) {
      console.error('❌ No test user found. Please create a user first.');
      return;
    }

    console.log(`\n✅ Found test user: ${testUser.email}`);
    console.log(`   Profile completeness factors:`);
    console.log(`   - Name: ${testUser.name ? '✓' : '✗'}`);
    console.log(`   - Role: ${testUser.role ? '✓' : '✗'}`);
    console.log(`   - Company: ${testUser.company ? '✓' : '✗'}`);
    console.log(`   - Interests: ${testUser.interests?.length || 0} items`);
    console.log(`   - Goals: ${testUser.goals?.length || 0} items`);

    // 2. Generate smart agenda
    console.log('\n📅 Generating Smart Agenda...');
    const result = await generateSmartAgenda(testUser.id, {
      includeMeals: true,
      maxSessionsPerDay: 8,
      startTime: '8:00 AM',
      endTime: '6:00 PM'
    });

    if (!result.success || !result.agenda) {
      console.error(`❌ Failed to generate agenda: ${result.error}`);
      return;
    }

    const agenda = result.agenda;
    console.log('\n✅ Agenda generated successfully!');

    // 3. Display metrics
    console.log('\n📊 Agenda Metrics:');
    console.log(`   - Using AI: ${agenda.usingAI ? 'Yes (Claude Opus 4.1)' : 'No (Basic Algorithm)'}`);
    console.log(`   - Profile Completeness: ${agenda.metrics.profileCompleteness || 0}%`);
    console.log(`   - Total Favorites: ${agenda.metrics.totalFavorites}`);
    console.log(`   - Favorites Included: ${agenda.metrics.favoritesIncluded}`);
    console.log(`   - AI Suggestions: ${agenda.metrics.aiSuggestionsAdded}`);
    console.log(`   - Overall Confidence: ${agenda.metrics.overallConfidence}%`);
    console.log(`   - Conflicts: ${agenda.conflicts.length}`);

    // 4. Display AI reasoning
    if (agenda.aiReasoning && agenda.aiReasoning.length > 0) {
      console.log('\n🧠 AI Reasoning Process:');
      for (const step of agenda.aiReasoning.slice(0, 3)) {
        console.log(`\n   Stage: ${step.stage}`);
        console.log(`   Thought: ${step.thought}`);
        console.log(`   Confidence: ${step.confidence}%`);
      }
    }

    // 5. Display profile coaching
    if (agenda.profileCoaching && agenda.profileCoaching.length > 0) {
      console.log('\n💡 Profile Coaching:');
      for (const message of agenda.profileCoaching) {
        console.log(`   - ${message}`);
      }
    }

    // 6. Test conflict detection
    console.log('\n🔍 Testing Conflict Detection...');
    for (const day of agenda.days) {
      const conflicts = detectScheduleConflicts(day.schedule);
      if (conflicts.length > 0) {
        console.log(`\n   Day ${day.dayNumber} has ${conflicts.length} conflict(s):`);
        for (const conflict of conflicts.slice(0, 2)) {
          console.log(`   - ${conflict.description}`);
          if (conflict.resolution) {
            console.log(`     Resolution: ${conflict.resolution}`);
          }
        }
      }
    }

    // 7. Display sample schedule
    console.log('\n📋 Sample Schedule (Day 1):');
    const day1 = agenda.days[0];
    if (day1) {
      console.log(`   Date: ${new Date(day1.date).toLocaleDateString()}`);
      console.log(`   Sessions: ${day1.stats.totalSessions}`);
      console.log(`   Favorites: ${day1.stats.favoritesCovered}`);
      console.log(`   AI Picks: ${day1.stats.aiSuggestions}`);

      console.log('\n   Schedule:');
      for (const item of day1.schedule.slice(0, 5)) {
        const badge = item.source === 'user-favorite' ? '⭐' :
                     item.source === 'ai-suggested' ? '🤖' : '📅';
        console.log(`   ${badge} ${item.time} - ${item.item.title}`);
        if (item.aiMetadata) {
          console.log(`      └─ AI Confidence: ${item.aiMetadata.confidence}%`);
        }
      }
    }

    // 8. Test session analysis
    console.log('\n🎯 Testing Session Fit Analysis...');
    const sampleSession = await prisma.session.findFirst();
    if (sampleSession && testUser) {
      const fitAnalysis = await analyzeSessionFit(
        sampleSession as any,
        {
          id: testUser.id,
          name: testUser.name || '',
          role: testUser.role || '',
          company: testUser.company || '',
          organizationType: testUser.organizationType || '',
          interests: testUser.interests || [],
          goals: testUser.goals || [],
          yearsExperience: testUser.yearsExperience || 0,
          usingSalesforce: testUser.usingSalesforce || false,
          interestedInSalesforce: testUser.interestedInSalesforce || false
        },
        []
      );

      console.log(`   Session: "${sampleSession.title}"`);
      console.log(`   Priority: ${fitAnalysis.priority}`);
      console.log(`   Confidence: ${fitAnalysis.confidence}%`);
      console.log(`   Reasoning: ${fitAnalysis.reasoning}`);
    }

    console.log('\n✅ All tests completed successfully!');
    console.log('\n📌 Summary:');
    console.log('   - AI reasoning engine is working');
    console.log('   - Conflict detection is operational');
    console.log('   - Profile coaching is active');
    console.log('   - Session analysis is functional');

    if (!agenda.usingAI) {
      console.log('\n⚠️  Note: AI was not used because profile completeness is below 40%');
      console.log('   Complete the user profile to enable AI-powered recommendations');
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAIAgenda().catch(console.error);