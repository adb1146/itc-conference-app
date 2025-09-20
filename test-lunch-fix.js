const http = require('http');

const data = JSON.stringify({
  message: 'what about lunch',
  sessionId: 'test-lunch-' + Date.now(),
});

const options = {
  hostname: 'localhost',
  port: 3011,
  path: '/api/chat/stream',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
  },
};

console.log('Testing query: "what about lunch"');
console.log('=' .repeat(50));

const req = http.request(options, (res) => {
  let response = '';

  res.on('data', (chunk) => {
    const lines = chunk.toString().split('\n');
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        if (data && data !== '[DONE]') {
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === 'content') {
              response += parsed.content;
            }
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }
  });

  res.on('end', () => {
    console.log('\nResponse:');
    console.log(response);

    // Check if it's showing conference meals or local restaurants
    if (response.includes('Citizens Kitchen') || response.includes('Border Grill')) {
      console.log('\n❌ FAIL: Still showing local restaurant recommendations');
    } else if (response.includes('lunch') || response.includes('Lunch')) {
      console.log('\n✅ SUCCESS: Showing conference meal information');
    } else {
      console.log('\n⚠️  UNCLEAR: Response doesn\'t clearly address lunch');
    }
  });
});

req.on('error', (e) => {
  console.error(`Problem with request: ${e.message}`);
});

req.write(data);
req.end();