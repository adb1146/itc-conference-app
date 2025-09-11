/**
 * Test script for Firecrawl extraction
 * 
 * To use this:
 * 1. Sign up for a free Firecrawl account at https://www.firecrawl.dev/
 * 2. Get your API key from the dashboard
 * 3. Update the FIRECRAWL_API_KEY in your .env.local file
 * 4. Run: node test-firecrawl.js
 */

async function testFirecrawlExtraction() {
  const url = 'http://localhost:3011/api/agenda/firecrawl-extract';
  
  try {
    console.log('Testing Firecrawl extraction...');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda',
        pageNumbers: [1, 2, 3] // Extract all 3 days
      })
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ Extraction successful!');
      console.log('Stats:', data.stats);
      console.log('\nSample sessions:');
      if (data.sample) {
        data.sample.forEach((session, i) => {
          console.log(`\n${i + 1}. ${session.title}`);
          console.log(`   Time: ${session.startTime} - ${session.endTime}`);
          console.log(`   Track: ${session.track}`);
          if (session.speakers && session.speakers.length > 0) {
            console.log(`   Speakers: ${session.speakers.map(s => s.name).join(', ')}`);
          }
        });
      }
    } else {
      console.error('❌ Extraction failed:', data.error);
      if (data.error.includes('API key')) {
        console.log('\n📝 To get a Firecrawl API key:');
        console.log('1. Go to https://www.firecrawl.dev/');
        console.log('2. Sign up for a free account');
        console.log('3. Copy your API key from the dashboard');
        console.log('4. Add it to your .env.local file as FIRECRAWL_API_KEY');
      }
    }
  } catch (error) {
    console.error('Error calling extraction API:', error);
  }
}

// Run the test
testFirecrawlExtraction();