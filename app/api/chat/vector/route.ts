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
export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check for API keys and decide which vector DB to use
    const hasExternalAPIs = process.env.PINECONE_API_KEY && process.env.OPENAI_API_KEY && 
                            !process.env.OPENAI_API_KEY.includes('<your');
    
    let vectorResults: any[] = [];

    // Analyze query complexity
    const queryComplexity = analyzeQueryComplexity(message);
    
    // Extract keywords for hybrid search
    const keywords = extractKeywords(message);
    
    // Perform vector-based semantic search
    if (hasExternalAPIs) {
      console.log('[Vector Chat] Using Pinecone for semantic search:', message);
      try {
        vectorResults = await hybridSearch(
          message,
          keywords,
          userPreferences?.interests,
          queryComplexity === 'simple' ? 10 : queryComplexity === 'moderate' ? 20 : 30
        );
      } catch (error) {
        console.error('Pinecone search failed, falling back to local:', error);
        // Fallback to local if external fails
        vectorResults = await searchLocalSessions(
          message,
          keywords,
          queryComplexity === 'simple' ? 10 : queryComplexity === 'moderate' ? 20 : 30
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
      
      vectorResults = await searchLocalSessions(
        message,
        keywords,
        queryComplexity === 'simple' ? 10 : queryComplexity === 'moderate' ? 20 : 30
      );
    }
    
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
      .filter(Boolean);
    
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
    
    // Select model based on complexity
    const model = queryComplexity === 'simple' ? 'claude-3-haiku-20240307' : 
                  queryComplexity === 'moderate' ? 'claude-3-5-sonnet-20241022' :
                  AI_CONFIG.PRIMARY_MODEL;
    
    const maxTokens = AI_CONFIG.DYNAMIC_TOKEN_LIMITS[queryComplexity].max;
    const temperature = AI_CONFIG.TEMPERATURE_BY_COMPLEXITY[queryComplexity];
    
    // Create base system prompt
    const baseSystemPrompt = `You are an expert conference concierge AI for ITC Vegas 2025 (October 15-17, 2025).
    
IMPORTANT: You now have access to SEMANTICALLY RELEVANT sessions found through vector similarity search.
These sessions were selected because their content is conceptually related to the user's query, not just keyword matches.

USER PROFILE:
- Name: ${userPreferences?.name || 'Guest'}
- Interests: ${userPreferences?.interests?.join(', ') || 'Not specified'}
- Goals: ${userPreferences?.goals?.join(', ') || 'Not specified'}

VECTOR SEARCH RESULTS (${sessionsContext.length} most relevant sessions):
${JSON.stringify(sessionsContext, null, 2)}

UNDERSTANDING THE RESULTS:
- Sessions are ranked by semantic relevance (not just keywords)
- Higher relevance scores mean stronger conceptual match
- The AI found these based on meaning, not exact word matches
- Sessions may be relevant even without containing exact query terms

RESPONSE GUIDELINES:
1. Explain WHY these sessions are relevant (connect concepts, not just keywords)
2. Highlight non-obvious connections the semantic search found
3. Group related sessions by theme or learning path
4. Be specific about what attendees will learn
5. Suggest complementary sessions that build knowledge

CRITICAL - ALWAYS CREATE HYPERLINKS:
- Format every session title as: [Session Title](/agenda/session/{session.id})
- Format every speaker name as: [Speaker Name](/speakers/{speaker.id})
- Format track mentions as: [Track Name](/agenda?track={track})
- Format day references as: [Day 1](/agenda?day=1)
- Use the actual IDs from the session data provided
- EVERY recommendation must be clickable!`;

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
    
    return NextResponse.json({
      response: aiResponse,
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