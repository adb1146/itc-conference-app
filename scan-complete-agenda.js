const Anthropic = require('@anthropic-ai/sdk');

async function scanCompleteAgenda() {
  try {
    console.log('Scanning ITC Vegas 2025 for complete session count...\n');
    
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
        content: `Navigate to https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda

          YOUR MISSION: Count and extract EVERY SINGLE session from the ITC Vegas 2025 agenda.
          
          STEP 1 - COUNT SESSIONS:
          1. The page has THREE day tabs: Day One (Oct 14), Day Two (Oct 15), Day Three (Oct 16)
          2. Click on "Day One" tab
             - Count ALL session blocks/cards you see
             - Note any parallel tracks (multiple sessions at same time)
          3. Click on "Day Two" tab
             - Count ALL session blocks/cards
             - This is usually the busiest day with many parallel tracks
          4. Click on "Day Three" tab  
             - Count ALL session blocks/cards
          
          STEP 2 - IDENTIFY SESSION PATTERNS:
          Look for these elements that indicate a session:
          - Time blocks like "9:00 AM - 9:45 AM"
          - Session titles (often in bold or larger text)
          - Track/Stage labels (e.g., "Main Stage", "Technology Track", "Claims Track")
          - Speaker sections with "SPEAKERS" label
          - Speaker photos (circular images)
          - Speaker names and titles (e.g., "Manjit Rana, EVP - Clearspeed")
          
          STEP 3 - EXTRACT COMPLETE DATA:
          For EACH session found, extract:
          - Exact title
          - Start and end times
          - Date (which day)
          - Location/Track/Stage
          - Full description (if shown)
          - ALL speakers with:
            * Full name
            * Job title
            * Company
            * Photo URL (if visible)
          - Session type (Keynote, Panel, Workshop, etc.)
          
          IMPORTANT NOTES:
          - Some time slots have MULTIPLE parallel sessions (different tracks)
          - Don't miss networking events, meals, expo hours
          - The screenshot shows sessions with speakers like "Manjit Rana", "Scott Moore", "Kim Garland"
          - Look for ALL track stages: Main Stage, Technology, Claims, Distribution, Cyber, etc.
          
          Return a comprehensive JSON report:
          {
            "scanSummary": {
              "totalSessionsFound": <exact count>,
              "day1Count": <count>,
              "day2Count": <count>,
              "day3Count": <count>,
              "tracksFound": ["list", "of", "all", "tracks"],
              "sessionsWithSpeakers": <count of sessions that have speakers>,
              "totalSpeakersFound": <total unique speakers>
            },
            "sessions": [
              {
                "day": 1/2/3,
                "date": "2025-10-14/15/16",
                "timeSlot": "9:00 AM - 9:45 AM",
                "title": "Exact Session Title",
                "track": "Track/Stage Name",
                "location": "Room/Venue",
                "description": "Full description if available",
                "type": "Keynote/Panel/Workshop/etc",
                "speakers": [
                  {
                    "name": "Full Name",
                    "title": "Job Title",
                    "company": "Company Name",
                    "imageUrl": "URL if visible"
                  }
                ]
              }
            ],
            "missingData": {
              "sessionsWithoutSpeakers": ["list of session titles without speakers"],
              "sessionsWithoutDescriptions": <count>,
              "possibleMissedSessions": "Any indicators of sessions you might have missed"
            }
          }
          
          BE THOROUGH! Count everything you see. We need the COMPLETE agenda.`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 30,
        allowed_domains: ['vegas.insuretechconnect.com', 'insuretechconnect.com'],
        max_content_tokens: 250000
      }]
    });
    
    // Parse response
    console.log('Processing response...\n');
    let result = null;
    
    if (response.content && Array.isArray(response.content)) {
      for (const item of response.content) {
        if (item.type === 'text') {
          try {
            const text = item.text || '';
            // Try to find JSON in code blocks
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[1]);
              break;
            }
            // Try direct parse
            result = JSON.parse(text);
            break;
          } catch (e) {
            // Continue searching
          }
        }
      }
    }
    
    if (result) {
      console.log('=== SCAN COMPLETE ===\n');
      console.log('SUMMARY:');
      console.log(`  Total Sessions Found: ${result.scanSummary?.totalSessionsFound || result.sessions?.length || 0}`);
      console.log(`  Day 1: ${result.scanSummary?.day1Count || 0} sessions`);
      console.log(`  Day 2: ${result.scanSummary?.day2Count || 0} sessions`);
      console.log(`  Day 3: ${result.scanSummary?.day3Count || 0} sessions`);
      
      if (result.scanSummary?.tracksFound) {
        console.log(`\n  Tracks Found (${result.scanSummary.tracksFound.length}):`);
        result.scanSummary.tracksFound.forEach(track => {
          console.log(`    - ${track}`);
        });
      }
      
      console.log(`\n  Sessions with Speakers: ${result.scanSummary?.sessionsWithSpeakers || 0}`);
      console.log(`  Total Unique Speakers: ${result.scanSummary?.totalSpeakersFound || 0}`);
      
      // Sample sessions with speakers
      const sessionsWithSpeakers = result.sessions?.filter(s => s.speakers && s.speakers.length > 0) || [];
      if (sessionsWithSpeakers.length > 0) {
        console.log('\nSAMPLE SESSIONS WITH SPEAKERS:');
        sessionsWithSpeakers.slice(0, 5).forEach((s, i) => {
          console.log(`\n${i + 1}. ${s.title}`);
          console.log(`   Time: ${s.timeSlot}`);
          console.log(`   Track: ${s.track}`);
          s.speakers.forEach(speaker => {
            console.log(`   - ${speaker.name}${speaker.title ? ', ' + speaker.title : ''}${speaker.company ? ' @ ' + speaker.company : ''}`);
          });
        });
      }
      
      // Missing data report
      if (result.missingData) {
        console.log('\nDATA QUALITY REPORT:');
        if (result.missingData.sessionsWithoutSpeakers?.length > 0) {
          console.log(`  Sessions without speakers: ${result.missingData.sessionsWithoutSpeakers.length}`);
        }
        if (result.missingData.sessionsWithoutDescriptions) {
          console.log(`  Sessions without descriptions: ${result.missingData.sessionsWithoutDescriptions}`);
        }
        if (result.missingData.possibleMissedSessions) {
          console.log(`  Notes: ${result.missingData.possibleMissedSessions}`);
        }
      }
      
      // Save complete results
      require('fs').writeFileSync(
        'complete-agenda-scan.json',
        JSON.stringify(result, null, 2)
      );
      console.log('\n✓ Complete scan results saved to complete-agenda-scan.json');
      
      // Quick stats
      const totalSessions = result.sessions?.length || 0;
      const speakerCount = new Set();
      result.sessions?.forEach(s => {
        s.speakers?.forEach(sp => {
          if (sp.name) speakerCount.add(sp.name);
        });
      });
      
      console.log('\nFINAL STATS:');
      console.log(`  Sessions extracted: ${totalSessions}`);
      console.log(`  Unique speakers found: ${speakerCount.size}`);
      
    } else {
      console.log('ERROR: Could not parse response. No data extracted.');
    }
    
  } catch (error) {
    console.error('Scan error:', error.message);
  }
}

// Run with environment variable
scanCompleteAgenda();