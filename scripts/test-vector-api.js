const fetch = require('node-fetch');

async function testVectorAPI() {
  try {
    const response = await fetch('http://localhost:3011/api/chat/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "How can I improve customer experience using AI?",
        userPreferences: {
          name: "Test User",
          interests: ["AI", "Customer Experience"],
          goals: ["Learn", "Innovate"]
        }
      })
    });

    const data = await response.json();
    
    console.log('=== RESPONSE PREVIEW ===');
    console.log(data.response.substring(0, 1500));
    
    console.log('\n=== CHECKING FOR HYPERLINKS ===');
    // Check if response contains markdown links
    const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
    const links = data.response.match(linkPattern);
    
    if (links) {
      console.log('Found', links.length, 'hyperlinks in response:');
      links.slice(0, 10).forEach(link => {
        console.log('  •', link);
      });
    } else {
      console.log('WARNING: No hyperlinks found in response!');
    }
    
    console.log('\n=== METADATA ===');
    console.log('Search type:', data.metadata?.searchType);
    console.log('Sessions found:', data.metadata?.sessionsFound);
    console.log('Semantic search:', data.metadata?.semanticSearch);
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testVectorAPI();