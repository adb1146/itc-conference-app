#!/usr/bin/env node

/**
 * Test script to verify meal queries return linkable sessions from vector search
 */

const testPhrases = [
  "when is lunch?",
  "what's for breakfast tomorrow?",
  "where is dinner tonight?",
  "tell me about lunch options"
];

async function testMealQuery(message) {
  try {
    const response = await fetch('http://localhost:3011/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: 'test-meal-' + Date.now(),
        userPreferences: {
          name: 'Test User'
        }
      })
    });

    if (!response.ok) {
      console.error(`❌ Failed for "${message}": HTTP ${response.status}`);
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let hasSessionLinks = false;
    let sessionCount = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;

      // Check for session links in the format [title](/agenda/session/id)
      const linkMatches = chunk.match(/\[([^\]]+)\]\(\/agenda\/session\/([^)]+)\)/g);
      if (linkMatches) {
        hasSessionLinks = true;
        sessionCount += linkMatches.length;
      }

      // Also check for the old format without links (should not appear)
      if (chunk.includes('Upcoming Conference Meals:**') &&
          !chunk.includes('/agenda/session/')) {
        console.warn(`⚠️  "${message}" - Returned hardcoded meal info without links`);
      }
    }

    if (hasSessionLinks) {
      console.log(`✅ "${message}" - Found ${sessionCount} clickable session links`);
    } else {
      console.log(`❌ "${message}" - No session links found (likely using hardcoded response)`);
    }

  } catch (error) {
    console.error(`❌ Error testing "${message}":`, error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Meal Query Link Generation\n');
  console.log('=' .repeat(50));
  console.log('Expected: All meal queries should return sessions with clickable links');
  console.log('=' .repeat(50) + '\n');

  for (const phrase of testPhrases) {
    await testMealQuery(phrase);
    // Add delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log('\n✅ Tests complete!');
  console.log('\n💡 If any queries returned no links, they are still using hardcoded responses.');
}

runTests().catch(console.error);