const fetch = require('node-fetch');

async function testChatLinks() {
  try {
    console.log('🧪 Testing Chat API with Hyperlink Generation...\n');
    
    const response = await fetch('http://localhost:3011/api/chat/vector', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: "Show me all the keynote speakers",
        userPreferences: {
          name: "Test User",
          interests: ["AI", "Innovation"],
          goals: ["Learn", "Network"]
        }
      })
    });

    const data = await response.json();
    
    if (data.response) {
      console.log('✅ Response received successfully\n');
      
      // Check for markdown links in the response
      const linkPattern = /\[([^\]]+)\]\(([^\)]+)\)/g;
      const links = data.response.match(linkPattern);
      
      if (links && links.length > 0) {
        console.log('🔗 HYPERLINKS FOUND:', links.length);
        console.log('\nSample links:');
        links.slice(0, 5).forEach(link => {
          console.log('  •', link);
        });
        console.log('\n✅ SUCCESS: AI is generating clickable hyperlinks!');
      } else {
        console.log('❌ WARNING: No markdown links found in response');
        console.log('\nResponse preview:', data.response.substring(0, 500));
      }
      
      // Check metadata
      console.log('\n📊 Metadata:');
      console.log('  • Search type:', data.metadata?.searchType);
      console.log('  • Semantic search:', data.metadata?.semanticSearch);
      console.log('  • Sessions found:', data.metadata?.sessionsFound);
      
    } else {
      console.log('❌ Error:', data.error || 'No response received');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testChatLinks();