#!/usr/bin/env npx tsx
/**
 * Test script for intelligent query interpretation
 * Demonstrates how compound topics are understood and mapped to conference content
 */

import { interpretQuery, generateEnhancedSearchQuery, generateAIGuidance } from '../lib/intelligent-query-interpreter';

const testQueries = [
  // Compound topic query that should trigger intelligent interpretation
  "How will AI be affected by weather and climate change?",

  // Abstract business query
  "What are the opportunities for disruption in underwriting?",

  // Complex intersection query
  "How is blockchain being used for fraud detection in claims?",

  // Future-looking query
  "What's the future of IoT in auto insurance?",

  // Strategic query
  "Best practices for implementing AI in customer service",

  // Simple direct query
  "What sessions are about cyber insurance?",

  // Innovation query
  "How are startups transforming distribution channels?",

  // Technical intersection
  "How does data analytics improve risk assessment?",

  // Regulatory concern
  "What are the challenges with AI regulation and governance?",

  // Market trend query
  "Emerging trends in parametric insurance products"
];

console.log('🧠 Testing Intelligent Query Interpretation System\n');
console.log('=' .repeat(80));

testQueries.forEach((query, index) => {
  console.log(`\n📝 Query ${index + 1}: "${query}"`);
  console.log('-'.repeat(80));

  const interpretation = interpretQuery(query);
  const enhancedSearch = generateEnhancedSearchQuery(interpretation);
  const aiGuidance = generateAIGuidance(interpretation);

  console.log('\n🔍 Interpretation:');
  console.log(`  Strategy: ${interpretation.searchStrategy}`);

  if (interpretation.domainConnections.length > 0) {
    console.log(`  🔗 Domain Connections: ${interpretation.domainConnections.join(', ')}`);
  }

  if (interpretation.interpretedTopics.length > 0) {
    console.log(`  💡 Interpreted Topics: ${interpretation.interpretedTopics.slice(0, 5).join(', ')}`);
  }

  console.log(`\n🔎 Enhanced Search Query: "${enhancedSearch}"`);

  console.log('\n🤖 AI Guidance Extract:');
  const guidanceLines = aiGuidance.split('\n').filter(line => line.trim());
  const keyLines = guidanceLines.filter(line =>
    line.includes('MUST') ||
    line.includes('Sessions about:') ||
    line.includes('COMPOUND TOPIC DETECTED') ||
    line.includes('CONCEPTUAL SEARCH REQUIRED')
  ).slice(0, 3);

  keyLines.forEach(line => {
    console.log(`    ${line.trim()}`);
  });

  console.log('\n' + '='.repeat(80));
});

console.log('\n✅ Intelligent Query Interpretation Test Complete!\n');

// Example output showing how the system works
console.log(`
📊 EXAMPLE OUTPUT EXPLANATION:
--------------------------------
When a user asks: "How will AI be affected by weather?"

The system:
1. Detects compound topic: AI + Weather
2. Maps to insurance context: Climate risk, parametric insurance, catastrophe modeling
3. Generates enhanced search: "climate risk catastrophe modeling parametric insurance..."
4. Provides AI guidance: Look for sessions about risk analytics, weather derivatives, etc.
5. Ensures response includes specific conference sessions, not generic information

This ensures the AI always:
- Understands the business context behind questions
- Finds relevant sessions even for abstract queries
- Connects compound topics intelligently
- Never gives generic responses
`);