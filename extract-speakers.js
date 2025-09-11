const Anthropic = require('@anthropic-ai/sdk');

async function extractSpeakers() {
  try {
    console.log('Extracting speaker details from ITC Vegas 2025...\n');
    
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

          FOCUS: Extract ALL speaker information from session cards.
          
          Based on the screenshot I provided earlier, I can see sessions with SPEAKERS sections containing:
          - Manjit Rana (EVP - Clearspeed)
          - Scott Moore (CRO - Clearspeed)  
          - Kim Garland (Former President - State Auto)
          - Matthew Cantle (EVP Global Technology - Allied Universal)
          - Leonardo Redolfi (Director - 100% Seguro)
          - Hernan Fernandez (Director - 100% Seguro)
          - And many more...
          
          YOUR TASK:
          1. Go through EACH DAY (click Day One, Day Two, Day Three tabs)
          2. For EACH session card, look for:
             - The "SPEAKERS" label/heading
             - Speaker photos (circular profile images)
             - Speaker names (often clickable links)
             - Speaker titles and companies (e.g., "CRO - Clearspeed")
          
          3. Extract this exact information:
             - Session title (to link speakers to sessions)
             - Each speaker's:
               * Full name
               * Job title/role
               * Company name
               * Photo URL if visible
               * Any bio text if you can access it
          
          Return a JSON object focused on speakers:
          {
            "speakerCount": <total unique speakers found>,
            "sessionSpeakerMappings": [
              {
                "sessionTitle": "Clearspeed Gives Back",
                "speakers": [
                  {
                    "name": "Manjit Rana",
                    "title": "EVP",
                    "company": "Clearspeed",
                    "imageUrl": "URL if visible"
                  },
                  {
                    "name": "Scott Moore",
                    "title": "CRO",
                    "company": "Clearspeed",
                    "imageUrl": "URL if visible"
                  }
                ]
              },
              {
                "sessionTitle": "ITC LATAM Opening Remarks",
                "speakers": [
                  {
                    "name": "Leonardo Redolfi",
                    "title": "Director",
                    "company": "100% Seguro",
                    "imageUrl": "URL if visible"
                  }
                ]
              }
            ],
            "uniqueSpeakers": [
              {
                "name": "Full Name",
                "title": "Job Title",
                "company": "Company",
                "sessions": ["List of sessions they speak at"]
              }
            ]
          }
          
          BE THOROUGH! The screenshot clearly shows these speakers exist. Find them all!`
      }],
      tools: [{
        type: 'web_fetch_20250910',
        name: 'web_fetch',
        max_uses: 30,
        allowed_domains: ['vegas.insuretechconnect.com'],
        max_content_tokens: 250000
      }]
    });
    
    // Parse response
    console.log('Processing speaker data...\n');
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
            // Continue
          }
        }
      }
    }
    
    if (result) {
      console.log('=== SPEAKER EXTRACTION COMPLETE ===\n');
      console.log(`Total unique speakers found: ${result.speakerCount || 0}`);
      console.log(`Sessions with speakers: ${result.sessionSpeakerMappings?.length || 0}`);
      
      // Show sessions with speakers
      if (result.sessionSpeakerMappings && result.sessionSpeakerMappings.length > 0) {
        console.log('\nSESSIONS WITH SPEAKERS:');
        result.sessionSpeakerMappings.slice(0, 10).forEach((mapping, i) => {
          console.log(`\n${i + 1}. ${mapping.sessionTitle}`);
          mapping.speakers.forEach(speaker => {
            console.log(`   - ${speaker.name}, ${speaker.title} @ ${speaker.company}`);
          });
        });
        
        if (result.sessionSpeakerMappings.length > 10) {
          console.log(`\n... and ${result.sessionSpeakerMappings.length - 10} more sessions with speakers`);
        }
      }
      
      // List unique speakers
      if (result.uniqueSpeakers && result.uniqueSpeakers.length > 0) {
        console.log('\n\nUNIQUE SPEAKERS:');
        result.uniqueSpeakers.slice(0, 20).forEach((speaker, i) => {
          console.log(`${i + 1}. ${speaker.name} - ${speaker.title} @ ${speaker.company}`);
          if (speaker.sessions && speaker.sessions.length > 0) {
            console.log(`   Sessions: ${speaker.sessions.join(', ')}`);
          }
        });
        
        if (result.uniqueSpeakers.length > 20) {
          console.log(`\n... and ${result.uniqueSpeakers.length - 20} more speakers`);
        }
      }
      
      // Save results
      require('fs').writeFileSync(
        'speakers-extracted.json',
        JSON.stringify(result, null, 2)
      );
      console.log('\n✓ Speaker data saved to speakers-extracted.json');
      
    } else {
      console.log('ERROR: Could not extract speaker data');
    }
    
  } catch (error) {
    console.error('Extraction error:', error.message);
  }
}

extractSpeakers();