#!/usr/bin/env node

/**
 * Test script for conversation context and memory
 * Tests multiple scenarios to ensure context is maintained
 */

const fetch = require('node-fetch');

const API_URL = 'http://localhost:3011/api/chat/stream';

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function sendMessage(message, sessionId = null) {
  console.log(`${colors.blue}📤 Sending: ${colors.reset}"${message}"`);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
      userPreferences: {} // Testing as non-authenticated user
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullResponse = '';
  let capturedSessionId = sessionId;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data === '[DONE]') continue;

        try {
          const parsed = JSON.parse(data);

          if (parsed.type === 'content') {
            fullResponse += parsed.content;
          } else if (parsed.type === 'done' && parsed.sessionId) {
            capturedSessionId = parsed.sessionId;
          } else if (parsed.type === 'status') {
            console.log(`${colors.yellow}⚡ Status: ${colors.reset}${parsed.content}`);
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
    }
  }

  console.log(`${colors.green}📥 Response: ${colors.reset}${fullResponse.substring(0, 200)}...`);
  console.log(`${colors.cyan}🔑 Session ID: ${colors.reset}${capturedSessionId}`);
  console.log('---');

  return { response: fullResponse, sessionId: capturedSessionId };
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runTest(testName, messages) {
  console.log(`\n${colors.bright}${colors.green}🧪 TEST: ${testName}${colors.reset}\n`);

  let sessionId = null;

  for (let i = 0; i < messages.length; i++) {
    console.log(`${colors.bright}Step ${i + 1}:${colors.reset}`);

    try {
      const result = await sendMessage(messages[i], sessionId);
      sessionId = result.sessionId;

      // Check for context issues
      const response = result.response.toLowerCase();

      // Check if AI is asking duplicate questions
      if (i > 0) {
        const previousMessages = messages.slice(0, i).join(' ').toLowerCase();

        if (previousMessages.includes('interested in') && response.includes('what are you interested in')) {
          console.log(`${colors.red}❌ ERROR: AI asked about interests again after user already shared them${colors.reset}`);
        }

        if (previousMessages.includes('day') && response.includes('which days')) {
          console.log(`${colors.red}❌ ERROR: AI asked about days again after user already mentioned them${colors.reset}`);
        }

        if (previousMessages.includes('role') && response.includes('what is your role')) {
          console.log(`${colors.red}❌ ERROR: AI asked about role again after user already shared it${colors.reset}`);
        }
      }

      await delay(1000); // Wait between messages
    } catch (error) {
      console.error(`${colors.red}Error: ${error.message}${colors.reset}`);
    }
  }

  console.log(`${colors.green}✅ Test "${testName}" completed${colors.reset}`);
}

async function main() {
  console.log(`${colors.bright}${colors.cyan}🚀 Starting Conversation Context Tests${colors.reset}`);

  // Test 1: Agenda Building Flow
  await runTest('Agenda Building with Preferences', [
    'Build me an agenda',
    'I am interested in AI and cybersecurity, I am a product manager attending all 3 days',
    'Can you show me more AI sessions?',
    'What about networking events?'
  ]);

  await delay(2000);

  // Test 2: Session Information Flow
  await runTest('Session Discovery and Details', [
    'What AI sessions are on Tuesday?',
    'Tell me more about the first one',
    'Who is speaking at that session?',
    'What other sessions does that speaker have?'
  ]);

  await delay(2000);

  // Test 3: Preference Persistence
  await runTest('Preference Memory Test', [
    'I am interested in underwriting and claims technology',
    'What sessions should I attend?',
    'Are there any workshops in my areas of interest?',
    'Build me a schedule for day 2'
  ]);

  await delay(2000);

  // Test 4: Complex Multi-turn Conversation
  await runTest('Complex Context Retention', [
    'I am a CTO at an insurance company',
    'We are looking to implement AI solutions',
    'What sessions would help me evaluate vendors?',
    'Can you compare the AI sessions on day 1 vs day 2?',
    'Based on what I told you, which keynotes are must-attend?'
  ]);

  console.log(`\n${colors.bright}${colors.cyan}🎉 All tests completed!${colors.reset}`);

  // Summary
  console.log(`\n${colors.bright}Test Summary:${colors.reset}`);
  console.log('1. Agenda Building Flow - Tests if preferences are remembered');
  console.log('2. Session Discovery - Tests if session context is maintained');
  console.log('3. Preference Persistence - Tests if interests are retained');
  console.log('4. Complex Context - Tests multi-turn conversation with role/goal retention');
}

// Run tests
main().catch(console.error);