#!/usr/bin/env npx tsx
/**
 * Test script for AI Intent Classifier
 * Tests various user messages to ensure correct intent classification
 */

import { classifyUserIntent } from '../lib/ai-intent-classifier';

// Test scenarios to validate intent classification
const testScenarios = [
  // Information seeking (should NOT trigger agents)
  { message: "What's happening this morning?", expectedIntent: 'information_seeking' },
  { message: "Who are the keynote speakers?", expectedIntent: 'information_seeking' },
  { message: "What sessions are about AI?", expectedIntent: 'information_seeking' },
  { message: "Tell me about cybersecurity sessions", expectedIntent: 'information_seeking' },

  // Agenda building (explicit requests only)
  { message: "Build me an agenda", expectedIntent: 'agenda_building' },
  { message: "Create my personalized schedule", expectedIntent: 'agenda_building' },
  { message: "Can you make me an itinerary?", expectedIntent: 'agenda_building' },

  // Profile research (explicit requests only)
  { message: "Research my LinkedIn profile", expectedIntent: 'profile_research' },
  { message: "Look up my professional background", expectedIntent: 'profile_research' },

  // Greetings (should NOT trigger profile research)
  { message: "Hi, I'm John Smith from Acme Corp", expectedIntent: 'greeting' },
  { message: "Hello, my name is Sarah", expectedIntent: 'greeting' },

  // Local recommendations
  { message: "Where can I get good coffee?", expectedIntent: 'local_recommendations' },
  { message: "Any good restaurants nearby?", expectedIntent: 'local_recommendations' },
  { message: "What bars are at Mandalay Bay?", expectedIntent: 'local_recommendations' },

  // Practical needs
  { message: "I'm exhausted", expectedIntent: 'practical_need' },
  { message: "I'm hungry", expectedIntent: 'practical_need' },
  { message: "Where can I charge my phone?", expectedIntent: 'practical_need' },
  { message: "I need coffee", expectedIntent: 'practical_need' },
  { message: "What's the WiFi password?", expectedIntent: 'practical_need' },

  // Emotional support
  { message: "This is overwhelming", expectedIntent: 'emotional_support' },
  { message: "I'm feeling anxious about networking", expectedIntent: 'emotional_support' },
  { message: "I'm bored", expectedIntent: 'emotional_support' },

  // Navigation help
  { message: "I'm lost", expectedIntent: 'navigation_help' },
  { message: "How do I get to the Expo Floor?", expectedIntent: 'navigation_help' },
  { message: "Where's the main stage?", expectedIntent: 'navigation_help' },

  // Social planning
  { message: "What parties are tonight?", expectedIntent: 'social_planning' },
  { message: "Where's the opening reception?", expectedIntent: 'social_planning' },
  { message: "Any networking events this evening?", expectedIntent: 'social_planning' },
  { message: "Where's the action tonight?", expectedIntent: 'social_planning' },

  // Preference setting
  { message: "I'm interested in AI and cybersecurity", expectedIntent: 'preference_setting' },
  { message: "I'm a product manager attending all three days", expectedIntent: 'preference_setting' },
];

async function runTests() {
  console.log('🧪 Testing AI Intent Classifier\n');
  console.log('=' .repeat(80));

  let passed = 0;
  let failed = 0;

  for (const scenario of testScenarios) {
    try {
      const result = await classifyUserIntent(scenario.message);

      const success = result.primary_intent === scenario.expectedIntent;
      const symbol = success ? '✅' : '❌';

      if (success) {
        passed++;
      } else {
        failed++;
      }

      console.log(`\n${symbol} Message: "${scenario.message}"`);
      console.log(`   Expected: ${scenario.expectedIntent}`);
      console.log(`   Got: ${result.primary_intent} (confidence: ${result.confidence.toFixed(2)})`);
      console.log(`   Action: ${result.suggested_action}`);

      if (result.reasoning) {
        console.log(`   Reasoning: ${result.reasoning}`);
      }

      if (!success) {
        console.log(`   ⚠️  MISMATCH - Intent classification needs adjustment`);
      }

    } catch (error) {
      failed++;
      console.log(`\n❌ Message: "${scenario.message}"`);
      console.log(`   Error: ${error.message}`);
    }
  }

  console.log('\n' + '=' .repeat(80));
  console.log(`\n📊 Results: ${passed} passed, ${failed} failed out of ${testScenarios.length} tests`);

  if (failed === 0) {
    console.log('🎉 All tests passed! Intent classification is working correctly.');
  } else {
    console.log(`⚠️  ${failed} tests failed. Review the AI classifier prompt or fallback logic.`);
  }
}

// Run the tests
runTests().catch(console.error);