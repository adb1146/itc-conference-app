#!/usr/bin/env npx tsx
/**
 * Test script for contextual schedule offer system
 * Demonstrates how the chatbot softly offers personalized schedule building
 */

import { detectScheduleOfferOpportunity, generateContextualScheduleOffer, isAcceptingScheduleOffer } from '../lib/schedule-offer-detector';

console.log('🗓️ Testing Contextual Schedule Offer System\n');
console.log('=' .repeat(80));

// Test scenarios
const scenarios = [
  {
    name: 'User asking about AI sessions',
    message: 'What AI sessions are happening on Day 1?',
    conversationHistory: [],
    assistantResponse: 'Here are the top AI sessions on Day 1:\n1. [AI in Underwriting](/agenda/session/123)\n2. [Machine Learning for Claims](/agenda/session/124)\n3. [Future of AI in Insurance](/agenda/session/125)',
    hasAgenda: false
  },
  {
    name: 'User discussing specific interests',
    message: 'I\'m really interested in blockchain and fraud detection',
    conversationHistory: [
      { role: 'user', content: 'What sessions should I attend?' },
      { role: 'assistant', content: 'Let me help you find relevant sessions...' }
    ],
    assistantResponse: 'Great topics! Here are sessions on blockchain and fraud...',
    hasAgenda: false
  },
  {
    name: 'User browsing without clear intent',
    message: 'Tell me about the keynote speakers',
    conversationHistory: [],
    assistantResponse: 'The keynote speakers include industry leaders...',
    hasAgenda: false
  },
  {
    name: 'User with existing agenda',
    message: 'What else should I see related to AI?',
    conversationHistory: [],
    assistantResponse: 'Based on your interests, check out these AI sessions...',
    hasAgenda: true
  },
  {
    name: 'User asking "what should I attend"',
    message: 'What sessions should I attend on Tuesday?',
    conversationHistory: [],
    assistantResponse: 'For Tuesday (Day 1), here are key sessions to consider...',
    hasAgenda: false
  }
];

console.log('\n📊 SCENARIO ANALYSIS:\n');

scenarios.forEach((scenario, index) => {
  console.log(`\nScenario ${index + 1}: ${scenario.name}`);
  console.log('-'.repeat(60));
  console.log(`User: "${scenario.message}"`);

  // Detect if we should offer
  const offerContext = detectScheduleOfferOpportunity(
    scenario.message,
    scenario.conversationHistory,
    scenario.hasAgenda
  );

  console.log(`\n🎯 Detection Results:`);
  console.log(`  Should Offer: ${offerContext.shouldOffer ? '✅ Yes' : '❌ No'}`);
  console.log(`  Offer Type: ${offerContext.offerType}`);
  console.log(`  Reason: ${offerContext.reason}`);

  if (offerContext.shouldOffer) {
    // Generate contextual offer
    const contextualOffer = generateContextualScheduleOffer(
      scenario.assistantResponse,
      scenario.message,
      scenario.hasAgenda
    );

    if (contextualOffer) {
      console.log(`\n💬 Contextual Offer:`);
      console.log(`  ${contextualOffer.replace(/\n/g, '\n  ')}`);
    } else if (offerContext.suggestedPrompt) {
      console.log(`\n💬 Suggested Offer:`);
      console.log(`  ${offerContext.suggestedPrompt.replace(/\n/g, '\n  ')}`);
    }
  }
});

console.log('\n' + '='.repeat(80));
console.log('\n🔍 ACCEPTANCE DETECTION TEST:\n');

const userResponses = [
  'yes',
  'sure, build my schedule',
  'that would be great',
  'no thanks',
  'maybe later',
  'yes please create my agenda',
  'ok',
  'sounds good'
];

console.log('Testing if user responses accept schedule offer:\n');
userResponses.forEach(response => {
  const accepts = isAcceptingScheduleOffer(response);
  console.log(`"${response}" → ${accepts ? '✅ Accepts' : '❌ Declines'}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📝 KEY FEATURES:');
console.log(`
1. **Soft Offers**: Natural, non-pushy suggestions based on context
2. **Smart Detection**: Only offers when user shows interest in sessions/topics
3. **Contextual**: Different offer styles based on conversation flow
4. **No Duplicates**: Won't offer if user already has an agenda
5. **Easy Acceptance**: Recognizes various ways users say "yes"

The system ensures the chatbot:
- Offers help naturally when users discuss sessions
- Varies the offer style (soft, medium, direct)
- Respects users who already have schedules
- Makes it easy to accept with simple responses
`);

console.log('✅ Schedule Offer System Test Complete!\n');