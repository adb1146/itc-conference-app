import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { createEnhancedPrompt, analyzeQueryComplexity } from '@/lib/prompt-engine';
import { selectMasterPrompts } from '@/lib/prompts/master-prompt';
import { hybridSearch } from '@/lib/vector-db';
import { searchLocalSessions, upsertSessionsToLocalDB, localVectorDB } from '@/lib/local-vector-db';
import prisma from '@/lib/db';

/**
 * Vector-based Intelligent Chat API
 * Uses semantic search instead of keyword matching
 */
interface SourceInfo {
  type: 'vector' | 'web' | 'itc';
  title: string;
  url?: string;
  confidence?: number;
  excerpt?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check for API keys and decide which vector DB to use
    const hasExternalAPIs = process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY &&
                            !process.env.OPENAI_API_KEY.includes('<your');

    // Analyze query complexity
    const queryComplexity = analyzeQueryComplexity(message);

    // Extract keywords for hybrid search
    const keywords = extractKeywords(message);

    // Detect time-based queries
    const isTimeBasedQuery = /\b(now|next|upcoming|today|tomorrow|morning|afternoon|evening|after|before|current|remaining|rest of|what's on)\b/i.test(message);
    const isSpecificTimeQuery = /\b(\d{1,2}:\d{2}|\d{1,2}\s*(am|pm)|morning|afternoon|evening|lunch|breakfast|dinner)\b/i.test(message);

    // Check if this is an "Ask AI about" query
    const isAskAIQuery = message.includes('Tell me everything about') &&
                         message.includes('Search the web for information');

    // Check if we should perform web search
    const shouldSearchWeb = message.toLowerCase().includes('search the web') ||
                           message.toLowerCase().includes('tell me everything') ||
                           message.toLowerCase().includes('industry context');

    // START PARALLEL OPERATIONS
    const parallelPromises: Promise<any>[] = [];

    // OPTIMIZED: Significantly reduced topK for faster searches
    const topK = isAskAIQuery ? 8 : // Reduced from 10
                 queryComplexity === 'simple' ? 5 : // Reduced from 10
                 queryComplexity === 'moderate' ? 10 : // Reduced from 20
                 15; // Reduced from 30

    // 1. Vector search promise
    const vectorSearchPromise = (async () => {
      if (hasExternalAPIs) {
        console.log('[Vector Chat] Using Pinecone for semantic search:', message);
        try {
          return await hybridSearch(
            message,
            keywords,
            userPreferences?.interests,
            topK
          );
        } catch (error) {
          console.error('Pinecone search failed, falling back to local:', error);
          return await searchLocalSessions(
            message,
            keywords,
            topK
          );
        }
      } else {
        console.log('[Vector Chat] Using local vector DB for semantic search:', message);
        // Ensure local DB is populated
        const allSessions = await prisma.session.findMany({
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          }
        });
        await upsertSessionsToLocalDB(allSessions);

        return await searchLocalSessions(
          message,
          keywords,
          topK
        );
      }
    })();

    parallelPromises.push(vectorSearchPromise);

    // 2. Web search promise (if needed)
    const webSearchPromise = shouldSearchWeb ? (async () => {
      try {
        console.log('[Vector Chat] Starting web search in parallel');
        // We'll need to wait for vector results to get speaker names
        // But we can start with a general search
        const searchQuery = `${message} insurance technology ITC Vegas 2025`;

        const webResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/web-search`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            context: 'Conference session and speaker information',
            allowedDomains: ['itcvegas.com', 'linkedin.com', 'insurancejournal.com'],
            blockedDomains: ['facebook.com', 'twitter.com']
          })
        });

        if (webResponse.ok) {
          return await webResponse.json();
        }
        return null;
      } catch (error) {
        console.error('[Vector Chat] Web search failed:', error);
        return null;
      }
    })() : Promise.resolve(null);

    if (shouldSearchWeb) {
      parallelPromises.push(webSearchPromise);
    }

    // Wait for all parallel operations
    const [vectorResults, webSearchResults] = await Promise.all([
      vectorSearchPromise,
      webSearchPromise
    ]);
    
    console.log(`[Vector Chat] Found ${vectorResults.length} semantically relevant sessions`);
    
    // Fetch full session data for the results
    const sessionIds = vectorResults.map(r => r.id);
    const sessions = await prisma.session.findMany({
      where: {
        id: {
          in: sessionIds
        }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
    
    // Sort sessions by vector score
    const sessionMap = new Map(sessions.map(s => [s.id, s]));
    const sortedSessions = vectorResults
      .map(r => sessionMap.get(r.id))
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    
    // Format sessions for AI context with IDs for hyperlinks
    const sessionsContext = sortedSessions.map((session, index) => ({
      id: session.id,
      title: session.title,
      description: session.description,
      relevanceScore: vectorResults[index]?.hybridScore || vectorResults[index]?.score || 0.5,
      startTime: session.startTime?.toISOString(),
      endTime: session.endTime?.toISOString(),
      track: session.track,
      location: session.location,
      tags: session.tags,
      speakers: session.speakers.map(ss => ({
        id: ss.speaker.id,
        name: ss.speaker.name,
        role: ss.speaker.role,
        company: ss.speaker.company
      }))
    }));
    
    // OPTIMIZED MODEL SELECTION: Use faster models more aggressively
    const model = queryComplexity === 'simple' ?
                  'claude-3-haiku-20240307' : // Haiku for simple (fastest)
                  queryComplexity === 'moderate' ?
                  'claude-3-5-sonnet-20241022' : // Sonnet for moderate (fast & capable)
                  'claude-3-5-sonnet-20241022'; // Sonnet even for complex (avoid Opus for speed)

    // OPTIMIZED: Reduced token limits for faster responses
    const maxTokens = queryComplexity === 'simple' ? 800 : // Reduced from 1000
                      queryComplexity === 'moderate' ? 1500 : // Reduced from 2500
                      2000; // Reduced from 4000
    const temperature = AI_CONFIG.TEMPERATURE_BY_COMPLEXITY[queryComplexity];

    const sources: SourceInfo[] = [];

    // Add web sources if web search was performed
    if (webSearchResults) {
      console.log('[Vector Chat] Web search completed successfully');
      if (webSearchResults.sources && webSearchResults.sources.length > 0) {
        webSearchResults.sources.forEach((url: string, idx: number) => {
          sources.push({
            type: 'web',
            title: `Web Result ${idx + 1}`,
            url,
            excerpt: webSearchResults.content?.substring(idx * 100, (idx + 1) * 100)
          });
        });
      }
    }

    // Add vector search sources
    sessionsContext.slice(0, 5).forEach((session, idx) => {
      sources.push({
        type: 'vector',
        title: session.title,
        url: `/agenda/session/${session.id}`,
        confidence: session.relevanceScore,
        excerpt: session.description?.substring(0, 150)
      });
    });

    // Get current Las Vegas time
    const getLasVegasTime = () => {
      const now = new Date();
      // Las Vegas is in Pacific Time (PT) - UTC-7 or UTC-8 depending on DST
      // For October 2025, it will be PDT (UTC-7)
      const vegasTime = new Date(now.toLocaleString("en-US", {timeZone: "America/Los_Angeles"}));
      return vegasTime;
    };

    let currentVegasTime = getLasVegasTime();
    const conferenceStartDate = new Date('2025-10-15T00:00:00-07:00');
    const conferenceEndDate = new Date('2025-10-17T23:59:59-07:00');

    // Determine if we're during the conference
    let isDuringConference = currentVegasTime >= conferenceStartDate && currentVegasTime <= conferenceEndDate;

    // Filter sessions based on time if during conference or if time-based query
    let timeRelevantSessions = sessionsContext;
    let timeContext = '';

    // For testing: Allow simulating conference time via query
    const simulatedTimeMatch = message.match(/\[SIMULATE:\s*(\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}\s*(AM|PM)?)\]/i);
    if (simulatedTimeMatch) {
      const simulatedTime = new Date(simulatedTimeMatch[1]);
      if (!isNaN(simulatedTime.getTime())) {
        currentVegasTime.setTime(simulatedTime.getTime());
        isDuringConference = currentVegasTime >= conferenceStartDate && currentVegasTime <= conferenceEndDate;
      }
    }

    if (isDuringConference || isTimeBasedQuery) {
      // Parse specific time from query if present
      let targetTime = currentVegasTime;

      // Check for specific times in the query
      const timeMatch = message.match(/\b(\d{1,2}):?(\d{2})?\s*(am|pm)\b/i);
      if (timeMatch) {
        const hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2] || '0');
        const isPM = timeMatch[3].toLowerCase() === 'pm';

        targetTime = new Date(currentVegasTime);
        targetTime.setHours(isPM && hours !== 12 ? hours + 12 : hours === 12 && !isPM ? 0 : hours);
        targetTime.setMinutes(minutes);
      }

      // Check for relative times
      if (message.includes('after lunch')) {
        targetTime = new Date(currentVegasTime);
        targetTime.setHours(13, 0, 0, 0); // 1 PM
      } else if (message.includes('morning')) {
        targetTime = new Date(currentVegasTime);
        targetTime.setHours(9, 0, 0, 0); // 9 AM
      } else if (message.includes('afternoon')) {
        targetTime = new Date(currentVegasTime);
        targetTime.setHours(14, 0, 0, 0); // 2 PM
      } else if (message.includes('evening')) {
        targetTime = new Date(currentVegasTime);
        targetTime.setHours(17, 0, 0, 0); // 5 PM
      }

      // Filter to only show sessions after the target time
      timeRelevantSessions = sessionsContext.filter(session => {
        const sessionTime = new Date(session.startTime);

        // If "today" is mentioned, also filter by date
        if (message.toLowerCase().includes('today')) {
          return sessionTime >= targetTime &&
                 sessionTime.toDateString() === targetTime.toDateString();
        }

        // If "tomorrow" is mentioned, filter for tomorrow
        if (message.toLowerCase().includes('tomorrow')) {
          const tomorrow = new Date(targetTime);
          tomorrow.setDate(tomorrow.getDate() + 1);
          return sessionTime.toDateString() === tomorrow.toDateString();
        }

        return sessionTime >= targetTime;
      });

      timeContext = `
CURRENT LAS VEGAS TIME: ${currentVegasTime.toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
        timeZone: 'America/Los_Angeles'
      })}

IMPORTANT TIME AWARENESS:
- Only recommend sessions that haven't started yet (occurring after ${currentVegasTime.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })})
- If user asks "what's next" or "what should I attend", focus on the immediate upcoming sessions
- If user asks about sessions today, only show remaining sessions for ${currentVegasTime.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric'
      })}
- Consider travel time between venues (typically 5-10 minutes)
- Prioritize sessions starting in the next 30-60 minutes for immediate recommendations`;
    } else {
      timeContext = `
CONFERENCE DATES: October 15-17, 2025
CURRENT STATUS: Pre-conference planning phase
- All sessions are available for planning
- Help users build their complete schedule
- Suggest day-by-day planning strategies`;
    }

    // Create base system prompt
    const baseSystemPrompt = `You are an expert conference concierge AI for ITC Vegas 2025 (October 15-17, 2025).

IMPORTANT: You now have access to SEMANTICALLY RELEVANT sessions found through vector similarity search.
These sessions were selected because their content is conceptually related to the user's query, not just keyword matches.

${timeContext}

USER PROFILE:
- Name: ${userPreferences?.name || 'Guest'}
- Interests: ${userPreferences?.interests?.join(', ') || 'Not specified'}
- Goals: ${userPreferences?.goals?.join(', ') || 'Not specified'}

VECTOR SEARCH RESULTS (${timeRelevantSessions.length} relevant ${isDuringConference ? 'upcoming' : ''} sessions):
${JSON.stringify(timeRelevantSessions, null, 2)}

UNDERSTANDING THE RESULTS:
- Sessions are ranked by semantic relevance (not just keywords)
- Higher relevance scores mean stronger conceptual match
- The AI found these based on meaning, not exact word matches
- Sessions may be relevant even without containing exact query terms
${isDuringConference || isTimeBasedQuery ? '- IMPORTANT: Only upcoming sessions are shown (past sessions have been filtered out)' : ''}

RESPONSE GUIDELINES:
1. ${isDuringConference || isTimeBasedQuery ? 'ALWAYS mention session times and verify they are upcoming' : 'Explain WHY these sessions are relevant (connect concepts, not just keywords)'}
2. ${isDuringConference || isTimeBasedQuery ? 'Prioritize sessions starting soon (within 1-2 hours)' : 'Highlight non-obvious connections the semantic search found'}
3. ${isDuringConference || isTimeBasedQuery ? 'Consider session conflicts and travel time between venues' : 'Group related sessions by theme or learning path'}
4. Be specific about what attendees will learn
5. ${isDuringConference || isTimeBasedQuery ? 'If few sessions remain today, suggest tomorrow\'s options' : 'Suggest complementary sessions that build knowledge'}

CRITICAL - ALWAYS CREATE HYPERLINKS AND CITE SOURCES:
- Format every session title as: [Session Title](/agenda/session/{session.id}) [ℹ️]
- Format every speaker name as: [Speaker Name](/speakers/{speaker.id})
- Format track mentions with URL encoding:
  - For "AI Track": [AI Track](/agenda?track=AI%20Track)
  - For "Data & Analytics": [Data & Analytics](/agenda?track=Data%20%26%20Analytics)
  - Always URL encode spaces and special characters in track names
- Format day references as: [Day 1](/agenda?day=1), [Day 2](/agenda?day=2), [Day 3](/agenda?day=3)
- Format venue locations as: [Location Name](/locations?location={URL-encoded-location-name})
  - Example: [Mandalay Bay Ballroom F](/locations?location=Mandalay%20Bay%20Ballroom%20F)
  - IMPORTANT: Use the full location name from the session data, not abbreviations
  - NEVER use /venue#ballroomF format - always use /locations with query parameter
- Use the actual IDs from the session data provided
- EVERY recommendation must be clickable!
- IMPORTANT: URL encode all query parameters with spaces or special characters

SOURCE CITATIONS:
- Add [ℹ️¹] for information from vector search (conference database)
- Add [ℹ️²] for information from web search results
- Add [ℹ️³] for information from ITC Vegas website
- Place citations immediately after relevant statements
- Group related information by source when possible

${webSearchResults ? `WEB SEARCH RESULTS:
${webSearchResults.content}

IMPORTANT: Incorporate these web search findings into your response with proper citations [ℹ️²]` : ''}`;

    // Apply master prompts
    const masterPrompts = selectMasterPrompts(message);
    
    // Create enhanced prompt
    const enhancedPrompt = createEnhancedPrompt({
      userMessage: message,
      userProfile: userPreferences,
      sessionData: sessionsContext,
      complexity: queryComplexity
    }, baseSystemPrompt + '\n\n' + masterPrompts);
    
    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });
    
    console.log(`[Vector Chat] Using model: ${model} with ${maxTokens} tokens`);
    
    // Make API call
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        {
          role: 'user',
          content: `${enhancedPrompt.systemPrompt}\n\n${enhancedPrompt.enhancedUserMessage}\n\n${enhancedPrompt.responseGuidelines}`
        }
      ],
    });
    
    // Extract response
    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';
    
    // Format response with source citations
    const formattedResponse = aiResponse + `\n\n---\n**Sources:**\n${sources.map((source, idx) =>
      `[${idx + 1}] ${source.type === 'vector' ? '📊' : source.type === 'web' ? '🌐' : '🏢'} ${source.title}${source.url ? ` - [View](${source.url})` : ''}${source.confidence ? ` (${Math.round(source.confidence * 100)}% match)` : ''}`
    ).join('\n')}`;

    return NextResponse.json({
      response: formattedResponse,
      sources,
      sessions: sortedSessions.map(s => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        track: s.track,
        speakers: s.speakers?.map(ss => ({
          name: ss.speaker.name,
          role: ss.speaker.role,
          company: ss.speaker.company
        })) || []
      })),
      metadata: {
        searchType: 'vector',
        queryComplexity,
        model,
        sessionsFound: sortedSessions.length,
        semanticSearch: true,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Vector Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process vector chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Extract keywords from message for hybrid search
 */
function extractKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const keywords: string[] = [];
  
  // Common conference-related keywords
  const importantTerms = [
    'ai', 'artificial intelligence', 'machine learning', 'ml',
    'automation', 'claims', 'underwriting', 'cyber', 'security',
    'data', 'analytics', 'innovation', 'digital', 'transformation',
    'customer', 'experience', 'embedded', 'insurtech', 'blockchain',
    'iot', 'telematics', 'risk', 'compliance', 'regulation'
  ];
  
  importantTerms.forEach(term => {
    if (lowerMessage.includes(term)) {
      keywords.push(term);
    }
  });
  
  return keywords;
}