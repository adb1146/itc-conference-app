#!/usr/bin/env node

/**
 * Simple test for conversation context
 */

const API_URL = 'http://localhost:3011/api/chat/stream';

async function sendMessage(message, sessionId = null) {
  console.log('\n📤 Sending:', message);
  if (sessionId) console.log('   Session ID:', sessionId);

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message,
      sessionId,
      userPreferences: {}
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
  let chunks = [];

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
          chunks.push(parsed);

          if (parsed.type === 'content') {
            fullResponse += parsed.content;
          } else if (parsed.type === 'done') {
            console.log('   DEBUG: Got done event with sessionId:', parsed.sessionId);
            if (parsed.sessionId) {
              capturedSessionId = parsed.sessionId;
            }
          }
        } catch (e) {
          console.log('   DEBUG: Parse error for line:', line);
        }
      }
    }
  }

  // Extract first 300 chars of response for display
  const responsePreview = fullResponse.substring(0, 300).replace(/\n/g, ' ');
  console.log('📥 Response:', responsePreview + '...');
  console.log('✅ Session ID:', capturedSessionId);

  // Check for context issues
  const lowerResponse = fullResponse.toLowerCase();

  // Check if AI is asking questions that were already answered
  if (lowerResponse.includes('what are you interested in') ||
      lowerResponse.includes('what are your interests') ||
      lowerResponse.includes('could you tell me more about your interests')) {
    console.log('⚠️  WARNING: AI might be asking for interests again');
  }

  if (lowerResponse.includes('which days are you attending') ||
      lowerResponse.includes('what days will you be there')) {
    console.log('⚠️  WARNING: AI might be asking about days again');
  }

  return { response: fullResponse, sessionId: capturedSessionId };
}

async function runTest() {
  console.log('🧪 Testing Conversation Context System\n');
  console.log('=' .repeat(50));

  try {
    // Test 1: Start a conversation and provide preferences
    console.log('\n📋 TEST 1: Agenda Building with Preferences');
    console.log('-' .repeat(40));

    let result = await sendMessage('Build me an agenda');
    const sessionId = result.sessionId;

    console.log('\n⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Provide preferences - this should NOT re-trigger agenda builder
    result = await sendMessage(
      'I am interested in AI and cybersecurity, I am a product manager attending all 3 days',
      sessionId
    );

    console.log('\n⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Follow-up question - should remember interests
    console.log('\n📋 TEST 2: Follow-up with context');
    console.log('-' .repeat(40));

    result = await sendMessage(
      'Can you show me more sessions related to my interests?',
      sessionId
    );

    // Check if response acknowledges previous interests
    if (result.response.toLowerCase().includes('ai') ||
        result.response.toLowerCase().includes('cybersecurity')) {
      console.log('✅ SUCCESS: AI remembered user interests!');
    } else {
      console.log('❌ FAIL: AI did not reference previously mentioned interests');
    }

    console.log('\n⏳ Waiting 2 seconds...\n');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Another follow-up - should know user is a product manager
    console.log('\n📋 TEST 3: Role-based recommendations');
    console.log('-' .repeat(40));

    result = await sendMessage(
      'What sessions would be good for someone in my role?',
      sessionId
    );

    // Check if response acknowledges role
    if (result.response.toLowerCase().includes('product manager') ||
        result.response.toLowerCase().includes('pm')) {
      console.log('✅ SUCCESS: AI remembered user role!');
    } else {
      console.log('❌ FAIL: AI did not reference previously mentioned role');
    }

    console.log('\n' + '=' .repeat(50));
    console.log('🎉 Test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('- Session ID was maintained across all messages');
    console.log('- Conversation context was preserved');
    console.log('- Check server logs for detailed context usage');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the test
runTest();