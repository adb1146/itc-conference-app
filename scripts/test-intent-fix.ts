/**
 * Test Script for Intent Classification Fix
 * Verifies that "Show me the keynote speakers" is NOT routed to local recommendations
 */

import { LocalRecommendationsAgent } from '../lib/agents/local-recommendations-agent';
import { routeMessage } from '../lib/agents/agent-router';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testLocalQueryDetection() {
  console.log(`\n${colors.blue}Testing Local Query Detection...${colors.reset}`);
  
  const testCases = [
    { query: 'Show me the keynote speakers', shouldBeLocal: false },
    { query: 'Show me entertainment options', shouldBeLocal: false },
    { query: 'Show me available shows', shouldBeLocal: true },
    { query: 'Where can I get lunch?', shouldBeLocal: true },
    { query: 'Tell me about the speaker John Smith', shouldBeLocal: false },
    { query: 'What sessions are about AI?', shouldBeLocal: false },
    { query: 'Build my conference agenda', shouldBeLocal: false },
    { query: 'I\'m hungry', shouldBeLocal: true },
    { query: 'Show us the schedule', shouldBeLocal: false },
    { query: 'Any good restaurants nearby?', shouldBeLocal: true }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const testCase of testCases) {
    const isLocal = LocalRecommendationsAgent.isLocalQuery(testCase.query);
    const testPassed = isLocal === testCase.shouldBeLocal;
    
    if (testPassed) {
      console.log(`${colors.green}✓${colors.reset} "${testCase.query}"`);
      passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} "${testCase.query}"`);
      failed++;
    }
    
    console.log(`${colors.gray}  - Detected as local: ${isLocal} (expected: ${testCase.shouldBeLocal})${colors.reset}`);
  }
  
  return { passed, failed };
}

async function testAgentRouting() {
  console.log(`\n${colors.blue}Testing Agent Routing...${colors.reset}`);
  
  const testQueries = [
    { query: 'Show me the keynote speakers', expectedAgent: 'none' },
    { query: 'Where should I have lunch?', expectedAgent: 'local_recommendations' },
    { query: 'Help me build my agenda', expectedAgent: 'orchestrator' },
    { query: 'What sessions cover AI?', expectedAgent: 'none' }
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testQueries) {
    const response = await routeMessage(test.query, {
      sessionId: 'test-session',
      userId: 'test@example.com'
    });
    
    const actualAgent = response.metadata?.toolUsed || 'none';
    const testPassed = actualAgent === test.expectedAgent;
    
    if (testPassed) {
      console.log(`${colors.green}✓${colors.reset} "${test.query}"`);
      passed++;
    } else {
      console.log(`${colors.red}✗${colors.reset} "${test.query}"`);
      failed++;
    }
    
    console.log(`${colors.gray}  - Routed to: ${actualAgent} (expected: ${test.expectedAgent})${colors.reset}`);
    
    // Show preview of response for failed tests
    if (!testPassed) {
      console.log(`${colors.gray}  - Response preview: ${response.message.substring(0, 100)}...${colors.reset}`);
    }
  }
  
  return { passed, failed };
}

async function runAllTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}Testing Intent Classification Fix${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  const localDetection = await testLocalQueryDetection();
  const routing = await testAgentRouting();
  
  const totalPassed = localDetection.passed + routing.passed;
  const totalFailed = localDetection.failed + routing.failed;
  
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  if (totalFailed === 0) {
    console.log(`${colors.green}✅ All tests passed! (${totalPassed}/${totalPassed + totalFailed})${colors.reset}`);
    console.log(`\n${colors.green}The fix is working correctly!${colors.reset}`);
    console.log('"Show me the keynote speakers" will no longer return entertainment options.');
  } else {
    console.log(`${colors.red}❌ ${totalFailed} tests failed (${totalPassed}/${totalPassed + totalFailed} passed)${colors.reset}`);
    console.log(`\n${colors.red}Some issues remain. Please review the failed tests.${colors.reset}`);
  }
  
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
  
  process.exit(totalFailed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);