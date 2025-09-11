const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

async function simpleFetchAll() {
  try {
    console.log('Fetching all sessions from ITC Vegas 2025...\n');
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 30000,
      messages: [{
        role: 'user',
        content: `Go to https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda

          Please do the following:
          1. Click on "Day One" tab and list ALL sessions you see
          2. Click on "Day Two" tab and list ALL sessions you see  
          3. Click on "Day Three" tab and list ALL sessions you see
          
          For each session, extract:
          - Title
          - Time
          - Speakers (if shown)
          
          Return as simple JSON:
          {
            "day1": [
              {
                "title": "session title",
                "time": "time slot",
                "speakers": ["name1", "name2"]
              }
            ],
            "day2": [...],
            "day3": [...]
          }`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 20,
        allowed_domains: ['vegas.insuretechconnect.com'],
        max_content_tokens: 200000
      }]
    });
    
    // Get the raw response
    console.log('Response received. Content items:', response.content?.length);
    
    // Try to extract JSON from any text content
    let jsonData = null;
    
    if (response.content && Array.isArray(response.content)) {
      for (const item of response.content) {
        console.log('Content type:', item.type);
        
        if (item.type === 'text') {
          const text = item.text || '';
          
          // Save raw text for inspection
          fs.writeFileSync('raw-response.txt', text);
          console.log('Raw response saved to raw-response.txt');
          
          // Try to extract JSON
          try {
            // Look for JSON in code blocks
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              jsonData = JSON.parse(jsonMatch[1]);
              console.log('Found JSON in code block');
            } else {
              // Try direct parse
              jsonData = JSON.parse(text);
              console.log('Parsed direct JSON');
            }
          } catch (e) {
            console.log('Could not parse as JSON, checking for structured data...');
            
            // Try to extract any structured data
            if (text.includes('day1') || text.includes('Day 1') || text.includes('Day One')) {
              console.log('Response contains day references');
            }
          }
        }
      }
    }
    
    if (jsonData) {
      // Count sessions
      const day1Count = jsonData.day1?.length || 0;
      const day2Count = jsonData.day2?.length || 0;
      const day3Count = jsonData.day3?.length || 0;
      const total = day1Count + day2Count + day3Count;
      
      console.log('\n=== SESSIONS FOUND ===');
      console.log(`Day 1: ${day1Count} sessions`);
      console.log(`Day 2: ${day2Count} sessions`);
      console.log(`Day 3: ${day3Count} sessions`);
      console.log(`TOTAL: ${total} sessions`);
      
      // Save the data
      fs.writeFileSync('all-sessions.json', JSON.stringify(jsonData, null, 2));
      console.log('\nData saved to all-sessions.json');
      
      // Show sample sessions with speakers
      let sessionsWithSpeakers = 0;
      ['day1', 'day2', 'day3'].forEach(day => {
        if (jsonData[day]) {
          jsonData[day].forEach(session => {
            if (session.speakers && session.speakers.length > 0) {
              sessionsWithSpeakers++;
              if (sessionsWithSpeakers <= 5) {
                console.log(`\n${session.title}`);
                console.log(`  Time: ${session.time}`);
                console.log(`  Speakers: ${session.speakers.join(', ')}`);
              }
            }
          });
        }
      });
      
      if (sessionsWithSpeakers > 0) {
        console.log(`\nTotal sessions with speakers: ${sessionsWithSpeakers}`);
      }
      
    } else {
      console.log('\nNo structured data could be extracted.');
      console.log('Check raw-response.txt for the actual response content.');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

simpleFetchAll();