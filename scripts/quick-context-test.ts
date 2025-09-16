/**
 * Quick test for context retention - testing the primary scenarios
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testContextRetention() {
  const sessionId = `test_${Date.now()}`;

  console.log('\n' + '='.repeat(60));
  console.log('Testing Context Retention - Happy Hours Scenario');
  console.log('Session ID:', sessionId);
  console.log('='.repeat(60) + '\n');

  const messages = [
    {
      text: "Where are the best happy hours at the conference?",
      expected: "Should list happy hour events/parties"
    },
    {
      text: "ok on Day 1",
      expected: "Should filter happy hours for Day 1 only"
    },
    {
      text: "what about the first one",
      expected: "Should provide details about the first Day 1 happy hour"
    }
  ];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    console.log(`\nStep ${i + 1}: "${msg.text}"`);
    console.log(`Expected: ${msg.expected}`);
    console.log('-'.repeat(40));

    try {
      const response = await fetch('http://localhost:3011/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: msg.text,
          sessionId: sessionId,
          userId: 'test-user',
          isAnonymous: false
        }),
      });

      if (!response.ok) {
        console.error(`❌ Request failed: ${response.status}`);
        const errorText = await response.text();
        console.error('Error:', errorText);
        continue;
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                }
              } catch (e) {
                // Skip non-JSON lines
              }
            }
          }
        }
      }

      // Show first 500 chars of response
      console.log('\nResponse preview:');
      console.log(fullResponse.substring(0, 500) + (fullResponse.length > 500 ? '...' : ''));

      // Simple check for context retention
      const responseLower = fullResponse.toLowerCase();
      let contextMaintained = false;

      if (i === 0) {
        // First message - should mention happy hours/parties
        contextMaintained = responseLower.includes('happy hour') ||
                           responseLower.includes('party') ||
                           responseLower.includes('parties') ||
                           responseLower.includes('networking');
      } else if (i === 1) {
        // Second message - should mention Day 1 AND happy hours
        contextMaintained = (responseLower.includes('day 1') || responseLower.includes('first day')) &&
                           (responseLower.includes('happy hour') || responseLower.includes('party'));
      } else if (i === 2) {
        // Third message - should reference a specific event
        contextMaintained = responseLower.includes('first') ||
                           responseLower.includes('opening') ||
                           responseLower.includes('starts at') ||
                           responseLower.includes('begins at');
      }

      console.log(`\n${contextMaintained ? '✅' : '❌'} Context ${contextMaintained ? 'maintained' : 'lost'}`);

      // Wait between messages
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error:`, error);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('Test Complete');
  console.log('='.repeat(60) + '\n');
}

// Run the test
testContextRetention().catch(console.error);