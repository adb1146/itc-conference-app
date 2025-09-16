#!/usr/bin/env npx tsx
/**
 * Test Chat API with Real OpenAI
 */

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testChat(message: string) {
  const response = await fetch('http://localhost:3011/api/chat/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      sessionId: 'test-' + Date.now(),
      stream: false
    })
  });

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

async function main() {
  console.log(`\n${colors.blue}Testing Chat API with Real OpenAI${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(50)}${colors.reset}\n`);

  const tests = [
    {
      query: "Show me the keynote speakers",
      expectNot: ["entertainment", "restaurant", "bar"],
      description: "Should return speaker info"
    },
    {
      query: "Where can I get lunch?",
      expect: ["restaurant", "food"],
      description: "Should return restaurants"
    }
  ];

  for (const test of tests) {
    console.log(`${colors.gray}Testing: "${test.query}"${colors.reset}`);

    try {
      const response = await testChat(test.query);
      const lower = response.toLowerCase();

      let passed = true;

      if (test.expectNot) {
        for (const bad of test.expectNot) {
          if (lower.includes(bad)) {
            console.log(`${colors.red}✗ Contains "${bad}" (should not)${colors.reset}`);
            passed = false;
          }
        }
      }

      if (test.expect) {
        const hasExpected = test.expect.some(e => lower.includes(e));
        if (!hasExpected) {
          console.log(`${colors.yellow}⚠ Missing expected content${colors.reset}`);
          passed = false;
        }
      }

      if (passed) {
        console.log(`${colors.green}✓ ${test.description}${colors.reset}`);
      }

      // Show first 100 chars
      const snippet = response.substring(0, 100).replace(/\n/g, ' ');
      console.log(`${colors.gray}Response: ${snippet}...${colors.reset}\n`);

    } catch (error: any) {
      console.log(`${colors.red}Error: ${error.message}${colors.reset}\n`);
    }
  }

  // Check server logs
  console.log(`${colors.blue}Check server logs for:${colors.reset}`);
  console.log('• [Smart Router] Using AI-powered routing');
  console.log('• [AIIntentClassifier] OpenAI client initialized');
  console.log('• Intent classification with confidence scores\n');
}

main().catch(console.error);