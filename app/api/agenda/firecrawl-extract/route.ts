import { NextRequest, NextResponse } from 'next/server';
import FirecrawlApp from '@mendable/firecrawl-js';
import prisma from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-guards';

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
    }

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const { url } = await request.json();
    
    if (!process.env.FIRECRAWL_API_KEY) {
      return NextResponse.json({
        error: 'Firecrawl API key not configured. Please add FIRECRAWL_API_KEY to your .env.local file'
      }, { status: 500 });
    }

    // Initialize Firecrawl
    const app = new FirecrawlApp({ 
      apiKey: process.env.FIRECRAWL_API_KEY
    });

    console.log(`Starting Firecrawl extraction from: ${url}`);
    
    const allSessions: any[] = [];
    const allSpeakers = new Map<string, any>();
    
    // Crawl all agenda pages
    console.log('Starting crawl of ITC Vegas agenda...');
    
    try {
      // Use crawl to get all agenda pages
      const crawlResult = await app.crawl(url, {
        limit: 10, // Limit to 10 pages
        scrapeOptions: {
          formats: ['markdown', 'html']
        }
      });
      
      console.log(`Crawled ${crawlResult.data?.length || 0} pages`);
      
      if (crawlResult.data && crawlResult.data.length > 0) {
        for (const page of crawlResult.data) {
          // Extract sessions from markdown content
          const content = page.markdown || (page as any).content || '';
          
          // Parse sessions using regex patterns
          const sessionPattern = /### (.+?)\n([\s\S]+?)(?=\n###|\n##|$)/g;
          let match;
          
          while ((match = sessionPattern.exec(content)) !== null) {
            const title = match[1].trim();
            const details = match[2].trim();
            
            // Extract time if present
            const timeMatch = details.match(/(\d{1,2}:\d{2}\s*[AP]M)\s*-\s*(\d{1,2}:\d{2}\s*[AP]M)/);
            
            // Extract speakers
            const speakerPattern = /([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),?\s*(?:([^,\n]+?),?\s*([^,\n]+?))?(?:\n|,|$)/g;
            const speakers: any[] = [];
            let speakerMatch;
            
            while ((speakerMatch = speakerPattern.exec(details)) !== null) {
              const name = speakerMatch[1];
              const role = speakerMatch[2];
              const company = speakerMatch[3];
              
              if (name && name.length > 3 && name.split(' ').length >= 2) {
                speakers.push({ name, role, company });
                allSpeakers.set(name, { name, role, company });
              }
            }
            
            // Determine day from URL
            let day = 1;
            const pageUrl = (page as any).url || (page as any).sourceUrl || '';
            if (pageUrl.includes('day=2')) day = 2;
            if (pageUrl.includes('day=3')) day = 3;
            
            const session = {
              title,
              description: details.substring(0, 500),
              day,
              startTime: timeMatch ? timeMatch[1] : null,
              endTime: timeMatch ? timeMatch[2] : null,
              speakers
            };
            
            allSessions.push(session);
          }
        }
      }
    } catch (crawlError) {
      console.error('Crawl error, trying simple scrape:', crawlError);
      
      // Fallback to simple scrape
      const scrapeResult = await app.scrape(url);
      
      if ((scrapeResult as any).data) {
        const data = (scrapeResult as any).data;
        const content = data.markdown || data.content || '';
        
        // Basic extraction from content
        const lines = content.split('\n');
        let currentSession: any = null;
        
        for (const line of lines) {
          // Look for session titles (usually in headers or bold)
          if (line.startsWith('###') || line.startsWith('**')) {
            if (currentSession) {
              allSessions.push(currentSession);
            }
            currentSession = {
              title: line.replace(/^###\s*/, '').replace(/^\*\*/, '').replace(/\*\*$/, '').trim(),
              day: 1,
              speakers: []
            };
          } else if (currentSession && line.includes(':')) {
            // Look for time patterns
            const timeMatch = line.match(/(\d{1,2}:\d{2}\s*[AP]M)/g);
            if (timeMatch && timeMatch.length >= 2) {
              currentSession.startTime = timeMatch[0];
              currentSession.endTime = timeMatch[1];
            }
          }
        }
        
        if (currentSession) {
          allSessions.push(currentSession);
        }
      }
    }
    
    console.log(`Extracted ${allSessions.length} sessions and ${allSpeakers.size} speakers`);
    
    // Save to database
    let savedSessions = 0;
    let savedSpeakers = 0;
    
    // Save speakers first
    for (const [name, speaker] of allSpeakers) {
      try {
        await prisma.speaker.upsert({
          where: { name },
          update: {
            role: speaker.role,
            company: speaker.company
          },
          create: {
            name,
            role: speaker.role,
            company: speaker.company
          }
        });
        savedSpeakers++;
      } catch (error) {
        console.error(`Error saving speaker ${name}:`, error);
      }
    }
    
    // Save sessions
    for (const session of allSessions) {
      if (!session.title) continue;
      
      try {
        // Parse times if they're strings
        const startTime = session.startTime ? 
          new Date(`2025-10-${13 + session.day} ${session.startTime}`) : new Date(`2025-10-${13 + session.day} 09:00`);
        const endTime = session.endTime ? 
          new Date(`2025-10-${13 + session.day} ${session.endTime}`) : new Date(`2025-10-${13 + session.day} 10:00`);
        
        const savedSession = await prisma.session.upsert({
          where: { 
            title: session.title 
          },
          update: {
            description: session.description,
            startTime,
            endTime,
            location: session.location || 'TBD',
            tags: [`day${session.day}`]
          },
          create: {
            title: session.title,
            description: session.description,
            startTime,
            endTime,
            location: session.location || 'TBD',
            tags: [`day${session.day}`]
          }
        });
        
        // Link speakers to session
        if (session.speakers && session.speakers.length > 0) {
          for (const speaker of session.speakers) {
            if (speaker.name) {
              const dbSpeaker = await prisma.speaker.findUnique({
                where: { name: speaker.name }
              });
              
              if (dbSpeaker) {
                await prisma.sessionSpeaker.upsert({
                  where: {
                    sessionId_speakerId: {
                      sessionId: savedSession.id,
                      speakerId: dbSpeaker.id
                    }
                  },
                  update: {},
                  create: {
                    sessionId: savedSession.id,
                    speakerId: dbSpeaker.id
                  }
                });
              }
            }
          }
        }
        
        savedSessions++;
      } catch (error) {
        console.error(`Error saving session:`, error);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Firecrawl extraction complete`,
      stats: {
        sessionsExtracted: allSessions.length,
        sessionsSaved: savedSessions,
        speakersExtracted: allSpeakers.size,
        speakersSaved: savedSpeakers
      },
      sample: allSessions.slice(0, 3)
    });
    
  } catch (error) {
    console.error('Firecrawl extraction error:', error);
    return NextResponse.json({
      error: 'Failed to extract agenda data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
