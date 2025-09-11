const Anthropic = require('@anthropic-ai/sdk');

async function testCompleteFetch() {
  try {
    console.log('Testing complete agenda fetch from ITC Vegas...');
    
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });
    
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 24000,
      messages: [{
        role: 'user',
        content: `Navigate to https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda
          
          CRITICAL INSTRUCTIONS:
          1. This page has THREE DAYS of agenda - you MUST click on each day tab:
             - Day One (Tuesday, October 14)
             - Day Two (Wednesday, October 15)  
             - Day Three (Thursday, October 16)
          
          2. For EACH DAY:
             - Click the day tab/button to load that day's sessions
             - Wait for content to load
             - Scroll through the ENTIRE day to see all sessions
             - Look for parallel tracks and concurrent sessions
          
          3. Extract EVERY session you can find including:
             - All keynotes and main stage presentations
             - All track sessions (Technology, Claims, Cyber, Distribution, etc.)
             - All workshops, panels, and fireside chats
             - All networking events, meals, and breaks
             - Registration, expo hours, parties
          
          4. For each session, extract:
             - Title (exact text)
             - Time (start and end)
             - Location/Room/Track
             - Description (if available)
             - Speakers with their names, titles, and companies
             - Session type (keynote, panel, workshop, etc.)
          
          5. Look for these specific elements:
             - Session cards/blocks with times like "9:00 AM - 9:45 AM"
             - Track labels like "Main Stage", "Technology Track", etc.
             - Speaker sections with photos and names
             - "SPEAKERS" labels on session cards
          
          Return a JSON object with ALL sessions:
          {
            "totalFound": <total number of sessions found>,
            "byDay": {
              "day1": <count>,
              "day2": <count>,
              "day3": <count>
            },
            "sessions": [
              {
                "day": "Day 1/2/3",
                "date": "October 14/15/16, 2025",
                "title": "exact session title",
                "startTime": "2025-10-15T09:00:00",
                "endTime": "2025-10-15T09:45:00",
                "location": "room/stage name",
                "track": "track name",
                "description": "session description",
                "type": "Keynote/Panel/Workshop/etc",
                "speakers": [
                  {
                    "name": "Speaker Name",
                    "title": "Job Title",
                    "company": "Company"
                  }
                ]
              }
            ]
          }
          
          IMPORTANT: The screenshot shows sessions with speakers like "Manjit Rana", "Scott Moore", etc.
          Make sure to capture ALL sessions across ALL three days!`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 20,
        allowed_domains: ['vegas.insuretechconnect.com'],
        max_content_tokens: 200000
      }]
    });
    
    // Parse response
    console.log('Response received, parsing...');
    let result = null;
    
    if (response.content && Array.isArray(response.content)) {
      for (const item of response.content) {
        if (item.type === 'text') {
          try {
            // Try to find JSON
            const text = item.text || '';
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[1]);
              break;
            }
            result = JSON.parse(text);
            break;
          } catch (e) {
            // Continue
          }
        }
      }
    }
    
    if (result && result.sessions) {
      console.log('\n=== FETCH RESULTS ===');
      console.log(`Total sessions found: ${result.totalFound || result.sessions.length}`);
      console.log('By day:', result.byDay || 'Not specified');
      console.log(`\nFirst 5 sessions:`);
      result.sessions.slice(0, 5).forEach((s, i) => {
        console.log(`\n${i + 1}. ${s.title}`);
        console.log(`   Time: ${s.startTime?.substring(11, 16)} - ${s.endTime?.substring(11, 16)}`);
        console.log(`   Location: ${s.location || 'TBD'}`);
        console.log(`   Speakers: ${s.speakers?.length || 0}`);
      });
      
      // Save to file for inspection
      require('fs').writeFileSync(
        'fetched-agenda.json', 
        JSON.stringify(result, null, 2)
      );
      console.log('\nFull results saved to fetched-agenda.json');
    } else {
      console.log('No sessions parsed from response');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testCompleteFetch();