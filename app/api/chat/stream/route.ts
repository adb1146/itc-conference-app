import { NextRequest } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { createEnhancedPrompt, analyzeQueryComplexity } from '@/lib/prompt-engine';
import { selectMasterPrompts } from '@/lib/prompts/master-prompt';
import { hybridSearch } from '@/lib/vector-db';
import { searchLocalSessions, upsertSessionsToLocalDB } from '@/lib/local-vector-db';
import prisma from '@/lib/db';
import { responseCache } from '@/lib/response-cache';
import { detectToolIntent, formatAgendaResponse } from '@/lib/chat-tool-detector';
import { generateFastAgenda } from '@/lib/tools/schedule/fast-agenda-builder';
import { generateGuestAgenda, formatPreferenceQuestions, parsePreferenceResponses, getPreferenceOptions } from '@/lib/tools/schedule/guest-agenda-builder';
import {
  getConversation,
  addMessage,
  updateConversationState,
  getConversationHistory,
  extractContext,
  shouldAskForPreferences,
  generateSessionId,
  storePendingAgenda,
  getPendingAgenda,
  isRegistrationInProgress,
  getRegistrationState,
  updateRegistrationState,
  markAgendaSaved
} from '@/lib/conversation-state';
import { InChatRegistrationHandler, type RegistrationState } from '@/lib/chat/registration-handler';
import { getTemporalContextForAI, parseRelativeTime, getTimeContext } from '@/lib/timezone-context';
import { shouldSuggestMeeting, formatMeetingSuggestion, getPSAdvisoryFooter } from '@/lib/ps-advisory-context';
import { LocalRecommendationsAgent } from '@/lib/agents/local-recommendations-agent';

/**
 * Streaming Vector-based Chat API
 * Provides real-time streaming responses for faster perceived performance
 */

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences, sessionId: providedSessionId } = await request.json();

    if (!message) {
      return new Response('Message is required', { status: 400 });
    }

    // Get or create session ID
    const sessionId = providedSessionId || generateSessionId();
    const userId = userPreferences?.email || undefined;

    // Get conversation context
    const conversation = getConversation(sessionId, userId);

    // Add user message to history
    addMessage(sessionId, 'user', message);

    // Check for ambiguous time references
    const timeContext = getTimeContext();
    const timeParseResult = parseRelativeTime(message, timeContext);

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
        // Handle time clarification if needed
        if (timeParseResult.needsClarification) {
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(timeParseResult.clarificationMessage)}}\n\n`));
          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
          await writer.close();
          return;
        }

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

        // Check if research agent is already active (continuing conversation) - MUST CHECK BEFORE REGISTRATION
        const conversation = getConversation(sessionId);
        if (conversation.state.researchAgentActive) {
          console.log('[Stream API] Continuing research agent conversation');

          // Get the singleton orchestrator instance
          const { getOrchestrator } = await import('@/lib/agents/orchestrator-singleton');
          const orchestrator = getOrchestrator();

          // Continue the conversation
          const response = await orchestrator.processMessage(sessionId, message, undefined);

          // Handle different response types
          if (response.nextAction === 'research') {
            await writer.write(encoder.encode(`data: {"type":"status","content":"Researching your background..."}\n\n`));
            // The orchestrator will handle the actual research
          }

          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));

          if (response.agenda) {
            // Store the agenda for potential saving
            storePendingAgenda(sessionId, response.agenda);
            updateConversationState(sessionId, {
              agendaBuilt: true,
              researchAgentActive: false
            });
          }

          if (response.metadata) {
            await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(response.metadata)}}\n\n`));
          }

          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
          await writer.close();
          return;
        }

        // Check if registration is in progress
        if (isRegistrationInProgress(sessionId)) {
          console.log('[Stream API] Registration in progress, handling registration flow');

          const registrationState = getRegistrationState(sessionId);
          const pendingAgenda = getPendingAgenda(sessionId);
          const registrationHandler = new InChatRegistrationHandler(pendingAgenda);

          // Restore previous registration data if exists
          if (registrationState.data) {
            Object.assign(registrationHandler, { registrationData: registrationState.data });
          }

          // Process registration input
          const response = await registrationHandler.processInput(
            message,
            (registrationState.step || 'offer_save') as RegistrationState,
            registrationState.data || {}
          );

          // Update conversation state with new registration step
          if (response.nextStep && response.nextStep !== 'complete') {
            updateRegistrationState(sessionId, response.nextStep, registrationHandler.getRegistrationData());
          } else if (response.success) {
            markAgendaSaved(sessionId);
          }

          // Send registration response
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));

          if (response.success && response.sessionsSaved) {
            await writer.write(encoder.encode(`data: {"type":"metadata","content":{"agendaSaved":true,"sessionsSaved":${response.sessionsSaved}}}\n\n`));
          }

          await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
          await writer.close();
          return;
        }

        // Check if user wants to save agenda (response to save offer)
        const pendingAgenda = getPendingAgenda(sessionId);
        if (pendingAgenda && !userPreferences?.email) {
          const lowerMessage = message.toLowerCase();
          const wantsToSave = ['yes', 'yeah', 'sure', 'save', 'ok', 'please'].some(word => lowerMessage.includes(word));

          if (wantsToSave) {
            console.log('[Stream API] User wants to save agenda, starting registration');

            // Start registration flow
            updateRegistrationState(sessionId, 'collect_email');

            const registrationHandler = new InChatRegistrationHandler(pendingAgenda);
            const response = await registrationHandler.processInput('yes', 'offer_save', {});

            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));
            await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
            await writer.close();
            return;
          }
        }

        // Check if we're waiting for preferences from a previous question
        const waitingForPreferences = shouldAskForPreferences(sessionId);

        // Check if this message should trigger the agenda builder tool
        const toolDetection = detectToolIntent(message);

        // Handle local recommendations queries (restaurants, bars, activities)
        if (toolDetection.shouldUseTool && toolDetection.toolType === 'local_recommendations') {
          console.log('[Stream API] Detected local recommendations request with confidence:', toolDetection.confidence);

          await writer.write(encoder.encode(`data: {"type":"status","content":"Finding Mandalay Bay recommendations..."}\n\n`));

          // Create local recommendations agent
          const localAgent = new LocalRecommendationsAgent();

          try {
            // Get recommendations (fast, cached response)
            const recommendations = await localAgent.getRecommendations(message);

            // Send the recommendations
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(recommendations)}}\n\n`));

            // Add conversation tracking
            addMessage(sessionId, 'assistant', recommendations);

            // Update conversation state
            updateConversationState(sessionId, {
              lastToolUsed: 'local_recommendations'
            });

            // Send metadata about the tool used
            await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify({
              toolUsed: 'local_recommendations',
              responseTime: 'instant',
              cached: true
            })}}\n\n`));

            await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
            await writer.close();
            return;
          } catch (error) {
            console.error('[Stream API] Error getting local recommendations:', error);
            // Fall through to regular chat if agent fails
            await writer.write(encoder.encode(`data: {"type":"status","content":"Switching to regular chat mode..."}\n\n`));
          }
        }

        // Check if user is requesting research-based personalization or introducing themselves
        const messageLower = message.toLowerCase();
        const isIntroduction = (
          (messageLower.includes("i'm ") || messageLower.includes("i am ")) &&
          (messageLower.includes(" from ") || messageLower.includes(" at ") ||
           messageLower.includes(" with ") || messageLower.includes(" work ") ||
           messageLower.includes(" ceo ") || messageLower.includes(" vp ") ||
           messageLower.includes(" president ") || messageLower.includes(" director "))
        );

        const isResearchRequest = !userPreferences?.email && (
          isIntroduction ||
          messageLower.includes('research') ||
          messageLower.includes('personalized agenda with research') ||
          messageLower.includes('build me a personalized agenda') ||
          messageLower.includes('create my agenda')
        );

        if (isResearchRequest) {
          console.log('[Stream API] Detected research request from guest user');

          // Get the singleton orchestrator instance
          const { getOrchestrator } = await import('@/lib/agents/orchestrator-singleton');
          const orchestrator = getOrchestrator();

          // Process the initial message
          const response = await orchestrator.processMessage(sessionId, message, undefined);

          // Send the response
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));

          if (response.metadata) {
            await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(response.metadata)}}\n\n`));
          }

          // Store orchestrator state for next interaction
          updateConversationState(sessionId, {
            researchAgentActive: true,
            researchPhase: response.metadata?.phase
          });

          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
          await writer.close();
          return;
        }


        // Handle preference responses for non-authenticated users
        if (!userPreferences?.email && (waitingForPreferences || toolDetection.toolType === 'general_chat')) {
          // Check if the message contains preference information (response to our questions)
          const messageContainsPreferences = message.toLowerCase().includes('interested in') ||
                                            message.toLowerCase().includes('i am a') ||
                                            message.toLowerCase().includes('my role') ||
                                            message.toLowerCase().includes('attending') ||
                                            message.toLowerCase().includes('all three days') ||
                                            message.toLowerCase().includes('all 3 days') ||
                                            message.toLowerCase().includes('day 1') ||
                                            message.toLowerCase().includes('day 2') ||
                                            message.toLowerCase().includes('day 3');

          if (messageContainsPreferences) {
            console.log('[Stream API] Detected preference response from guest user');

            // Parse preferences from the message
            const guestPreferences = parsePreferenceResponses(message);

            // Check if we have enough information to build an agenda
            if (guestPreferences.interests.length > 0) {
              await writer.write(encoder.encode(`data: {"type":"status","content":"Building your personalized agenda based on your preferences..."}\n\n`));

              try {
                const agendaResult = await generateGuestAgenda(guestPreferences, {
                  includeMeals: true,
                  maxSessionsPerDay: 8
                });

                if (agendaResult.success && agendaResult.agenda) {
                  // Update conversation state
                  updateConversationState(sessionId, {
                    agendaBuilt: true,
                    waitingForPreferences: false,
                    userPreferences: guestPreferences,
                    lastToolUsed: 'guest_agenda_builder'
                  });

                  // Store the agenda in conversation state for potential registration
                  storePendingAgenda(sessionId, agendaResult.agenda);

                  const formattedResponse = formatAgendaResponse(agendaResult.agenda);

                  const totalSessions = agendaResult.agenda.days.reduce((total, day) => total + day.schedule.length, 0);
                  const enhancedResponse = `${formattedResponse}\n\n---\n\n🔒 **Would you like to save this agenda to your profile?**\n\nI can help you create a free account right here in the chat to:\n• Save all ${totalSessions || 'your'} selected sessions\n• Get reminders before sessions start\n• Export to your calendar\n• Access from any device\n\n**Just say "yes" to save your agenda**, or continue exploring sessions without saving.`;

                  await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(enhancedResponse)}}\n\n`));
                  await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify({
                    agenda: agendaResult.agenda,
                    performance: {
                      model: 'Guest Agenda Builder',
                      executionTime: agendaResult.executionTime,
                      sessionsAnalyzed: agendaResult.metadata?.sessionsConsidered || 0,
                      toolUsed: 'guest_agenda_builder'
                    }
                  })}}\n\n`));
                  await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
                  await writer.close();
                  return;
                }
              } catch (error) {
                console.error('[Stream API] Error building guest agenda:', error);
                await writer.write(encoder.encode(`data: {"type":"error","content":"Sorry, I encountered an error building your agenda. Please try again."}\n\n`));
                await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
                await writer.close();
                return;
              }
            } else {
              // Not enough info yet, ask for more
              await writer.write(encoder.encode(`data: {"type":"status","content":"I need a bit more information"}\n\n`));

              const followUpResponse = `I see you're starting to share your preferences! To build the best agenda for you, could you also tell me:\n\n**What topics interest you?** (e.g., AI, cybersecurity, claims technology, etc.)`;

              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(followUpResponse)}}\n\n`));
              await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
              await writer.close();
              return;
            }
          }
        }

        if (toolDetection.shouldUseTool && toolDetection.toolType === 'agenda_builder') {
          console.log('[Stream API] Detected agenda building request with confidence:', toolDetection.confidence);

          // Check if user is authenticated for agenda building
          if (!userPreferences?.email) {
            console.log('[Stream API] User not authenticated, starting guest agenda flow');

            // Ask for preferences if we don't have enough information
            updateConversationState(sessionId, {
              waitingForPreferences: true,
              agendaBuilt: false
            });

            await writer.write(encoder.encode(`data: {"type":"status","content":"Let's personalize your agenda"}\n\n`));

            const questionResponse = formatPreferenceQuestions();
            const preferenceOptions = getPreferenceOptions();

            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(questionResponse)}}\n\n`));
            await writer.write(encoder.encode(`data: {"type":"interactive","content":{"type":"preference_collection","requiresResponse":true,"options":${JSON.stringify(preferenceOptions)}}}\n\n`));
            await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
            await writer.close();
            return;
          }

          // Get user from database
          const user = await prisma.user.findUnique({
            where: { email: userPreferences.email }
          });

          if (!user) {
            await writer.write(encoder.encode(`data: {"type":"status","content":"User profile not found"}\n\n`));
            await writer.write(encoder.encode(`data: {"type":"content","content":"I couldn't find your user profile. Please make sure you're signed in and try again."}\n\n`));
            await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
            await writer.close();
            return;
          }

          // Build the agenda using the fast agenda builder
          console.log('[Stream API] Building agenda for user:', user.email);
          await writer.write(encoder.encode(`data: {"type":"status","content":"Building your personalized agenda..."}\n\n`));

          const agendaOptions = {
            ...toolDetection.extractedParams,
            includeMeals: true,
            maxSessionsPerDay: 8
          };

          try {
            const agendaResult = await generateFastAgenda(user.id, agendaOptions);

            if (agendaResult.success && agendaResult.agenda) {
              // Update conversation state
              updateConversationState(sessionId, {
                agendaBuilt: true,
                waitingForPreferences: false,
                lastToolUsed: 'smart_agenda_builder'
              });

              const formattedResponse = formatAgendaResponse(agendaResult.agenda);

              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(formattedResponse)}}\n\n`));
              await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify({
                agenda: agendaResult.agenda,
                performance: {
                  model: 'Agenda Builder Tool',
                  executionTime: Date.now() - Date.now(), // Placeholder for execution time
                  sessionsAnalyzed: agendaResult.agenda.metrics?.aiSuggestionsAdded || 0,
                  toolUsed: 'smart_agenda_builder'
                }
              })}}\n\n`));
              await writer.write(encoder.encode(`data: {"type":"done"}\n\n`));
              await writer.close();
              return;
            } else {
              // Fallback to regular chat if agenda building fails
              console.error('[Stream API] Agenda building failed:', agendaResult.error);
              await writer.write(encoder.encode(`data: {"type":"status","content":"Switching to regular chat mode..."}\n\n`));
            }
          } catch (agendaError) {
            console.error('[Stream API] Error building agenda:', agendaError);
            // Continue to regular chat as fallback
            await writer.write(encoder.encode(`data: {"type":"status","content":"Switching to regular chat mode..."}\n\n`));
          }
        }

        // Send initial status for regular chat
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

        // Get conversation history and context
        const conversationHistory = getConversationHistory(sessionId, 5);
        const conversationContext = extractContext(sessionId);

        // Build system prompt with conversation context
        const baseSystemPrompt = createSystemPrompt(
          userPreferences,
          sessionsContext,
          webSearchResults
        );

        // Add temporal context for time-aware responses
        const temporalContext = getTemporalContextForAI();

        const contextualSystemPrompt = conversationContext
          ? `${baseSystemPrompt}\n\n## Conversation Context:\n${conversationContext}\n\n${temporalContext}`
          : `${baseSystemPrompt}\n\n${temporalContext}`;

        const masterPrompts = selectMasterPrompts(message);
        const enhancedPrompt = createEnhancedPrompt(
          {
            userMessage: message,
            userProfile: userPreferences,
            sessionData: sessionsContext,
            complexity: queryComplexity,
            conversationHistory // Add conversation history
          },
          contextualSystemPrompt + '\n\n' + masterPrompts
        );

        // Initialize Anthropic with streaming
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || '',
        });

        await writer.write(encoder.encode(`data: {"type":"model","content":"${model}"}\n\n`));

        // Create streaming response with timeout
        const controller = new AbortController();
        const timeout = setTimeout(() => {
          controller.abort();
        }, 60000); // 60 second timeout

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

        // Clear the timeout since streaming completed successfully
        clearTimeout(timeout);

        // Save assistant's response to conversation history
        addMessage(sessionId, 'assistant', fullResponse);

        // Check if we should suggest a meeting with Nancy Paul
        const messageCount = conversation.messages.length;
        const meetingContext = shouldSuggestMeeting(message, fullResponse, sessionId, messageCount);

        if (meetingContext.shouldSuggest) {
          const meetingSuggestion = formatMeetingSuggestion(meetingContext, sessionId);
          if (meetingSuggestion) {
            // Add the meeting suggestion to the response
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(meetingSuggestion)}}\n\n`));
          }
        }

        // Add PS Advisory footer on certain messages
        const footer = getPSAdvisoryFooter(messageCount);
        if (footer) {
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(footer)}}\n\n`));
        }

        // Send sources at the end
        const sources = formatSources(sessionsContext, webSearchResults);
        await writer.write(encoder.encode(`data: {"type":"sources","content":${JSON.stringify(sources)}}\n\n`));

        // Cache the response if it's good
        if (responseCache.shouldCache(fullResponse)) {
          const cacheKey = responseCache.generateKey(message, userPreferences);
          responseCache.set(cacheKey, fullResponse, sources, sortedSessions);
        }

        // Send completion signal with session ID
        await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
      } catch (error) {
        console.error('Streaming error:', error);
        // Try to send error message and done event if stream is still open
        try {
          await writer.write(encoder.encode(`data: {"type":"error","content":"An error occurred while processing your request. Please try again."}\n\n`));
          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
        } catch (writeError) {
          // Stream is already closed, can't write
          console.error('Could not write error to stream:', writeError);
        }
      } finally {
        // Close the writer if it's still open
        try {
          await writer.close();
        } catch (closeError) {
          // Already closed
        }
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