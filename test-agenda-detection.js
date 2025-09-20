#!/usr/bin/env node

/**
 * Test script to verify agenda building detection
 */

const testPhrases = [
  // Should trigger agenda building
  "build my schedule",
  "create my agenda",
  "help me with my schedule",
  "can you help me plan my agenda",
  "I need help planning my schedule",
  "create a personalized schedule for me",
  "build me an agenda",
  "help me figure out what sessions to attend",
  "make my itinerary",
  "plan my days at the conference",

  // Should NOT trigger agenda building
  "what's happening this morning?",
  "tell me about AI sessions",
  "when is lunch?",
  "what sessions are available?",
  "show me cybersecurity talks",
  "I'm interested in claims automation"
];

async function testIntent(message) {
  try {
    const response = await fetch('http://localhost:3011/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: 'test-' + Date.now(),
        userPreferences: {
          name: 'Test User',
          interests: ['AI', 'Claims']
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
    let redirectDetected = false;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      fullResponse += chunk;

      // Check if Smart Agenda redirect was triggered
      if (chunk.includes('/smart-agenda') ||
          chunk.includes('Smart Agenda') ||
          chunk.includes('agenda building intent')) {
        redirectDetected = true;
      }
    }

    const shouldTrigger = message.toLowerCase().includes('build') ||
                         message.toLowerCase().includes('create') ||
                         message.toLowerCase().includes('help') && message.toLowerCase().includes('schedule') ||
                         message.toLowerCase().includes('plan');

    if (shouldTrigger && redirectDetected) {
      console.log(`✅ "${message}" - Correctly detected as agenda building`);
    } else if (!shouldTrigger && !redirectDetected) {
      console.log(`✅ "${message}" - Correctly NOT detected as agenda building`);
    } else if (shouldTrigger && !redirectDetected) {
      console.log(`❌ "${message}" - SHOULD trigger agenda building but didn't`);
    } else {
      console.log(`⚠️  "${message}" - Triggered agenda building but shouldn't have`);
    }

  } catch (error) {
    console.error(`❌ Error testing "${message}":`, error.message);
  }
}

async function runTests() {
  console.log('🧪 Testing Agenda Building Detection\n');
  console.log('=' .repeat(50));

  for (const phrase of testPhrases) {
    await testIntent(phrase);
    // Add delay to avoid overwhelming the server
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n✅ Tests complete!');
}

runTests().catch(console.error);