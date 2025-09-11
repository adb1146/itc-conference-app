const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function testWebSearch() {
  try {
    console.log('Testing Web Search with Anthropic API...');
    console.log('Using model: claude-3-5-sonnet-latest');
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-latest',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: 'Search for information about the ITC Vegas 2025 conference agenda'
      }],
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search'
      }],
      extra_headers: {
        'anthropic-beta': 'web-search-2025-03-05'
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

testWebSearch();