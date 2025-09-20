#!/usr/bin/env npx tsx

/**
 * Test script for intent classification and routing
 * Tests that agenda queries route to Smart Agenda and meal queries to session search
 */

import { detectToolIntent } from '../lib/chat-tool-detector';
import { LocalRecommendationsAgent } from '../lib/agents/local-recommendations-agent';

const testCases = [
  // Smart Agenda test cases
  { query: "Help me build an agenda", expectedTool: 'agenda_builder', expectedLocal: false },
  { query: "Can you help me create a schedule?", expectedTool: 'agenda_builder', expectedLocal: false },
  { query: "What sessions should I attend?", expectedTool: 'agenda_builder', expectedLocal: false },
  { query: "Make me a personalized schedule", expectedTool: 'agenda_builder', expectedLocal: false },
  { query: "Build my conference plan", expectedTool: 'agenda_builder', expectedLocal: false },
  { query: "I need help planning my day", expectedTool: 'agenda_builder', expectedLocal: false },

  // Meal query test cases (should NOT be local)
  { query: "When is lunch?", expectedTool: 'session_search', expectedLocal: false },
  { query: "Where is lunch?", expectedTool: 'session_search', expectedLocal: false },
  { query: "Where to get lunch", expectedTool: 'session_search', expectedLocal: false },
  { query: "What lunch options do I have?", expectedTool: 'session_search', expectedLocal: false },
  { query: "When is breakfast today?", expectedTool: 'session_search', expectedLocal: false },
  { query: "Where is dinner?", expectedTool: 'session_search', expectedLocal: false },
  { query: "Lunch session times", expectedTool: 'session_search', expectedLocal: false },

  // Local restaurant queries (should be local)
  { query: "Best restaurant nearby?", expectedTool: 'local_recommendations', expectedLocal: true },
  { query: "Any good bars at Mandalay Bay?", expectedTool: 'local_recommendations', expectedLocal: true },
  { query: "Where can I eat outside the conference?", expectedTool: 'local_recommendations', expectedLocal: true },
  { query: "Mandalay Bay restaurant recommendations", expectedTool: 'local_recommendations', expectedLocal: true },

  // Information queries (not agenda building)
  { query: "What sessions are happening today?", expectedTool: 'session_search', expectedLocal: false },
  { query: "Show me AI sessions", expectedTool: 'session_search', expectedLocal: false },
  { query: "When is the keynote?", expectedTool: 'session_search', expectedLocal: false }
];

console.log('🧪 Testing Intent Classification and Routing\n');
console.log('=' .repeat(80));

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  console.log(`\nTest ${index + 1}: "${testCase.query}"`);
  console.log('-'.repeat(60));

  // Test tool detection
  const toolResult = detectToolIntent(testCase.query);
  const toolType = toolResult.shouldUseTool ? toolResult.toolType : 'session_search';
  const toolPass = toolType === testCase.expectedTool;

  // Test local query detection
  const isLocal = LocalRecommendationsAgent.isLocalQuery(testCase.query);
  const localPass = isLocal === testCase.expectedLocal;

  // Overall pass/fail
  const passed = toolPass && localPass;

  console.log(`Expected Tool: ${testCase.expectedTool}`);
  console.log(`Detected Tool: ${toolType} ${toolPass ? '✅' : '❌'}`);
  console.log(`Expected Local: ${testCase.expectedLocal}`);
  console.log(`Detected Local: ${isLocal} ${localPass ? '✅' : '❌'}`);

  if (toolResult.reason) {
    console.log(`Reason: ${toolResult.reason}`);
  }

  if (passed) {
    console.log(`Result: ✅ PASSED`);
    passCount++;
  } else {
    console.log(`Result: ❌ FAILED`);
    failCount++;
  }
});

console.log('\n' + '='.repeat(80));
console.log(`\n📊 Test Results: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('🎉 All tests passed!');
  process.exit(0);
} else {
  console.log('⚠️  Some tests failed. Please review the routing logic.');
  process.exit(1);
}