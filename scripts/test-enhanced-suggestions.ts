/**
 * Test script for enhanced suggestion system
 * Tests context-aware suggestions following Anthropic best practices
 */

import { generateContextualSuggestions, formatSuggestionsForResponse } from '../lib/suggestion-handler';
import { ConversationMessage } from '../lib/chat/types';

// Test scenarios
const testScenarios = [
  {
    name: 'Initial conversation - no history',
    context: {
      currentMessage: 'What sessions should I attend?',
      conversationHistory: [],
      userProfile: {
        name: 'Test User',
        interests: ['AI', 'Cybersecurity'],
        role: 'CTO'
      }
    },
    expectedCategories: ['explore', 'clarification']
  },
  {
    name: 'Follow-up after AI session discussion',
    context: {
      currentMessage: 'That sounds interesting',
      conversationHistory: [
        {
          role: 'user' as const,
          content: 'Tell me about AI sessions on Day 1'
        },
        {
          role: 'assistant' as const,
          content: 'On Day 1, there are several exciting AI sessions including "Practical AI Implementation" at 9:00 AM with speakers from leading tech companies...'
        }
      ],
      userProfile: {
        interests: ['AI', 'Machine Learning']
      }
    },
    expectedCategories: ['follow-up', 'explore', 'action']
  },
  {
    name: 'Happy hour context retention',
    context: {
      currentMessage: 'ok on Day 1',
      conversationHistory: [
        {
          role: 'user' as const,
          content: 'Where are the best happy hours?'
        },
        {
          role: 'assistant' as const,
          content: 'The conference features several great networking happy hours: Day 1 has the Opening Reception at 5:30 PM, Day 2 has the Tech Leader Mixer at 6:00 PM...'
        }
      ]
    },
    expectedCategories: ['follow-up', 'action']
  },
  {
    name: 'Complex multi-turn conversation',
    context: {
      currentMessage: 'Can you help me avoid conflicts?',
      conversationHistory: [
        {
          role: 'user' as const,
          content: 'I want to attend both AI and cybersecurity sessions'
        },
        {
          role: 'assistant' as const,
          content: 'Great choice! Both AI and cybersecurity are hot topics...'
        },
        {
          role: 'user' as const,
          content: 'Which ones do you recommend on Day 2?'
        },
        {
          role: 'assistant' as const,
          content: 'On Day 2, I recommend these sessions: "AI in Cyber Defense" at 10 AM, "Zero Trust Architecture" at 2 PM...'
        }
      ],
      userProfile: {
        interests: ['AI', 'Cybersecurity'],
        role: 'Security Architect'
      }
    },
    expectedCategories: ['action', 'follow-up']
  }
];

// Run tests
async function runTests() {
  console.log('🧪 Testing Enhanced Suggestion System\n');
  console.log('=' .repeat(60));

  for (const scenario of testScenarios) {
    console.log(`\n📝 Scenario: ${scenario.name}`);
    console.log('-'.repeat(40));
    console.log(`User: "${scenario.context.currentMessage}"`);

    if (scenario.context.conversationHistory.length > 0) {
      console.log(`History: ${scenario.context.conversationHistory.length} messages`);
    }

    // Generate suggestions
    const suggestions = generateContextualSuggestions(scenario.context);

    // Display suggestions
    console.log(`\n✨ Generated ${suggestions.length} suggestions:`);
    suggestions.forEach((suggestion, index) => {
      console.log(`  ${index + 1}. [${suggestion.category}] ${suggestion.question}`);
      console.log(`     Relevance: ${(suggestion.relevanceScore * 100).toFixed(0)}%`);
    });

    // Format for response
    const formatted = formatSuggestionsForResponse(suggestions, scenario.context);
    console.log('\n📋 Formatted for response:');
    console.log(formatted);

    // Validate expected categories
    const generatedCategories = [...new Set(suggestions.map(s => s.category))];
    const hasExpectedCategories = scenario.expectedCategories.every(
      expected => generatedCategories.includes(expected as any)
    );

    console.log(`\n✅ Expected categories: ${scenario.expectedCategories.join(', ')}`);
    console.log(`   Generated categories: ${generatedCategories.join(', ')}`);
    console.log(`   ${hasExpectedCategories ? '✓ PASS' : '✗ FAIL'}`);
  }

  // Test edge cases
  console.log('\n\n🔍 Testing Edge Cases');
  console.log('=' .repeat(60));

  // Empty context
  console.log('\n1. Empty conversation context:');
  const emptySuggestions = generateContextualSuggestions({
    currentMessage: '',
    conversationHistory: []
  });
  console.log(`   Generated ${emptySuggestions.length} suggestions`);
  console.log(`   ${emptySuggestions.length > 0 ? '✓ PASS - Has default suggestions' : '✗ FAIL - No suggestions'}`);

  // Very long conversation
  console.log('\n2. Long conversation history (20+ messages):');
  const longHistory: ConversationMessage[] = [];
  for (let i = 0; i < 20; i++) {
    longHistory.push(
      { role: 'user', content: `Question ${i}` },
      { role: 'assistant', content: `Answer ${i}` }
    );
  }
  const longConvSuggestions = generateContextualSuggestions({
    currentMessage: 'What else should I know?',
    conversationHistory: longHistory
  });
  console.log(`   Generated ${longConvSuggestions.length} suggestions`);
  console.log(`   ${longConvSuggestions.length <= 5 ? '✓ PASS - Limited to 5' : '✗ FAIL - Too many suggestions'}`);

  // Test relevance scoring
  console.log('\n3. Relevance scoring order:');
  const scoredSuggestions = generateContextualSuggestions({
    currentMessage: 'Tell me about AI sessions',
    conversationHistory: [
      { role: 'user', content: 'I am interested in AI' },
      { role: 'assistant', content: 'AI is a key focus at the conference...' }
    ],
    userProfile: { interests: ['AI'] }
  });

  const scores = scoredSuggestions.map(s => s.relevanceScore);
  const isSorted = scores.every((score, i) => i === 0 || score <= scores[i - 1]);
  console.log(`   Scores: ${scores.map(s => (s * 100).toFixed(0) + '%').join(', ')}`);
  console.log(`   ${isSorted ? '✓ PASS - Properly sorted' : '✗ FAIL - Not sorted by relevance'}`);

  console.log('\n\n🎉 Testing Complete!\n');
}

// Run the tests
runTests().catch(console.error);