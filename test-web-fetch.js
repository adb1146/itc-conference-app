const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testWebFetch() {
  try {
    console.log('Testing Web Fetch with Anthropic API...');
    console.log('Using model: claude-opus-4-1-20250805');
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Please analyze the content at https://example.com'
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 5
      }],
      extra_headers: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });
    
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testWebFetch();