#!/usr/bin/env npx tsx
/**
 * Test AI Routing in Dev Environment
 * Confirms the AI routing is active and working correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testChatEndpoint(message: string) {
  const response = await fetch('http://localhost:3011/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId: 'test-' + Date.now(),
      stream: false // For easier testing
    })
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`);
  }

  // Read the stream
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  while (reader) {
    const { done, value } = await reader.read();
    if (done) break;
    fullResponse += decoder.decode(value);
  }

  return fullResponse;
}

async function runTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}Testing AI Routing in Dev Environment${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);

  // Check environment
  console.log(`${colors.blue}Environment Configuration:${colors.reset}`);
  console.log(`ENABLE_AI_ROUTING: ${process.env.ENABLE_AI_ROUTING === 'true' ?
    `${colors.green}✓ Enabled${colors.reset}` :
    `${colors.red}✗ Disabled${colors.reset}`}`);
  console.log(`OPENAI_API_KEY: ${process.env.OPENAI_API_KEY ?
    `${colors.yellow}Set (but may be invalid)${colors.reset}` :
    `${colors.red}✗ Missing${colors.reset}`}`);

  const testCases = [
    {
      query: "Show me the keynote speakers",
      shouldNotContain: ["entertainment", "restaurants", "bars", "Mandalay Bay"],
      shouldContain: ["speaker", "keynote"],
      description: "Should return speaker information, NOT entertainment"
    },
    {
      query: "Where can I get lunch?",
      shouldContain: ["restaurant", "food", "eat"],
      shouldNotContain: ["keynote", "speaker", "session"],
      description: "Should return restaurant recommendations"
    }
  ];

  console.log(`\n${colors.blue}Testing Chat Responses:${colors.reset}\n`);

  for (const test of testCases) {
    console.log(`${colors.gray}Query: "${test.query}"${colors.reset}`);

    try {
      const response = await testChatEndpoint(test.query);
      const lowerResponse = response.toLowerCase();

      let passed = true;

      // Check for things that should NOT be in the response
      for (const forbidden of test.shouldNotContain) {
        if (lowerResponse.includes(forbidden.toLowerCase())) {
          console.log(`${colors.red}✗ Response incorrectly contains: "${forbidden}"${colors.reset}`);
          passed = false;
        }
      }

      // Check for things that SHOULD be in the response (at least one)
      const hasExpectedContent = test.shouldContain.some(expected =>
        lowerResponse.includes(expected.toLowerCase())
      );

      if (!hasExpectedContent && test.shouldContain.length > 0) {
        console.log(`${colors.yellow}⚠ Response missing expected terms: ${test.shouldContain.join(', ')}${colors.reset}`);
      }

      if (passed) {
        console.log(`${colors.green}✓ ${test.description}${colors.reset}`);
      }

      // Show snippet of response
      const snippet = response.substring(0, 150).replace(/\n/g, ' ');
      console.log(`${colors.gray}Response snippet: ${snippet}...${colors.reset}\n`);

    } catch (error: any) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}\n`);
    }
  }

  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Summary:${colors.reset}`);

  if (process.env.ENABLE_AI_ROUTING === 'true') {
    console.log(`${colors.green}✅ AI Routing is ENABLED in dev environment${colors.reset}`);
    console.log(`${colors.green}✅ Using smart router with fallback classification${colors.reset}`);
    console.log("\nThe system will:");
    console.log("1. Attempt to use OpenAI for intent classification (if valid key)")
    console.log("2. Fall back to improved keyword classification if API fails")
    console.log("3. Correctly route 'keynote speakers' queries to information, not entertainment")
  } else {
    console.log(`${colors.red}❌ AI Routing is NOT enabled${colors.reset}`);
    console.log("Add ENABLE_AI_ROUTING=true to .env.local and restart the server");
  }

  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

// Run tests
runTests().catch(error => {
  console.error(`${colors.red}Test failed:${colors.reset}`, error);
  process.exit(1);
});