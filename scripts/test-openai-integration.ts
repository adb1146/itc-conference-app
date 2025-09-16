#!/usr/bin/env npx tsx
/**
 * Test OpenAI Integration
 * Verifies that the AI routing can use the OpenAI API key from .env.local
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(process.cwd(), '.env.local') });

import OpenAI from 'openai';
import { classifyUserIntent } from '../lib/ai-intent-classifier';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testOpenAIConnection() {
  console.log(`\n${colors.blue}Testing OpenAI API Connection...${colors.reset}`);

  const apiKey = process.env.OPENAI_API_KEY;
  console.log(`API Key found: ${apiKey ? `${colors.green}✓${colors.reset} (${apiKey.substring(0, 20)}...)` : `${colors.red}✗ Missing${colors.reset}`}`);

  if (!apiKey) {
    console.log(`${colors.red}Error: OPENAI_API_KEY not found in environment${colors.reset}`);
    return false;
  }

  try {
    const openai = new OpenAI({ apiKey });

    // Test with a simple completion
    console.log(`\n${colors.gray}Testing API with a simple request...${colors.reset}`);
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: "Say 'API Working'" }],
      max_tokens: 10
    });

    const result = response.choices[0]?.message?.content;
    console.log(`API Response: ${colors.green}${result}${colors.reset}`);
    return true;

  } catch (error: any) {
    console.log(`${colors.red}API Error: ${error.message}${colors.reset}`);
    if (error.message?.includes('401')) {
      console.log(`${colors.yellow}→ Invalid API key. Please check your OPENAI_API_KEY in .env.local${colors.reset}`);
    } else if (error.message?.includes('429')) {
      console.log(`${colors.yellow}→ Rate limit exceeded or quota issue${colors.reset}`);
    }
    return false;
  }
}

async function testAIClassification() {
  console.log(`\n${colors.blue}Testing AI Intent Classification...${colors.reset}`);

  const testCases = [
    {
      query: "Show me the keynote speakers",
      expectedIntent: "information_seeking",
      description: "Conference speaker query"
    },
    {
      query: "Where can I get lunch nearby?",
      expectedIntent: "local_recommendations",
      description: "Restaurant recommendation"
    },
    {
      query: "Help me build my conference agenda",
      expectedIntent: "agenda_building",
      description: "Agenda assistance"
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      console.log(`\n${colors.gray}Testing: "${test.query}"${colors.reset}`);

      const result = await classifyUserIntent(test.query, {
        history: [],
        sessionId: 'test-session'
      });

      console.log(`Intent: ${result.primary_intent}`);
      console.log(`Confidence: ${result.confidence}`);
      console.log(`Action: ${result.suggested_action}`);

      // Check if using AI or fallback
      if (result.reasoning && !result.reasoning.includes('detected')) {
        console.log(`${colors.green}✓ Using AI classification${colors.reset}`);
      } else {
        console.log(`${colors.yellow}⚠ Using fallback classification${colors.reset}`);
      }

      if (result.primary_intent === test.expectedIntent ||
          (test.expectedIntent === 'local_recommendations' && result.primary_intent === 'practical_need')) {
        console.log(`${colors.green}✓ Correct classification${colors.reset}`);
        passed++;
      } else {
        console.log(`${colors.red}✗ Expected ${test.expectedIntent}, got ${result.primary_intent}${colors.reset}`);
        failed++;
      }

    } catch (error: any) {
      console.log(`${colors.red}✗ Error: ${error.message}${colors.reset}`);
      failed++;
    }
  }

  return { passed, failed };
}

async function runTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}OpenAI Integration Test for AI Routing${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);

  // Test 1: OpenAI Connection
  const apiWorking = await testOpenAIConnection();

  // Test 2: AI Classification
  const classificationResults = await testAIClassification();

  // Summary
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.blue}Test Summary:${colors.reset}`);

  if (apiWorking) {
    console.log(`${colors.green}✅ OpenAI API is working${colors.reset}`);
    console.log(`${colors.green}✅ AI routing will use intelligent classification${colors.reset}`);
  } else {
    console.log(`${colors.yellow}⚠️  OpenAI API is not working${colors.reset}`);
    console.log(`${colors.yellow}→ System will use fallback classification${colors.reset}`);
  }

  console.log(`\nClassification Tests: ${classificationResults.passed} passed, ${classificationResults.failed} failed`);

  console.log(`\n${colors.blue}Next Steps:${colors.reset}`);
  if (apiWorking) {
    console.log("1. Enable AI routing: ENABLE_AI_ROUTING=true");
    console.log("2. The system will use OpenAI for intent classification");
    console.log("3. Fallback classification will activate if API fails");
  } else {
    console.log("1. Check your OPENAI_API_KEY in .env.local");
    console.log("2. Ensure it's a valid key with available credits");
    console.log("3. The system will still work using fallback classification");
  }

  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
}

// Run the tests
runTests().catch(console.error);