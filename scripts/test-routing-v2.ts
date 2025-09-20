#!/usr/bin/env npx tsx

/**
 * Test script for enhanced intent classification and routing
 * Tests the distinction between direct agenda building vs recommendations
 */

import { detectToolIntent } from '../lib/chat-tool-detector';
import { LocalRecommendationsAgent } from '../lib/agents/local-recommendations-agent';
import { enhancedSessionSearch } from '../lib/enhanced-session-search';

const testCases = [
  // DIRECT Smart Agenda test cases (should go straight to builder)
  { query: "Help me build an agenda", expectedTool: 'agenda_builder', expectedLocal: false, type: 'Direct Agenda' },
  { query: "Create my schedule", expectedTool: 'agenda_builder', expectedLocal: false, type: 'Direct Agenda' },
  { query: "Build me a personalized agenda", expectedTool: 'agenda_builder', expectedLocal: false, type: 'Direct Agenda' },
  { query: "Generate my conference plan", expectedTool: 'agenda_builder', expectedLocal: false, type: 'Direct Agenda' },
  { query: "Make me a personalized schedule", expectedTool: 'agenda_builder', expectedLocal: false, type: 'Direct Agenda' },

  // Session RECOMMENDATION cases (should show sessions + offer agenda builder)
  { query: "What sessions should I attend?", expectedTool: 'session_recommendations', expectedLocal: false, type: 'Recommendations' },
  { query: "Recommend sessions for me", expectedTool: 'session_recommendations', expectedLocal: false, type: 'Recommendations' },
  { query: "What talks are good?", expectedTool: 'session_recommendations', expectedLocal: false, type: 'Recommendations' },
  { query: "Suggest sessions for AI", expectedTool: 'session_recommendations', expectedLocal: false, type: 'Recommendations' },
  { query: "Which sessions should I go to?", expectedTool: 'session_recommendations', expectedLocal: false, type: 'Recommendations' },

  // Meal query test cases (should NOT be local)
  { query: "When is lunch?", expectedTool: 'session_search', expectedLocal: false, type: 'Meal Query' },
  { query: "Where is lunch?", expectedTool: 'session_search', expectedLocal: false, type: 'Meal Query' },
  { query: "What lunch options do I have?", expectedTool: 'session_search', expectedLocal: false, type: 'Meal Query' },
  { query: "When is breakfast today?", expectedTool: 'session_search', expectedLocal: false, type: 'Meal Query' },

  // Local restaurant queries (should be local)
  { query: "Best restaurant nearby?", expectedTool: 'local_recommendations', expectedLocal: true, type: 'Local Dining' },
  { query: "Any good bars at Mandalay Bay?", expectedTool: 'local_recommendations', expectedLocal: true, type: 'Local Dining' },

  // Information queries (regular session search)
  { query: "What sessions are happening today?", expectedTool: 'session_search', expectedLocal: false, type: 'Information' },
  { query: "Show me AI sessions", expectedTool: 'session_search', expectedLocal: false, type: 'Information' },
  { query: "When is the keynote?", expectedTool: 'session_search', expectedLocal: false, type: 'Information' }
];

console.log('🧪 Testing Enhanced Intent Classification and Routing\n');
console.log('=' .repeat(80));

let passCount = 0;
let failCount = 0;

// Group tests by type
const groupedTests = testCases.reduce((acc, test) => {
  if (!acc[test.type]) acc[test.type] = [];
  acc[test.type].push(test);
  return acc;
}, {} as Record<string, typeof testCases>);

for (const [type, tests] of Object.entries(groupedTests)) {
  console.log(`\n📋 ${type} Tests:`);
  console.log('-'.repeat(60));

  for (const testCase of tests) {
    // Test tool detection
    const toolResult = detectToolIntent(testCase.query);
    const toolType = toolResult.shouldUseTool ? toolResult.toolType : toolResult.toolType;
    const toolPass = toolType === testCase.expectedTool;

    // Test local query detection
    const isLocal = LocalRecommendationsAgent.isLocalQuery(testCase.query);
    const localPass = isLocal === testCase.expectedLocal;

    // Overall pass/fail
    const passed = toolPass && localPass;

    console.log(`\n"${testCase.query}"`);
    console.log(`  Tool: ${toolType} ${toolPass ? '✅' : `❌ (expected ${testCase.expectedTool})`}`);
    console.log(`  Local: ${isLocal} ${localPass ? '✅' : `❌ (expected ${testCase.expectedLocal})`}`);
    console.log(`  Reason: ${toolResult.reason}`);

    if (passed) {
      passCount++;
    } else {
      failCount++;
    }
  }
}

// Test enhanced session search with recommendation detection
async function testEnhancedSearch() {
  console.log('\n📋 Enhanced Search with Agenda Builder Offers:');
  console.log('-'.repeat(60));

  const recommendationQueries = [
    "What sessions should I attend?",
    "Recommend sessions for me"
  ];

  for (const query of recommendationQueries) {
    console.log(`\nTesting: "${query}"`);
    const searchResult = await enhancedSessionSearch(query, 3);
    console.log(`  Is Recommendation: ${searchResult.isRecommendationQuery ? '✅' : '❌'}`);
    console.log(`  Has Offer: ${searchResult.agendaBuilderOffer ? '✅' : '❌'}`);
    if (searchResult.agendaBuilderOffer) {
      console.log(`  Offer Preview: "${searchResult.agendaBuilderOffer.substring(0, 50)}..."`);
    }
  }
}

testEnhancedSearch().then(() => {
  console.log('\n' + '='.repeat(80));
  console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);

  if (failCount === 0) {
    console.log('🎉 All routing tests passed!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the routing logic.');
    process.exit(1);
  }
});