const Anthropic = require('@anthropic-ai/sdk');

async function testOpusDirect() {
  try {
    console.log('Testing Web Fetch with Opus 4.1 and beta header in client...');
    
    // Initialize client with beta header
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });
    
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
      }]
    });
    
    console.log('Response:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

testOpusDirect();