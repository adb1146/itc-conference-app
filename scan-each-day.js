const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');

async function scanEachDay() {
  try {
    console.log('=== SCANNING ITC VEGAS 2025 - ALL THREE DAYS ===\n');
    
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

          CRITICAL: You MUST click on each day tab and extract ALL sessions from each day separately.
          
          STEP-BY-STEP INSTRUCTIONS:
          
          ==== STEP 1: DAY ONE (Tuesday, October 14, 2025) ====
          1. Click on the "Day One" tab/button
          2. Wait for the page to load completely
          3. Scroll down through the ENTIRE day's agenda
          4. Count every session block you see
          5. For EACH session, extract:
             - Time (e.g., "7:00 AM - 7:00 PM" for Badge Pickup)
             - Title (e.g., "Badge Pickup Hours")
             - Location/Track
             - Description
             - Look for SPEAKERS sections with:
               * Speaker photos (circular images)
               * Names (e.g., "Manjit Rana")
               * Titles (e.g., "EVP - Clearspeed")
          6. Note: Some sessions run in parallel (same time, different tracks)
          
          ==== STEP 2: DAY TWO (Wednesday, October 15, 2025) ====
          1. Click on the "Day Two" tab/button
          2. Wait for the page to load completely
          3. Scroll down through the ENTIRE day's agenda
          4. This is typically the busiest day with many parallel tracks:
             - Main Stage
             - Technology Track
             - Claims Track
             - Distribution Track
             - Cyber Track
             - And more...
          5. Extract EVERY session you see, including:
             - Keynotes
             - Panel discussions
             - Workshops
             - Networking events
             - Expo floor times
             - Meals and breaks
          
          ==== STEP 3: DAY THREE (Thursday, October 16, 2025) ====
          1. Click on the "Day Three" tab/button
          2. Wait for the page to load completely
          3. Scroll down through the ENTIRE day's agenda
          4. Extract all sessions including the closing events
          
          ==== IMPORTANT NOTES ====
          - Each day has its own set of sessions that are ONLY visible when that day's tab is active
          - You must click each tab separately - don't assume all sessions are visible at once
          - Look for parallel sessions at the same time slot
          - The page shows speaker photos and names - capture them!
          - Sessions like "Clearspeed Gives Back" have multiple speakers listed
          
          Return a comprehensive JSON with ALL sessions from ALL three days:
          {
            "scanComplete": true,
            "totalSessionsCounted": <exact total>,
            "dayBreakdown": {
              "day1": {
                "date": "2025-10-14",
                "sessionCount": <count>,
                "sessions": [/* all day 1 sessions */]
              },
              "day2": {
                "date": "2025-10-15",
                "sessionCount": <count>,
                "sessions": [/* all day 2 sessions */]
              },
              "day3": {
                "date": "2025-10-16",
                "sessionCount": <count>,
                "sessions": [/* all day 3 sessions */]
              }
            },
            "allSessions": [
              {
                "day": 1,
                "date": "2025-10-14",
                "startTime": "2025-10-14T07:00:00",
                "endTime": "2025-10-14T19:00:00",
                "title": "Badge Pickup Hours",
                "track": "Registration",
                "location": "Registration Desk",
                "description": "Stop by the registration desk...",
                "speakers": []
              },
              {
                "day": 2,
                "date": "2025-10-15",
                "startTime": "2025-10-15T11:00:00",
                "endTime": "2025-10-15T14:00:00",
                "title": "Clearspeed Gives Back",
                "track": "Main Stage",
                "location": "Main Stage",
                "description": "Join Clearspeed and ITC Vegas...",
                "speakers": [
                  {
                    "name": "Manjit Rana",
                    "title": "EVP",
                    "company": "Clearspeed"
                  },
                  {
                    "name": "Scott Moore",
                    "title": "CRO",
                    "company": "Clearspeed"
                  },
                  {
                    "name": "Kim Garland",
                    "title": "Former President",
                    "company": "State Auto"
                  },
                  {
                    "name": "Matthew Cantle",
                    "title": "EVP Global Technology",
                    "company": "Allied Universal"
                  }
                ]
              }
            ],
            "speakerSummary": {
              "totalUniqueSpeakers": <count>,
              "sessionsWithSpeakers": <count>,
              "speakerList": [/* unique speakers */]
            }
          }
          
          BE THOROUGH! Click each day tab. Scroll completely. Get EVERYTHING!`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 40,  // Increased for multiple page navigations
        allowed_domains: ['vegas.insuretechconnect.com'],
        max_content_tokens: 300000  // Increased for more content
      }]
    });
    
    // Parse response
    console.log('Processing comprehensive scan...\n');
    let result = null;
    
    if (response.content && Array.isArray(response.content)) {
      for (const item of response.content) {
        if (item.type === 'text') {
          try {
            const text = item.text || '';
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              result = JSON.parse(jsonMatch[1]);
              break;
            }
            result = JSON.parse(text);
            break;
          } catch (e) {
            continue;
          }
        }
      }
    }
    
    if (result && result.allSessions) {
      console.log('=== SCAN RESULTS ===\n');
      console.log(`✓ Scan Complete: ${result.scanComplete ? 'YES' : 'NO'}`);
      console.log(`✓ Total Sessions Found: ${result.totalSessionsCounted || result.allSessions.length}`);
      
      if (result.dayBreakdown) {
        console.log('\nSESSIONS BY DAY:');
        console.log(`  Day 1 (Oct 14): ${result.dayBreakdown.day1?.sessionCount || 0} sessions`);
        console.log(`  Day 2 (Oct 15): ${result.dayBreakdown.day2?.sessionCount || 0} sessions`);
        console.log(`  Day 3 (Oct 16): ${result.dayBreakdown.day3?.sessionCount || 0} sessions`);
      }
      
      // Track analysis
      const tracks = {};
      result.allSessions.forEach(s => {
        const track = s.track || 'Unspecified';
        tracks[track] = (tracks[track] || 0) + 1;
      });
      
      console.log('\nTRACKS FOUND:');
      Object.entries(tracks)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .forEach(([track, count]) => {
          console.log(`  ${track}: ${count} sessions`);
        });
      
      // Speaker analysis
      if (result.speakerSummary) {
        console.log('\nSPEAKER SUMMARY:');
        console.log(`  Total Unique Speakers: ${result.speakerSummary.totalUniqueSpeakers || 0}`);
        console.log(`  Sessions with Speakers: ${result.speakerSummary.sessionsWithSpeakers || 0}`);
        
        if (result.speakerSummary.speakerList && result.speakerSummary.speakerList.length > 0) {
          console.log('\n  Sample Speakers:');
          result.speakerSummary.speakerList.slice(0, 10).forEach((speaker, i) => {
            console.log(`    ${i + 1}. ${speaker.name} - ${speaker.title} @ ${speaker.company}`);
          });
        }
      }
      
      // Sessions with speakers
      const sessionsWithSpeakers = result.allSessions.filter(s => s.speakers && s.speakers.length > 0);
      if (sessionsWithSpeakers.length > 0) {
        console.log('\nSAMPLE SESSIONS WITH SPEAKERS:');
        sessionsWithSpeakers.slice(0, 5).forEach((session, i) => {
          console.log(`\n${i + 1}. ${session.title}`);
          console.log(`   Day ${session.day} - ${session.startTime?.substring(11, 16) || 'Time TBD'}`);
          session.speakers.forEach(speaker => {
            console.log(`   - ${speaker.name}, ${speaker.title} @ ${speaker.company}`);
          });
        });
        
        if (sessionsWithSpeakers.length > 5) {
          console.log(`\n... and ${sessionsWithSpeakers.length - 5} more sessions with speakers`);
        }
      }
      
      // Save comprehensive results
      fs.writeFileSync(
        'complete-three-day-agenda.json',
        JSON.stringify(result, null, 2)
      );
      console.log('\n✓ Complete agenda saved to complete-three-day-agenda.json');
      
      // Final summary
      console.log('\n=== FINAL SUMMARY ===');
      console.log(`Total Sessions Extracted: ${result.allSessions.length}`);
      console.log(`Sessions with Speakers: ${sessionsWithSpeakers.length}`);
      
      const uniqueSpeakers = new Set();
      result.allSessions.forEach(s => {
        s.speakers?.forEach(sp => {
          if (sp.name) uniqueSpeakers.add(sp.name);
        });
      });
      console.log(`Unique Speakers Found: ${uniqueSpeakers.size}`);
      
    } else {
      console.log('ERROR: Could not parse scan results');
    }
    
  } catch (error) {
    console.error('Scan error:', error.message);
  }
}

scanEachDay();