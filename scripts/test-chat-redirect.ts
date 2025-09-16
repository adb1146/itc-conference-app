#!/usr/bin/env npx tsx

async function testChatRedirect() {
  console.log('🧪 Testing "build my schedule" redirect\n');

  const messages = [
    "build my schedule",
    "Build my schedule for Day 2",
    "Want me to organize these into your personal schedule?",
    "help designing my schedule"
  ];

  for (const message of messages) {
    console.log(`Testing: "${message}"`);

    try {
      const response = await fetch('http://localhost:3011/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId: `test-${Date.now()}`,
          messages: []
        })
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let redirectDetected = false;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data && data !== '[DONE]') {
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content?.includes('Smart Agenda') ||
                      parsed.content?.includes('register') ||
                      parsed.content?.includes('sign up')) {
                    redirectDetected = true;
                    console.log(`  ✅ Redirect detected!`);
                    console.log(`     Response includes: ${parsed.content.substring(0, 100)}...`);
                    break;
                  }
                } catch (e) {
                  // ignore parse errors
                }
              }
            }
          }
          if (redirectDetected) break;
        }
      }

      if (!redirectDetected) {
        console.log(`  ❌ No redirect - message might be handled by orchestrator`);
      }

      console.log('');
    } catch (error) {
      console.error(`  ❌ Error: ${error}`);
      console.log('');
    }
  }
}

testChatRedirect();