/**
 * Standalone test for the enhanced suggestion system
 * Tests the suggestion handler directly without needing the server
 */

import { generateContextualSuggestions, formatSuggestionsForResponse, analyzeConversationContext } from '../lib/suggestion-handler';
import { ConversationMessage } from '../lib/chat/types';
import { createEnhancedPrompt } from '../lib/prompt-engine';

console.log('🧪 Standalone Enhanced Suggestion System Test');
console.log('=' .repeat(60));

// Test 1: Context Analysis
console.log('\n📊 Test 1: Conversation Context Analysis');
console.log('-'.repeat(40));

const testHistory1: ConversationMessage[] = [
  { role: 'user', content: 'Where are the best happy hours?' },
  { role: 'assistant', content: 'The conference features several great networking happy hours: Day 1 has the Opening Reception at 5:30 PM...' }
];

const context1 = analyzeConversationContext(testHistory1);
console.log('Topic detected:', context1.topic);
console.log('Entities:', context1.entities);
console.log('Intent:', context1.intent);

// Test 2: Follow-up Detection
console.log('\n🔍 Test 2: Follow-up Context Retention');
console.log('-'.repeat(40));

const followUpContext = {
  currentMessage: 'ok on Day 1',
  conversationHistory: testHistory1,
  userProfile: {
    interests: ['Networking', 'AI']
  }
};

const followUpSuggestions = generateContextualSuggestions(followUpContext);
console.log(`Generated ${followUpSuggestions.length} suggestions:`);
followUpSuggestions.forEach((s, i) => {
  console.log(`  ${i + 1}. [${s.category}] ${s.question} (${Math.round(s.relevanceScore * 100)}%)`);
});

// Test 3: Complex conversation
console.log('\n🎯 Test 3: Complex Multi-turn Conversation');
console.log('-'.repeat(40));

const complexHistory: ConversationMessage[] = [
  { role: 'user', content: 'I am interested in AI and cybersecurity' },
  { role: 'assistant', content: 'Great interests! Both AI and cybersecurity are major themes at ITC Vegas 2025...' },
  { role: 'user', content: 'Which sessions should I prioritize on Day 2?' },
  { role: 'assistant', content: 'On Day 2, I recommend: "AI in Cyber Defense" at 10 AM, "Zero Trust Architecture" at 2 PM...' },
  { role: 'user', content: 'Can you help me avoid conflicts?' }
];

const complexContext = {
  currentMessage: 'Can you help me avoid conflicts?',
  conversationHistory: complexHistory,
  userProfile: {
    interests: ['AI', 'Cybersecurity'],
    role: 'Security Architect'
  }
};

const complexSuggestions = generateContextualSuggestions(complexContext);
console.log(`Generated ${complexSuggestions.length} suggestions:`);
complexSuggestions.forEach((s, i) => {
  console.log(`  ${i + 1}. [${s.category}] ${s.question} (${Math.round(s.relevanceScore * 100)}%)`);
});

// Test 4: Formatted output
console.log('\n📝 Test 4: Formatted Suggestion Output');
console.log('-'.repeat(40));

const formatted = formatSuggestionsForResponse(complexSuggestions, complexContext);
console.log('Formatted for display:');
console.log(formatted);

// Test 5: Enhanced Prompt Integration
console.log('\n🚀 Test 5: Enhanced Prompt with Suggestions');
console.log('-'.repeat(40));

const promptContext = {
  userMessage: 'What AI sessions are on Day 2?',
  conversationHistory: [
    { role: 'user', content: 'I want to learn about AI implementation' },
    { role: 'assistant', content: 'AI implementation is a key focus at the conference...' }
  ],
  userProfile: {
    name: 'Test User',
    interests: ['AI', 'Machine Learning']
  },
  sessionData: [
    { title: 'AI in Insurance', day: 'Day 2', time: '10:00 AM' },
    { title: 'Machine Learning Workshop', day: 'Day 2', time: '2:00 PM' }
  ]
};

const enhancedPrompt = createEnhancedPrompt(
  promptContext,
  'You are an AI assistant for ITC Vegas 2025.'
);

console.log('System Prompt includes suggestions:',
  enhancedPrompt.responseGuidelines.includes('CONTEXTUAL SUGGESTIONS'));

// Extract suggestions from guidelines
const guidelinesLines = enhancedPrompt.responseGuidelines.split('\n');
const suggestionSection = guidelinesLines.findIndex(line =>
  line.includes('CONTEXTUAL SUGGESTIONS'));

if (suggestionSection > 0) {
  console.log('\n💡 Suggestions in prompt:');
  for (let i = suggestionSection + 1; i < Math.min(suggestionSection + 10, guidelinesLines.length); i++) {
    if (guidelinesLines[i].trim().startsWith('•')) {
      console.log('  ' + guidelinesLines[i].trim());
    }
  }
}

// Test 6: Performance Metrics
console.log('\n📈 Test 6: Performance Metrics');
console.log('-'.repeat(40));

const startTime = Date.now();
for (let i = 0; i < 100; i++) {
  generateContextualSuggestions({
    currentMessage: 'test message ' + i,
    conversationHistory: testHistory1
  });
}
const endTime = Date.now();

console.log(`Generated 100 suggestion sets in ${endTime - startTime}ms`);
console.log(`Average time per generation: ${((endTime - startTime) / 100).toFixed(2)}ms`);

// Summary
console.log('\n\n✅ Summary');
console.log('=' .repeat(60));

const tests = [
  { name: 'Context Analysis', passed: context1.topic !== 'general' },
  { name: 'Follow-up Detection', passed: followUpSuggestions.some(s => s.category === 'follow-up') },
  { name: 'Complex Conversations', passed: complexSuggestions.length > 0 },
  { name: 'Formatting', passed: formatted.includes('•') },
  { name: 'Prompt Integration', passed: enhancedPrompt.responseGuidelines.includes('CONTEXTUAL SUGGESTIONS') },
  { name: 'Performance', passed: (endTime - startTime) / 100 < 10 }
];

tests.forEach(test => {
  console.log(`${test.passed ? '✓' : '✗'} ${test.name}`);
});

const passedCount = tests.filter(t => t.passed).length;
console.log(`\n🎉 ${passedCount}/${tests.length} tests passed!`);

if (passedCount === tests.length) {
  console.log('All enhanced suggestion features are working correctly! 🚀');
} else {
  console.log('Some tests failed. Check the output above for details.');
}