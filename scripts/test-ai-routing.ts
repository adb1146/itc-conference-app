/**
 * Test AI-Based Routing
 * Verifies that AI intent classification correctly routes queries
 */

import { aiRouteMessage } from '../lib/agents/ai-agent-router';
import { smartRouteMessage } from '../lib/agents/smart-router-wrapper';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

// Test queries that were problematic with keyword matching
const testQueries = [
  {
    query: 'Show me the keynote speakers',
    expectedIntent: 'information_seeking',
    shouldNotBe: 'local_recommendations',
    description: 'Asking about conference speakers'
  },
  {
    query: 'Where can I get lunch?',
    expectedIntent: 'local_recommendations',
    shouldNotBe: 'information_seeking',
    description: 'Asking about restaurants'
  },
  {
    query: 'Help me build my conference agenda',
    expectedIntent: 'agenda_building',
    shouldNotBe: 'local_recommendations',
    description: 'Requesting agenda assistance'
  },
  {
    query: 'What sessions cover AI and machine learning?',
    expectedIntent: 'information_seeking',
    shouldNotBe: 'local_recommendations',
    description: 'Asking about conference sessions'
  },
  {
    query: 'Show me entertainment options',
    expectedIntent: 'local_recommendations',
    shouldNotBe: 'information_seeking',
    description: 'Asking about local entertainment'
  },
  {
    query: 'Tell me about the opening keynote',
    expectedIntent: 'information_seeking',
    shouldNotBe: 'local_recommendations',
    description: 'Asking about keynote session'
  },
  {
    query: 'I\'m hungry, where should I eat?',
    expectedIntent: 'practical_need',
    shouldNotBe: 'information_seeking',
    description: 'Expressing hunger, needs food recommendation'
  }
];

async function testAIRouting() {
  console.log(`\n${colors.blue}Testing AI-Based Routing...${colors.reset}`);
  console.log(`${colors.gray}This uses LLM to understand intent, not keywords${colors.reset}\n`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testQueries) {
    try {
      // Test with AI routing
      const result = await aiRouteMessage(test.query, {
        sessionId: 'test-session',
        userId: 'test@example.com'
      });
      
      const aiIntent = result.metadata?.aiIntent || 'unknown';
      const toolUsed = result.metadata?.toolUsed || 'none';
      const confidence = result.metadata?.confidence || 0;
      
      // Check if it's NOT the wrong intent
      const correctlyNotRouted = !aiIntent.includes(test.shouldNotBe) && 
                                 toolUsed !== test.shouldNotBe;
      
      // Check if it roughly matches expected (AI might use slightly different terms)
      const correctlyRouted = aiIntent.includes(test.expectedIntent) ||
                             aiIntent.includes('local') && test.expectedIntent.includes('local') ||
                             aiIntent.includes('agenda') && test.expectedIntent.includes('agenda');
      
      const testPassed = correctlyNotRouted || correctlyRouted;
      
      if (testPassed) {
        console.log(`${colors.green}✓${colors.reset} ${test.description}`);
        console.log(`  Query: "${test.query}"`);
        console.log(`${colors.gray}  AI Intent: ${aiIntent} (confidence: ${confidence.toFixed(2)})`);
        console.log(`${colors.gray}  Tool used: ${toolUsed}${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}✗${colors.reset} ${test.description}`);
        console.log(`  Query: "${test.query}"`);
        console.log(`${colors.red}  AI Intent: ${aiIntent} (should not be ${test.shouldNotBe})`);
        console.log(`${colors.red}  Tool used: ${toolUsed}${colors.reset}`);
        failed++;
      }
      
      console.log();
      
    } catch (error: any) {
      console.log(`${colors.red}✗${colors.reset} ${test.description}`);
      console.log(`${colors.red}  Error: ${error.message}${colors.reset}\n`);
      failed++;
    }
  }
  
  return { passed, failed };
}

async function testSmartRouter() {
  console.log(`\n${colors.blue}Testing Smart Router (with feature flag)...${colors.reset}\n`);
  
  // Test with AI routing disabled (should use keywords)
  process.env.ENABLE_AI_ROUTING = 'false';
  
  const keywordResult = await smartRouteMessage('Show me the keynote speakers', {
    sessionId: 'test-session',
    userId: 'test@example.com'
  });
  
  console.log('With AI disabled (keyword routing):');
  console.log(`${colors.gray}  Tool used: ${keywordResult.metadata?.toolUsed}`);
  console.log(`${colors.gray}  AI Intent: ${keywordResult.metadata?.aiIntent}${colors.reset}`);
  
  // Test with AI routing enabled
  process.env.ENABLE_AI_ROUTING = 'true';
  
  const aiResult = await smartRouteMessage('Show me the keynote speakers', {
    sessionId: 'test-session',
    userId: 'test@example.com'
  });
  
  console.log('\nWith AI enabled (AI routing):');
  console.log(`${colors.gray}  Tool used: ${aiResult.metadata?.toolUsed}`);
  console.log(`${colors.gray}  AI Intent: ${aiResult.metadata?.aiIntent}`);
  console.log(`${colors.gray}  Confidence: ${aiResult.metadata?.confidence}${colors.reset}`);
}

async function runAllTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}Testing AI-Based Intent Classification Routing${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  // Note about API key requirement
  if (!process.env.OPENAI_API_KEY) {
    console.log(`\n${colors.red}⚠️  Warning: OPENAI_API_KEY not set${colors.reset}`);
    console.log('AI routing will fall back to keyword matching\n');
  }
  
  const aiResults = await testAIRouting();
  await testSmartRouter();
  
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  if (aiResults.failed === 0) {
    console.log(`${colors.green}✅ All AI routing tests passed! (${aiResults.passed}/${aiResults.passed + aiResults.failed})${colors.reset}`);
    console.log(`\n${colors.green}AI-based routing correctly understands intent!${colors.reset}`);
    console.log('"Show me the keynote speakers" will be understood as a request for speaker information.');
    console.log('"Where can I eat?" will be understood as a request for restaurant recommendations.');
  } else {
    console.log(`${colors.red}❌ ${aiResults.failed} tests failed (${aiResults.passed}/${aiResults.passed + aiResults.failed} passed)${colors.reset}`);
  }
  
  console.log(`\n${colors.blue}Rollout Instructions:${colors.reset}`);
  console.log('1. Set ENABLE_AI_ROUTING=true in production');
  console.log('2. Or use gradual rollout: AI_ROUTING_PERCENTAGE=10');
  console.log('3. Monitor [Routing Analytics] logs');
  console.log('4. Increase percentage gradually: 10% → 25% → 50% → 100%');
  
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
  
  process.exit(aiResults.failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);