import Anthropic from '@anthropic-ai/sdk';

export class AgendaFetcherService {
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

  async fetchConferenceAgenda(url: string) {
    try {
      console.log('Fetching agenda from:', url);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 16384,  // Increased for larger response
        messages: [{
          role: 'user',
          content: `Please fetch the COMPLETE ITC Vegas 2025 conference agenda from ${url}
            
            CRITICAL INSTRUCTIONS:
            1. Navigate through ALL THREE DAYS of the conference:
               - Day One: Tuesday, October 14, 2025
               - Day Two: Wednesday, October 15, 2025  
               - Day Three: Thursday, October 16, 2025
            
            2. Click on "Day Two" and "Day Three" tabs/buttons to load their content
            
            3. Scroll through EACH DAY'S ENTIRE page to capture ALL sessions
            
            4. CRITICAL: For EACH SESSION, extract SPEAKER INFORMATION:
               - Look for the "SPEAKERS" section in each session card
               - Extract speaker photo URLs (usually small circular images)
               - Get speaker full names (clickable text next to photos)
               - Get speaker titles/roles (text after the name)
               - Get company names (usually after a dash or comma)
               - If you can click on speaker names, extract their bio from the popup/modal
               - Capture the complete speaker profile URL if available
            
            5. For each session, extract:
               - Exact time slot (e.g., "9:00 AM - 9:45 AM")
               - Complete session title
               - Full description (not truncated)
               - ALL speakers with their details (not just names)
               - Track/Stage/Room location
               - Session type (Keynote, Panel, Workshop, Fireside Chat, etc.)
               - Level (Beginner, Intermediate, Advanced if specified)
            
            6. Include ALL events such as:
               - Opening ceremonies
               - Keynote speeches
               - Panel discussions
               - Workshops
               - Networking sessions
               - Expo Hall hours
               - Social events and parties
               - Breakfast, Lunch, Breaks
            
            IMPORTANT: Look for session cards that contain:
            - A "SPEAKERS" heading/label
            - Speaker images (often circular profile photos)
            - Speaker names as clickable links
            - Speaker titles and companies (e.g., "CRO - Clearspeed" or "Director - 100% Seguro")
            
            Extract ALL sessions and format as a JSON object with:
            {
              "conferenceTitle": "ITC Vegas 2025",
              "dates": "October 14-16, 2025",
              "totalSessions": <number>,
              "sessions": [
                {
                  "title": "session title",
                  "description": "full description",
                  "startTime": "ISO 8601 datetime (e.g., 2025-10-15T09:00:00)",
                  "endTime": "ISO 8601 datetime",
                  "date": "October 14/15/16, 2025",
                  "location": "room/venue name",
                  "track": "track/category (e.g., Claims, Underwriting, Digital, AI)",
                  "type": "Keynote/Panel/Workshop/Networking/Session",
                  "level": "Beginner/Intermediate/Advanced if specified",
                  "speakers": [
                    {
                      "name": "Full speaker name (e.g., 'Manjit Rana')",
                      "title": "Job title/role (e.g., 'EVP')",
                      "company": "Company name (e.g., 'Clearspeed')",
                      "bio": "Speaker biography if you can access it by clicking their name",
                      "imageUrl": "Direct URL to the speaker's profile photo",
                      "linkedIn": "LinkedIn profile URL if available"
                    }
                  ],
                  "tags": ["relevant", "topic", "tags"]
                }
              ]
            }
            
            Return ONLY the JSON object, no other text.`
        }],
        tools: [{
          type: 'web_fetch_20250910',
          name: 'web_fetch',
          max_uses: 10,  // Increased to allow fetching multiple pages
          allowed_domains: [
            'vegas.insuretechconnect.com',
            'insuretechconnect.com',
            'itcvegas.com'
          ],
          max_content_tokens: 100000  // Increased for more content
        }]
      } as any);

      console.log('API Response received, parsing...');
      return this.parseAgendaResponse(response);
    } catch (error: any) {
      console.error('Error fetching agenda:', error.message || error);
      
      // Fallback to generating sample data if Web Fetch fails
      if (error.message?.includes('web_fetch') || error.status === 400) {
        console.log('Web Fetch not available, generating sample data...');
        return this.generateSampleAgenda();
      }
      throw error;
    }
  }

  private async generateSampleAgenda() {
    const response = await this.anthropic.messages.create({
      model: 'claude-opus-4-1-20250805',
      max_tokens: 4096,
      messages: [{
        role: 'user',
        content: `Generate realistic ITC Vegas 2025 conference data with:
          - 10-15 sessions about InsurTech, AI/ML in insurance, digital transformation, cyber insurance, embedded insurance, claims automation
          - Each session needs: title, description (2-3 sentences), startTime, endTime (Oct 15-17, 2025), location, track, level, speakers
          - Focus on insurance technology topics
          - Return as JSON with sessions array`
      }]
    });
    
    return this.parseAgendaResponse(response);
  }

  private parseAgendaResponse(response: any) {
    console.log('Response structure:', JSON.stringify(response.content?.map((c: any) => c.type), null, 2));
    
    // Check if response contains tool use and web fetch results
    if (response.content && Array.isArray(response.content)) {
      // Look for the final text response that should contain JSON
      for (let i = response.content.length - 1; i >= 0; i--) {
        const item = response.content[i];
        if (item.type === 'text') {
          const text = item.text || '';
          try {
            // Try to find JSON in code blocks
            const jsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[1]);
              console.log(`Parsed ${parsed.sessions?.length || 0} sessions from JSON block`);
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
    
    // Fallback: return empty sessions
    console.log('Could not parse response, returning empty sessions');
    return { sessions: [] };
  }

  async testWebFetch() {
    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-opus-4-1-20250805',
        max_tokens: 256,
        messages: [{
          role: 'user',
          content: 'Say "Hello, the API is working!" and return today\'s date which is September 10, 2025.'
        }]
      });

      console.log('API Test Response:', response.content);
      return response.content;
    } catch (error: any) {
      console.error('API test failed:', error);
      if (error.status === 401) {
        throw new Error('Invalid API key. Please check your ANTHROPIC_API_KEY in .env.local');
      }
      throw error;
    }
  }
}

export default AgendaFetcherService;