/**
 * Test Semantic Search vs Keyword Search
 * Demonstrates the difference between vector-based and keyword-based search
 */

const fetch = require('node-fetch');

async function testSearch() {
  const baseUrl = 'http://localhost:3011';
  
  // Test queries that show semantic understanding
  const testQueries = [
    {
      query: "What AI sessions match my interests?",
      description: "Direct AI query"
    },
    {
      query: "How can I improve customer experience?",
      description: "Conceptual query about customer experience"
    },
    {
      query: "Sessions about the future of insurance",
      description: "Forward-looking conceptual query"
    },
    {
      query: "What should a claims manager attend?",
      description: "Role-based recommendation query"
    }
  ];

  for (const test of testQueries) {
    console.log('\n' + '='.repeat(60));
    console.log(`Testing: "${test.query}"`);
    console.log(`(${test.description})`);
    console.log('='.repeat(60));
    
    try {
      // Test keyword-based search
      console.log('\n📌 Keyword-based Search (/api/chat/intelligent):');
      const keywordResponse = await fetch(`${baseUrl}/api/chat/intelligent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: test.query,
          userPreferences: {
            name: 'Test User',
            interests: ['AI', 'Innovation'],
            goals: ['Learn', 'Network']
          }
        })
      });
      
      if (keywordResponse.ok) {
        const keywordData = await keywordResponse.json();
        console.log(`  - Found ${keywordData.sessions?.length || 0} sessions`);
        console.log(`  - Model used: ${keywordData.metadata?.model || 'unknown'}`);
        if (keywordData.sessions?.length > 0) {
          console.log('  - Sample sessions:');
          keywordData.sessions.slice(0, 3).forEach(s => {
            console.log(`    • ${s.title}`);
          });
        }
      } else {
        console.log('  - Error:', keywordResponse.status);
      }
      
      // Test vector-based search
      console.log('\n🧬 Vector-based Search (/api/chat/vector):');
      const vectorResponse = await fetch(`${baseUrl}/api/chat/vector`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: test.query,
          userPreferences: {
            name: 'Test User',
            interests: ['AI', 'Innovation'],
            goals: ['Learn', 'Network']
          }
        })
      });
      
      if (vectorResponse.ok) {
        const vectorData = await vectorResponse.json();
        console.log(`  - Found ${vectorData.sessions?.length || 0} sessions`);
        console.log(`  - Search type: ${vectorData.metadata?.searchType || 'unknown'}`);
        console.log(`  - Semantic search: ${vectorData.metadata?.semanticSearch || false}`);
        if (vectorData.sessions?.length > 0) {
          console.log('  - Sample sessions:');
          vectorData.sessions.slice(0, 3).forEach(s => {
            console.log(`    • ${s.title}`);
          });
        }
        
        // Show a snippet of the AI's response
        if (vectorData.response) {
          const preview = vectorData.response.substring(0, 200);
          console.log('\n  AI Response Preview:');
          console.log('  "' + preview + '..."');
        }
      } else {
        console.log('  - Error:', vectorResponse.status);
        const errorData = await vectorResponse.json();
        console.log('  - Details:', errorData.error);
      }
      
    } catch (error) {
      console.error('Test failed:', error.message);
    }
    
    // Wait a bit between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`
The vector-based search should:
1. Return fewer but more relevant sessions
2. Find conceptually related content without exact keywords
3. Provide better explanations of why sessions are relevant
4. Handle abstract queries better than keyword matching
  `);
}

// Run the test
testSearch().catch(console.error);