/**
 * AI-Powered Agent Router
 * Uses LLM intent classification instead of keyword matching
 * This replaces the flawed keyword-based routing
 */

import { classifyUserIntent, type IntentClassification } from '@/lib/ai-intent-classifier';
import { LocalRecommendationsAgent } from './local-recommendations-agent';
import { getOrchestrator } from './orchestrator-singleton';
import { AgentResult } from './agent-types';

export interface AIRouteContext {
  sessionId: string;
  userId?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}

export type AIRouteOutput = AgentResult<{ agenda?: any }, { 
  toolUsed?: string; 
  phase?: string;
  aiIntent?: string;
  confidence?: number;
}>;

/**
 * AI-Powered routing that uses LLM to understand intent
 * No more keyword matching!
 */
export async function aiRouteMessage(
  message: string, 
  ctx: AIRouteContext
): Promise<AIRouteOutput> {
  console.log('[AI Router] Processing message with AI intent classification');
  
  try {
    // Step 1: Use AI to classify the intent
    const intentClassification = await classifyUserIntent(message, {
      history: ctx.conversationHistory || [],
      sessionId: ctx.sessionId
    });

    console.log('[AI Router] Intent classified:', {
      intent: intentClassification.primary_intent,
      confidence: intentClassification.confidence,
      action: intentClassification.suggested_action
    });

    // Step 2: Route based on AI understanding, not keywords!
    switch (intentClassification.primary_intent) {
      // Local venue recommendations
      case 'local_recommendations':
      case 'practical_need':
        if (shouldHandleAsLocal(intentClassification)) {
          const local = new LocalRecommendationsAgent();
          const content = await local.getRecommendations(message);
          return {
            message: content,
            metadata: { 
              toolUsed: 'local_recommendations',
              aiIntent: intentClassification.primary_intent,
              confidence: intentClassification.confidence
            }
          };
        }
        break;

      // Agenda building
      case 'agenda_building':
        const orchestrator = getOrchestrator();
        const response = await orchestrator.invoke({
          sessionId: ctx.sessionId,
          message,
          userId: ctx.userId
        });
        return {
          message: response.message,
          data: response.agenda ? { agenda: response.agenda } : undefined,
          metadata: { 
            toolUsed: 'orchestrator',
            phase: response.metadata?.phase,
            aiIntent: intentClassification.primary_intent,
            confidence: intentClassification.confidence
          }
        };

      // Profile research  
      case 'profile_research':
        const orchestratorResearch = getOrchestrator();
        const researchResponse = await orchestratorResearch.invoke({
          sessionId: ctx.sessionId,
          message,
          userId: ctx.userId
        });
        return {
          message: researchResponse.message,
          data: researchResponse.agenda ? { agenda: researchResponse.agenda } : undefined,
          metadata: { 
            toolUsed: 'orchestrator',
            phase: researchResponse.metadata?.phase,
            aiIntent: intentClassification.primary_intent,
            confidence: intentClassification.confidence
          }
        };

      // Information seeking - check if it's about local venues
      case 'information_seeking':
        // Let AI determine if this is about local venues or conference info
        if (isAskingAboutLocalVenues(message, intentClassification)) {
          const local = new LocalRecommendationsAgent();
          const content = await local.getRecommendations(message);
          return {
            message: content,
            metadata: { 
              toolUsed: 'local_recommendations',
              aiIntent: 'local_query_from_info_seeking',
              confidence: intentClassification.confidence
            }
          };
        }
        // Otherwise, it's about conference info - don't route to agents
        break;
    }

    // Default: No specific agent needed
    return {
      message: getDefaultResponse(intentClassification),
      metadata: { 
        toolUsed: 'none',
        aiIntent: intentClassification.primary_intent,
        confidence: intentClassification.confidence
      }
    };

  } catch (error) {
    console.error('[AI Router] AI classification failed, using fallback:', error);
    
    // Fallback: Use the OLD keyword-based routing as backup
    // This ensures the system doesn't break if AI fails
    return fallbackToKeywordRouting(message, ctx);
  }
}

/**
 * Check if an intent should be handled as local recommendation
 */
function shouldHandleAsLocal(intent: IntentClassification): boolean {
  // Check entities and context to confirm it's really about local venues
  const entities = intent.extracted_entities;
  
  // If AI extracted location-related entities, it's likely local
  if (entities?.location || 
      intent.reasoning?.toLowerCase().includes('restaurant') ||
      intent.reasoning?.toLowerCase().includes('food') ||
      intent.reasoning?.toLowerCase().includes('entertainment')) {
    return true;
  }

  return intent.confidence > 0.7; // Trust high-confidence classifications
}

/**
 * Determine if an information_seeking query is about local venues
 */
function isAskingAboutLocalVenues(
  message: string, 
  intent: IntentClassification
): boolean {
  // The AI should have picked this up, but let's double-check
  const lower = message.toLowerCase();
  
  // Clear indicators it's NOT about local venues
  if (intent.reasoning?.toLowerCase().includes('keynote') ||
      intent.reasoning?.toLowerCase().includes('speaker') ||
      intent.reasoning?.toLowerCase().includes('session') ||
      intent.reasoning?.toLowerCase().includes('conference')) {
    return false;
  }

  // Clear indicators it IS about local venues
  if (intent.extracted_entities?.location ||
      lower.includes('restaurant') ||
      lower.includes('eat') ||
      lower.includes('drink') ||
      lower.includes('mandalay')) {
    return true;
  }

  return false;
}

/**
 * Generate appropriate default response based on intent
 */
function getDefaultResponse(intent: IntentClassification): string {
  switch (intent.primary_intent) {
    case 'greeting':
      return "Hello! I'm your AI Conference Concierge. I can help you find sessions, build a personalized agenda, or recommend local restaurants and venues. What would you like to know?";
    
    case 'information_seeking':
      // This is likely asking about conference content
      return "I can help you find information about sessions, speakers, and conference topics. Could you be more specific about what you're looking for?";
    
    default:
      return "How can I help? I can research your background and build a personalized agenda, find specific sessions or speakers, or suggest local places to eat and relax at Mandalay Bay.";
  }
}

/**
 * Fallback to keyword routing if AI fails
 * This is the OLD method - only used as emergency backup
 */
async function fallbackToKeywordRouting(
  message: string,
  ctx: AIRouteContext
): Promise<AIRouteOutput> {
  console.warn('[AI Router] Falling back to keyword routing');
  
  // Import the old router dynamically to avoid circular deps
  const { routeMessage } = await import('./agent-router');
  const result = await routeMessage(message, {
    sessionId: ctx.sessionId,
    userId: ctx.userId
  });
  
  return {
    ...result,
    metadata: {
      ...result.metadata,
      aiIntent: 'fallback_keyword_routing',
      confidence: 0
    }
  };
}

/**
 * Check if AI routing is enabled via feature flag
 */
export async function isAIRoutingEnabled(userId?: string): Promise<boolean> {
  // Start with environment variable
  if (process.env.ENABLE_AI_ROUTING === 'true') {
    return true;
  }

  // Gradual rollout by user percentage
  if (process.env.AI_ROUTING_PERCENTAGE) {
    const percentage = parseInt(process.env.AI_ROUTING_PERCENTAGE);
    if (userId) {
      // Deterministic rollout based on user ID
      const hash = userId.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);
      return (hash % 100) < percentage;
    }
  }

  return false;
}