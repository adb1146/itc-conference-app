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
import { classifyUserIntent, type IntentClassification, type ConversationContext as IntentContext } from '@/lib/ai-intent-classifier';
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
import {
  shouldSuggestMeeting,
  formatMeetingSuggestion,
  getPSAdvisoryFooter,
  isAskingAboutPSAdvisory,
  getPSAdvisoryInfo,
  relatesToPSAdvisoryExpertise
} from '@/lib/ps-advisory-context';
import { validatePSAdvisoryResponse } from '@/lib/ps-advisory-validation';
import { filterOutPSAdvisoryFakeSessions, cleanPSAdvisoryFromResponse, responseHasPSAdvisoryAsSession } from '@/lib/ps-advisory-response-filter';
import { LocalRecommendationsAgent } from '@/lib/agents/local-recommendations-agent';
import { getAttendeeNeedResponse, getTimeAwareActivities, getPracticalInfo } from '@/lib/attendee-experience';
import { getHelpContent, getQuickHelpResponse } from '@/lib/help-content';
import { getConferenceInfoResponse } from '@/lib/conference-info-handler';
import { interpretQuery, generateEnhancedSearchQuery, generateAIGuidance } from '@/lib/intelligent-query-interpreter';
// Using smart router with AI classification to fix "keynote speakers" routing issue
import { smartRouteMessage as routeMessage } from '@/lib/agents/smart-router-wrapper';
import { detectScheduleOfferOpportunity, generateContextualScheduleOffer, isAcceptingScheduleOffer, generateScheduleBuilderPrompt, shouldUseResearchAgent } from '@/lib/schedule-offer-detector';
import { validateOnStartup } from '@/lib/startup-validation';
import { shouldOrchestratorHandle, extractAndPersistUserInfo, activateOrchestrator } from '@/lib/agents/orchestrator-state-fix';
import { processSimpleOrchestration, getOrCreateState } from '@/lib/agents/orchestrator-fix';

// Validate environment on startup
validateOnStartup();

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

        // Check if orchestrator should handle this message
        const shouldUseOrchestrator = conversation.state.researchAgentActive || shouldOrchestratorHandle(sessionId, message);

        if (!shouldUseOrchestrator) {
          // Clear any existing orchestrator state if not using orchestrator
          const { clearOrchestratorState } = await import('@/lib/agents/orchestrator-fix');
          clearOrchestratorState(sessionId);
        }

        if (shouldUseOrchestrator) {
          console.log('[Stream API] Using simplified orchestrator flow');

          // Only extract user info when orchestrator is handling the message
          extractAndPersistUserInfo(sessionId, message);

          // Use the simplified orchestrator
          const result = await processSimpleOrchestration(sessionId, message, undefined);

          // Write the response
          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(result.response)}}\n\n`));

          if (result.agenda) {
            // Store the agenda for potential saving
            storePendingAgenda(sessionId, result.agenda);
            updateConversationState(sessionId, {
              agendaBuilt: true,
              researchAgentActive: result.shouldContinue
            });
          } else if (result.shouldContinue) {
            // Keep orchestrator active
            updateConversationState(sessionId, {
              researchAgentActive: true
            });
          }

          // Don't show the duplicate preference selector UI
          await writer.write(encoder.encode(`data: {"type":"hidePreferenceUI","content":true}\n\n`));

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

        // Check if user is accepting a schedule offer (before checking save offer)
        if (!conversation.state.agendaBuilt && isAcceptingScheduleOffer(message)) {
          // Check if this is in response to a schedule offer
          const lastAssistantMessage = conversation.messages
            .filter((m: any) => m.role === 'assistant')
            .pop();

          if (lastAssistantMessage?.content.includes('personalized schedule') ||
              lastAssistantMessage?.content.includes('build my schedule') ||
              lastAssistantMessage?.content.includes('personalized agenda')) {
            console.log('[Stream API] User accepting schedule offer');

            // Check if they want research-based personalization
            const useResearch = shouldUseResearchAgent(message) ||
                              message.toLowerCase().includes('research') ||
                              message.toLowerCase().includes('look me up');

            if (useResearch && !userPreferences?.email) {
              console.log('[Stream API] Triggering research agent for deep personalization');

              // Trigger research agent for deeper personalization
              const { getOrchestrator } = await import('@/lib/agents/orchestrator-singleton');
              const orchestrator = getOrchestrator();

              const initialMessage = "I'll research your professional background to create a highly personalized agenda. Let me start by learning more about you.";
              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(initialMessage)}}\n\n`));

              // Process with research agent
              const response = await orchestrator.processMessage(sessionId, message, undefined);

              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(response.message)}}\n\n`));

              if (response.metadata) {
                await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(response.metadata)}}\n\n`));
              }

              // Update state for research agent
              updateConversationState(sessionId, {
                researchAgentActive: true,
                researchPhase: response.metadata?.phase
              });

            } else {
              console.log('[Stream API] Using standard preference collection');

              // Standard preference collection
              const schedulePrompt = generateScheduleBuilderPrompt();
              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(schedulePrompt)}}\n\n`));

              // Update conversation state to expect preferences
              updateConversationState(sessionId, {
                waitingForPreferences: true
              });
            }

            await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
            await writer.close();
            return;
          }
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

        // No longer hard-coding PS Advisory responses - let the AI handle it naturally through vector search

        // Check if user is asking for help about app capabilities
        const isAskingForHelp = message.toLowerCase().includes('what can you') ||
                                message.toLowerCase().includes('help me with') ||
                                message.toLowerCase().includes('show me what') ||
                                message.toLowerCase().includes('how do i') ||
                                message.toLowerCase().includes('your features') ||
                                message.toLowerCase().includes('capabilities');

        // Handle help requests immediately with comprehensive guide
        if (isAskingForHelp) {
          const helpContent = message.toLowerCase().includes('everything') ||
                              message.toLowerCase().includes('all') ||
                              message.toLowerCase().includes('full')
                              ? getHelpContent()
                              : getQuickHelpResponse();

          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(helpContent)}}\n\n`));
          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
          await writer.close();
          return; // Just return from the async function, the Response is returned at the end
        }

        // Only use conference info handler for VERY specific queries
        // Let AI handle compound/complex topics intelligently
        const isSimpleConferenceQuery =
          (message.toLowerCase().match(/^(what|when|where|show me).*(parties|party|reception|happy hour)/) ||
           message.toLowerCase().match(/^(what's|whats|tell me about).*(weather|temperature|climate)\s*$/) ||
           message.toLowerCase().match(/^(where|how).*(venue|location|mandalay)/) ||
           message.toLowerCase().match(/^(show|list|what).*(networking|meetup)\s*$/));

        if (isSimpleConferenceQuery) {
          const conferenceInfo = getConferenceInfoResponse(message);
          if (conferenceInfo) {
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(conferenceInfo.content)}}\n\n`));

            // Add quick actions as suggestions if available
            if (conferenceInfo.quickActions && conferenceInfo.quickActions.length > 0) {
              const suggestionsText = `\n\n**💡 Related questions:**\n` +
                conferenceInfo.quickActions.map(q => `• ${q}`).join('\n');
              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(suggestionsText)}}\n\n`));
            }

            await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
            await writer.close();
            return; // Just return from the async function, the Response is returned at the end
          }
        }

        // Centralized agent routing (local recommendations, orchestrator agenda/research)
        try {
          const routed = await routeMessage(message, { sessionId, userId });

          if (routed && routed.metadata && routed.metadata.toolUsed && routed.metadata.toolUsed !== 'none') {
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(routed.message)}}\n\n`));

            if ((routed.data as any)?.agenda) {
              const agenda = (routed.data as any).agenda;
              storePendingAgenda(sessionId, agenda);
              updateConversationState(sessionId, {
                agendaBuilt: true,
                researchAgentActive: false
              });
            }

            await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(routed.metadata)}}\n\n`));

            await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
            await writer.close();
            return;
          }
        } catch (routerError) {
          console.error('[Stream API] Agent router error, continuing with fallback logic:', routerError);
        }

        // Check if we're waiting for preferences from a previous question
        const waitingForPreferences = shouldAskForPreferences(sessionId);

        // Use AI to classify user intent instead of keyword detection
        let intentClassification: IntentClassification;
        let toolDetection = detectToolIntent(message); // Keep as fallback

        try {
          // Build context for AI classification
          const intentContext: IntentContext = {
            history: conversation.messages.slice(-5).map(m => ({
              role: m.role,
              content: m.content
            })),
            userProfile: userPreferences,
            lastIntent: (conversation.state as any).lastIntent, // Access via any type assertion on state
            agendaAlreadyBuilt: conversation.state.agendaBuilt
          };

          // Get AI intent classification
          intentClassification = await classifyUserIntent(message, intentContext);

          console.log('[Stream API] AI Intent Classification:', {
            intent: intentClassification.primary_intent,
            confidence: intentClassification.confidence,
            action: intentClassification.suggested_action,
            reasoning: intentClassification.reasoning
          });

          // Update conversation state with detected intent
          updateConversationState(sessionId, {
            lastIntent: intentClassification.primary_intent
          });

          // Override toolDetection based on AI classification
          if (intentClassification.primary_intent === 'agenda_building' && intentClassification.confidence > 0.7) {
            toolDetection = {
              shouldUseTool: true,
              toolType: 'agenda_builder',
              confidence: intentClassification.confidence,
              extractedParams: intentClassification.extracted_entities || {}
            };
          } else if (intentClassification.primary_intent === 'local_recommendations') {
            toolDetection = {
              shouldUseTool: true,
              toolType: 'local_recommendations',
              confidence: intentClassification.confidence,
              extractedParams: {}
            };
          } else if (intentClassification.primary_intent === 'profile_research' && intentClassification.confidence > 0.8) {
            // Only trigger profile research for very confident explicit requests
            toolDetection = {
              shouldUseTool: true,
              toolType: 'profile_research',
              confidence: intentClassification.confidence,
              extractedParams: intentClassification.extracted_entities || {}
            };
          } else {
            // Default to not using tools, just answering informatively
            toolDetection = {
              shouldUseTool: false,
              toolType: 'session_search',
              confidence: 0,
              extractedParams: {}
            };
          }
        } catch (classificationError) {
          console.error('[Stream API] AI intent classification failed, falling back to keyword detection:', classificationError);
          // Continue with original keyword-based toolDetection
        }

        // Handle local recommendations via centralized agent router
        if (toolDetection.shouldUseTool && toolDetection.toolType === 'local_recommendations') {
          console.log('[Stream API] Detected local recommendations request with confidence:', toolDetection.confidence);

          try {
            const routed = await routeMessage(message, { sessionId, userId });

            if (routed && routed.metadata?.toolUsed === 'local_recommendations') {
              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(routed.message)}}\n\n`));

              // Track and update state
              addMessage(sessionId, 'assistant', routed.message);
              updateConversationState(sessionId, { lastToolUsed: 'local_recommendations' });

              await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(routed.metadata)}}\n\n`));
              await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
              await writer.close();
              return;
            }
          } catch (routerError) {
            console.error('[Stream API] Agent router error for local recommendations:', routerError);
            await writer.write(encoder.encode(`data: {"type":"status","content":"Switching to regular chat mode..."}\n\n`));
          }
        }

        // Handle practical needs and emotional support intents
        if (intentClassification && ['practical_need', 'emotional_support', 'navigation_help', 'social_planning'].includes(intentClassification.primary_intent)) {
          console.log('[Stream API] Handling attendee need:', intentClassification.primary_intent);

          // Map intent to attendee need
          const needMapping: Record<string, string> = {
            'practical_need': message.toLowerCase().includes('tired') ? 'tired' :
                             message.toLowerCase().includes('hungry') ? 'hungry' :
                             message.toLowerCase().includes('coffee') ? 'tired' :
                             message.toLowerCase().includes('wifi') ? 'practical' :
                             message.toLowerCase().includes('charging') ? 'practical' : 'tired',
            'emotional_support': message.toLowerCase().includes('overwhelmed') ? 'overwhelmed' :
                                message.toLowerCase().includes('anxious') ? 'overwhelmed' :
                                message.toLowerCase().includes('bored') ? 'bored' : 'overwhelmed',
            'navigation_help': 'lost',
            'social_planning': message.toLowerCase().includes('party') || message.toLowerCase().includes('parties') ? 'networking' : 'networking'
          };

          const attendeeNeed = needMapping[intentClassification.primary_intent] || 'general';
          const needResponse = getAttendeeNeedResponse(attendeeNeed, new Date());

          // Format response with suggestions
          let fullResponse = needResponse.response;
          if (needResponse.suggestions && needResponse.suggestions.length > 0) {
            fullResponse += '\n\n**Quick Questions:**\n' +
              needResponse.suggestions.map(s => `• ${s}`).join('\n');
          }

          await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(fullResponse)}}\n\n`));

          // Add conversation tracking
          addMessage(sessionId, 'assistant', fullResponse);

          // Update conversation state
          updateConversationState(sessionId, {
            lastIntent: intentClassification.primary_intent
          });

          // Send metadata
          await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify({
            intent: intentClassification.primary_intent,
            attendeeNeed: attendeeNeed,
            confidence: intentClassification.confidence
          })}}\n\n`));

          await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
          await writer.close();
          return;
        }

        // Check if user is requesting research-based personalization based on AI classification
        const isResearchRequest = toolDetection.toolType === 'profile_research' &&
          toolDetection.shouldUseTool;

        if (isResearchRequest) {
          const isLoggedIn = !!userPreferences?.email;
          console.log(`[Stream API] Detected research request from ${isLoggedIn ? 'logged-in' : 'guest'} user (AI classification)`);
          try {
            const routed = await routeMessage(message, { sessionId, userId: userPreferences?.email || undefined });

            if (routed && routed.metadata?.toolUsed === 'orchestrator') {
              await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(routed.message)}}\n\n`));

              // Update conversation state for research agent flow
              updateConversationState(sessionId, {
                researchAgentActive: true,
                researchPhase: routed.metadata?.phase
              });

              await writer.write(encoder.encode(`data: {"type":"metadata","content":${JSON.stringify(routed.metadata)}}\n\n`));
              await writer.write(encoder.encode(`data: {"type":"done","sessionId":"${sessionId}"}\n\n`));
              await writer.close();
              return;
            }
          } catch (routerError) {
            console.error('[Stream API] Agent router error for research request:', routerError);
            // Fall through to regular chat if router fails
          }
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

                  // Check if we actually have a valid agenda before offering to save
                  const hasValidAgenda = agendaResult.agenda?.days &&
                    typeof agendaResult.agenda.days === 'object' &&
                    Object.keys(agendaResult.agenda.days).length > 0;

                  if (!hasValidAgenda || formattedResponse.includes("couldn't generate") || formattedResponse.includes("couldn't find")) {
                    // Don't offer to save if agenda generation failed
                    await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(formattedResponse)}}\n\n`));
                  } else {
                    // Calculate total sessions from days object (not array)
                    let totalSessions = 0;
                    Object.values(agendaResult.agenda.days).forEach((day: any) => {
                      if (day?.schedule && Array.isArray(day.schedule)) {
                        totalSessions += day.schedule.length;
                      }
                    });

                    const enhancedResponse = `${formattedResponse}\n\n---\n\n🔒 **Would you like to save this agenda to your profile?**\n\nI can help you create a free account right here in the chat to:\n• Save all ${totalSessions || 'your'} selected sessions\n• Get reminders before sessions start\n• Export to your calendar\n• Access from any device\n\n**Just say "yes" to save your agenda**, or continue exploring sessions without saving.`;

                    await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(enhancedResponse)}}\n\n`));
                  }
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
        // Intelligently interpret the query
        const queryInterpretation = interpretQuery(message);
        const enhancedSearchQuery = generateEnhancedSearchQuery(queryInterpretation);
        const aiGuidance = generateAIGuidance(queryInterpretation);

        const queryComplexity = analyzeQueryComplexity(message);
        // Combine intelligent interpretation with keyword extraction
        const originalKeywords = extractKeywords(message);
        const keywords = [...new Set([...originalKeywords, ...queryInterpretation.suggestedSearchTerms.slice(0, 10)])];

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
              // Use enhanced search query for better matching on abstract queries
              const searchQuery = queryInterpretation.searchStrategy === 'direct' ? message : enhancedSearchQuery;
              return await hybridSearch(searchQuery, keywords, userPreferences?.interests, topK);
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
        let [vectorResults, webSearchResults] = await Promise.all([
          vectorSearchPromise,
          webSearchPromise
        ]);

        // Filter out PS Advisory fake sessions
        vectorResults = filterOutPSAdvisoryFakeSessions(vectorResults);

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

        // Build system prompt with conversation context and AI guidance
        const baseSystemPrompt = createSystemPrompt(
          userPreferences,
          sessionsContext,
          webSearchResults,
          aiGuidance
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

        // Validate PS Advisory information to prevent hallucination
        fullResponse = await validatePSAdvisoryResponse(fullResponse);

        // Additional check: clean any PS Advisory listed as sessions
        if (responseHasPSAdvisoryAsSession(fullResponse)) {
          fullResponse = cleanPSAdvisoryFromResponse(fullResponse);
        }

        // Clear the timeout since streaming completed successfully
        clearTimeout(timeout);

        // Check if we should offer schedule building based on context
        const scheduleOfferContext = detectScheduleOfferOpportunity(
          message,
          getConversationHistory(sessionId, 3),
          conversation.state.agendaBuilt || false
        );

        // Add contextual schedule offer if appropriate
        if (scheduleOfferContext.shouldOffer && !conversation.state.agendaBuilt) {
          const contextualOffer = generateContextualScheduleOffer(
            fullResponse,
            message,
            conversation.state.agendaBuilt || false
          );

          if (contextualOffer) {
            fullResponse += contextualOffer;
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(contextualOffer)}}\n\n`));
          } else if (scheduleOfferContext.suggestedPrompt) {
            fullResponse += scheduleOfferContext.suggestedPrompt;
            await writer.write(encoder.encode(`data: {"type":"content","content":${JSON.stringify(scheduleOfferContext.suggestedPrompt)}}\n\n`));
          }
        }

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

import { getConferenceContext, getVenueNavigationHelp, getNetworkingTips, getDiningRecommendations } from '@/lib/prompts/conference-context';

function createSystemPrompt(
  userPreferences: any,
  sessionsContext: any[],
  webSearchResults: any,
  aiGuidance?: string
): string {
  // Determine which additional context to include based on query
  let additionalContext = '';
  const messageLower = userPreferences?.lastMessage?.toLowerCase() || '';

  if (messageLower.includes('where') || messageLower.includes('location') || messageLower.includes('room')) {
    additionalContext += getVenueNavigationHelp();
  }
  if (messageLower.includes('network') || messageLower.includes('meet') || messageLower.includes('connect')) {
    additionalContext += getNetworkingTips();
  }
  if (messageLower.includes('food') || messageLower.includes('restaurant') || messageLower.includes('eat') || messageLower.includes('drink')) {
    additionalContext += getDiningRecommendations();
  }

  return `You are an expert conference concierge AI for ITC Vegas 2025 (October 14-16, 2025 at Mandalay Bay, Las Vegas).

This application is powered by PS Advisory (psadvisory.com), a specialized insurance technology consulting firm founded by Nancy Paul. PS Advisory helps insurance organizations with Salesforce implementations, digital transformation, AI/automation solutions, and custom insurtech development.

## CRITICAL INSTRUCTION: ALWAYS CONNECT TO CONFERENCE CONTENT
For EVERY query, you MUST:
1. Interpret the question in the context of insurance/insurtech and the conference
2. Find and recommend relevant sessions, even for abstract or compound topics
3. Never give generic responses - always tie back to specific ITC Vegas content
4. For compound topics (e.g., "AI and weather"), find sessions at the intersection (e.g., climate risk, parametric insurance)
5. Think beyond literal keywords - understand the underlying business need

${getConferenceContext()}

${additionalContext}

${aiGuidance || ''}

USER PROFILE:
- Name: ${userPreferences?.name || 'Guest'}
- Interests: ${userPreferences?.interests?.join(', ') || 'Not specified'}

RELEVANT SESSIONS (${sessionsContext.length} found):
${JSON.stringify(sessionsContext.slice(0, 10), null, 2)}

RESPONSE GUIDELINES:
1. ALWAYS recommend 3-5 specific sessions with explanations of relevance
2. Include clickable links for EVERY session and speaker mentioned:
   - [Session Title](/agenda/session/{session.id})
   - [Speaker Name](/speakers/{speaker.id})
   - [Track Name](/agenda?track={URL-encoded-track})
   - [Location](/locations?location={URL-encoded-location})
3. For abstract queries, interpret the business need and find relevant content
4. Explain WHY each session is relevant to the user's specific question
5. End with actionable next steps and related topics to explore
6. If discussing trends or impacts, cite specific conference sessions as evidence

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
