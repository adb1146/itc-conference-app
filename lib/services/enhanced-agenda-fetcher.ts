import Anthropic from '@anthropic-ai/sdk';

export class EnhancedAgendaFetcherService {
  private anthropic: Anthropic;

  constructor() {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not set in environment variables');
    }
    
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      defaultHeaders: {
        'anthropic-beta': 'web-fetch-2025-09-10'
      }
    });
  }

  async fetchDetailedAgenda(url: string) {
    try {
      console.log('Fetching detailed agenda with speakers from:', url);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 16384,
        messages: [{
          role: 'user',
          content: `Navigate to ${url} and extract the COMPLETE conference agenda with speaker details.
            
            CRITICAL INSTRUCTIONS FOR SPEAKER EXTRACTION:
            
            1. Look at the screenshot provided - I can see sessions have "SPEAKERS" sections
            2. For sessions like "Clearspeed Gives Back" I can see:
               - Speaker photos (circular images)
               - Names like "Manjit Rana", "Scott Moore", "Kim Garland", "Matthew Cantle"
               - Titles like "EVP - Clearspeed", "CRO - Clearspeed", etc.
            
            3. For ITC LATAM sessions, I can see speakers like:
               - "Leonardo Redolfi, Director - 100% Seguro"
               - "Hernan Fernandez, Director - 100% Seguro"
            
            4. EXTRACT THIS INFORMATION:
               - Click on ALL three day tabs (Day 1, Day 2, Day 3)
               - For EACH session card, look for the "SPEAKERS" label
               - Extract the speaker images (src URLs)
               - Extract speaker names (the clickable text)
               - Extract titles/companies (text after name, usually with dash)
               - If possible, click on speaker names to get their full bio
            
            5. HTML PATTERNS TO LOOK FOR:
               - Speaker sections often have class names like "speakers", "speaker-list", "presenters"
               - Images in circular frames (border-radius: 50%)
               - Name elements as links or bold text
               - Title/company in smaller text or after a separator
            
            Return a JSON object with sessions INCLUDING speakers:
            {
              "conferenceTitle": "ITC Vegas 2025",
              "dates": "October 14-16, 2025",
              "sessions": [
                {
                  "title": "Session Title",
                  "description": "Description",
                  "startTime": "2025-10-15T09:00:00",
                  "endTime": "2025-10-15T10:00:00",
                  "location": "Room/Stage",
                  "track": "Track name",
                  "speakers": [
                    {
                      "name": "Speaker Full Name",
                      "title": "Job Title",
                      "company": "Company Name",
                      "imageUrl": "https://... (actual image URL)",
                      "bio": "Full bio if accessible"
                    }
                  ]
                }
              ]
            }
            
            IMPORTANT: Based on the screenshot, sessions DO have speakers. Extract them!`
        }],
        tools: [{
          type: 'web_fetch_20250910',
          name: 'web_fetch',
          max_uses: 15,
          allowed_domains: [
            'vegas.insuretechconnect.com',
            'insuretechconnect.com'
          ],
          max_content_tokens: 150000
        } as any]
      } as any);

      console.log('API Response received, parsing...');
      return this.parseResponse(response);
    } catch (error: any) {
      console.error('Error fetching detailed agenda:', error.message || error);
      throw error;
    }
  }

  private parseResponse(response: any) {
    console.log('Response structure:', JSON.stringify(response.content?.map((c: any) => c.type), null, 2));
    
    if (response.content && Array.isArray(response.content)) {
      for (let i = response.content.length - 1; i >= 0; i--) {
        const item = response.content[i];
        if (item.type === 'text') {
          const text = item.text || '';
          try {
            // Try to find JSON in code blocks
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1]);
              console.log(`Parsed ${parsed.sessions?.length || 0} sessions`);
              
              // Count sessions with speakers
              const sessionsWithSpeakers = parsed.sessions?.filter((s: any) => 
                s.speakers && s.speakers.length > 0
              ).length || 0;
              console.log(`Sessions with speakers: ${sessionsWithSpeakers}`);
              
              return parsed;
            }
            // Try to parse the entire text as JSON
            const parsed = JSON.parse(text);
            console.log(`Parsed ${parsed.sessions?.length || 0} sessions from text`);
            return parsed;
          } catch (e) {
            // Continue looking
          }
        }
      }
    }
    
    console.log('Could not parse response, returning empty sessions');
    return { sessions: [] };
  }
}

export default EnhancedAgendaFetcherService;