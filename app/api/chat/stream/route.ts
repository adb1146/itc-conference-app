import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { createEnhancedPrompt, analyzeQueryComplexity } from '@/lib/prompt-engine';
import { selectMasterPrompts } from '@/lib/prompts/master-prompt';
import { hybridSearch } from '@/lib/vector-db';
import { searchLocalSessions, upsertSessionsToLocalDB } from '@/lib/local-vector-db';
import prisma from '@/lib/db';
import { responseCache } from '@/lib/response-cache';

/**
 * Streaming Vector-based Chat API
 * Provides real-time streaming responses for faster perceived performance
 */

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Create a TransformStream for streaming
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();

    // Check for API keys
    const hasExternalAPIs = process.env.PINECONE_API_KEY &&
                            process.env.OPENAI_API_KEY &&
                            !process.env.OPENAI_API_KEY.includes('<your');

    // Start async processing
    (async () => {
      try {
        // Check cache first
        const cacheKey = responseCache.generateKey(message, userPreferences);
        const cached = responseCache.get(cacheKey);

        if (cached) {
          // Send cached response immediately
          await writer.write(encoder.encode(`data: {"type":"status","content":"Found instant response!"}\n\n`));
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(cached.response)}}\n\n`));

          if (cached.sources) {
            await writer.write(encoder.encode(`data: {"type":"sources","content":${JSON.stringify(cached.sources)}}\n\n`));
          }

          await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
          await writer.close();
          return;
        }

        // Send initial status
        await writer.write(encoder.encode(`data: {"type":"status","content":"Analyzing your question..."}\n\n`));

        // Analyze query complexity for FASTER model selection
        const queryComplexity = analyzeQueryComplexity(message);
        const keywords = extractKeywords(message);

        // Check query types
        const isAskAIQuery = message.includes('Tell me everything about') &&
                            message.includes('Search the web for information');
        const shouldSearchWeb = message.toLowerCase().includes('search the web') ||
                               message.toLowerCase().includes('tell me everything') ||
                               message.toLowerCase().includes('industry context');

        // OPTIMIZED: Reduce topK for faster searches
        const topK = isAskAIQuery ? 8 : // Reduced from 10
                    queryComplexity === 'simple' ? 5 : // Reduced from 10
                    queryComplexity === 'moderate' ? 10 : // Reduced from 20
                    15; // Reduced from 30

        await writer.write(encoder.encode(`data: {"type":"status","content":"Searching conference database..."}\n\n`));

        // Parallel operations
        const parallelPromises: Promise<any>[] = [];

        // Vector search
        const vectorSearchPromise = (async () => {
          if (hasExternalAPIs) {
            try {
              return await hybridSearch(message, keywords, userPreferences?.interests, topK);
            } catch (error) {
              console.error('Pinecone search failed:', error);
              return await searchLocalSessions(message, keywords, topK);
            }
          } else {
            // OPTIMIZED: Only fetch if local DB is empty
            const localDBSize = (await searchLocalSessions('', [], 1)).length;
            if (localDBSize === 0) {
              const allSessions = await prisma.session.findMany({
                select: {
                  id: true,
                  title: true,
                  description: true,
                  track: true,
                  tags: true,
                  speakers: {
                    select: {
                      speaker: {
                        select: {
                          name: true,
                          company: true,
                          role: true
                        }
                      }
                    }
                  }
                }
              });
              await upsertSessionsToLocalDB(allSessions);
            }
            return await searchLocalSessions(message, keywords, topK);
          }
        })();

        parallelPromises.push(vectorSearchPromise);

        // Web search (if needed)
        const webSearchPromise = shouldSearchWeb ? (async () => {
          try {
            const searchQuery = `${message} insurance technology ITC Vegas 2025`;
            const webResponse = await fetch(
              `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3011'}/api/web-search`,
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  query: searchQuery,
                  context: 'Conference session and speaker information',
                  allowedDomains: ['itcvegas.com', 'linkedin.com', 'insurancejournal.com'],
                  blockedDomains: ['facebook.com', 'twitter.com']
                })
              }
            );
            return webResponse.ok ? await webResponse.json() : null;
          } catch (error) {
            console.error('Web search failed:', error);
            return null;
          }
        })() : Promise.resolve(null);

        if (shouldSearchWeb) {
          parallelPromises.push(webSearchPromise);
        }

        // Wait for search results
        const [vectorResults, webSearchResults] = await Promise.all([
          vectorSearchPromise,
          webSearchPromise
        ]);

        await writer.write(encoder.encode(`data: {"type":"status","content":"Found ${vectorResults.length} relevant sessions. Generating response..."}\n\n`));

        // OPTIMIZED: Fetch only needed fields for faster DB queries
        const sessionIds = vectorResults.map((r: any) => r.id);
        const sessions = await prisma.session.findMany({
          where: { id: { in: sessionIds } },
          select: {
            id: true,
            title: true,
            description: true,
            startTime: true,
            endTime: true,
            location: true,
            track: true,
            tags: true,
            speakers: {
              select: {
                speaker: {
                  select: {
                    id: true,
                    name: true,
                    role: true,
                    company: true
                  }
                }
              }
            }
          }
        });

        // Sort sessions by score
        const sessionMap = new Map(sessions.map(s => [s.id, s]));
        const sortedSessions = vectorResults
          .map((r: any) => sessionMap.get(r.id))
          .filter((s): s is NonNullable<typeof s> => Boolean(s));

        // Format sessions for AI
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

        // OPTIMIZED MODEL SELECTION - Use faster models more aggressively
        const model = queryComplexity === 'simple' ?
                     'claude-3-haiku-20240307' : // Haiku for simple (fastest)
                     queryComplexity === 'moderate' ?
                     'claude-3-5-sonnet-20241022' : // Sonnet for moderate (fast & capable)
                     'claude-3-5-sonnet-20241022'; // Sonnet even for complex (avoid Opus for speed)

        // Reduced token limits for faster responses
        const maxTokens = queryComplexity === 'simple' ? 800 :
                         queryComplexity === 'moderate' ? 1500 :
                         2000;

        const temperature = AI_CONFIG.TEMPERATURE_BY_COMPLEXITY[queryComplexity];

        // Build system prompt
        const baseSystemPrompt = createSystemPrompt(
          userPreferences,
          sessionsContext,
          webSearchResults
        );

        const masterPrompts = selectMasterPrompts(message);
        const enhancedPrompt = createEnhancedPrompt(
          {
            userMessage: message,
            userProfile: userPreferences,
            sessionData: sessionsContext,
            complexity: queryComplexity
          },
          baseSystemPrompt + '\n\n' + masterPrompts
        );

        // Initialize Anthropic with streaming
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        });

        await writer.write(encoder.encode(`data: {"type":"model","content":"${model}"}\n\n`));

        // Create streaming response
        const stream = await anthropic.messages.create({
          model,
          max_tokens: maxTokens,
          temperature,
          stream: true, // Enable streaming
          messages: [
            {
              role: 'user',
              content: `${enhancedPrompt.systemPrompt}\n\n${enhancedPrompt.enhancedUserMessage}\n\n${enhancedPrompt.responseGuidelines}`
            }
          ],
        });

        // Stream the response and collect for caching
        let fullResponse = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text;
            fullResponse += text;
            // Escape the text for JSON
            const escaped = JSON.stringify(text).slice(1, -1);
            await writer.write(encoder.encode(`data: {"type":"content","content":"${escaped}"}\n\n`));
          }
        }

        // Send sources at the end
        const sources = formatSources(sessionsContext, webSearchResults);
        await writer.write(encoder.encode(`data: {"type":"sources","content":${JSON.stringify(sources)}}\n\n`));

        // Cache the response if it's good
        if (responseCache.shouldCache(fullResponse)) {
          const cacheKey = responseCache.generateKey(message, userPreferences);
          responseCache.set(cacheKey, fullResponse, sources, sortedSessions);
        }

        // Send completion signal
        await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
      } catch (error) {
        console.error('Streaming error:', error);
        await writer.write(encoder.encode(`data: {"type":"error","content":"An error occurred while processing your request"}\n\n`));
      } finally {
        await writer.close();
      }
    })();

    // Return the stream
    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Stream API error:', error);
    return new Response('Failed to process request', { status: 500 });
  }
}

function extractKeywords(message: string): string[] {
  const lowerMessage = message.toLowerCase();
  const keywords: string[] = [];

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

function createSystemPrompt(
  userPreferences: any,
  sessionsContext: any[],
  webSearchResults: any
): string {
  return `You are an expert conference concierge AI for ITC Vegas 2025 (October 15-17, 2025).

IMPORTANT: Provide concise, actionable responses. Focus on the most relevant information.

USER PROFILE:
- Name: ${userPreferences?.name || 'Guest'}
- Interests: ${userPreferences?.interests?.join(', ') || 'Not specified'}

RELEVANT SESSIONS (${sessionsContext.length} found):
${JSON.stringify(sessionsContext.slice(0, 10), null, 2)}

RESPONSE GUIDELINES:
1. Be concise - aim for 2-3 paragraphs max
2. Focus on the TOP 3-5 most relevant sessions
3. Always include clickable links using the format:
   - [Session Title](/agenda/session/{session.id})
   - [Speaker Name](/speakers/{speaker.id})
   - [Track Name](/agenda?track={URL-encoded-track})
   - [Location](/locations?location={URL-encoded-location})

${webSearchResults ? `WEB CONTEXT:\n${webSearchResults.content?.substring(0, 500)}` : ''}`;
}

function formatSources(sessionsContext: any[], webSearchResults: any): any[] {
  const sources: any[] = [];

  sessionsContext.slice(0, 3).forEach((session, idx) => {
    sources.push({
      type: 'session',
      title: session.title,
      url: `/agenda/session/${session.id}`,
      confidence: session.relevanceScore
    });
  });

  if (webSearchResults?.sources) {
    webSearchResults.sources.slice(0, 2).forEach((url: string) => {
      sources.push({
        type: 'web',
        url
      });
    });
  }

  return sources;
}