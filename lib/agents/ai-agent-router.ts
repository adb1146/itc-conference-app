/**
 * AI-Powered Agent Router
 * Uses LLM intent classification instead of keyword matching
 * This replaces the flawed keyword-based routing
 */

import { classifyUserIntent, type IntentClassification } from '@/lib/ai-intent-classifier';
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
      history: ctx.conversationHistory || []
    });

    console.log('[AI Router] Intent classified:', {
      intent: intentClassification.primary_intent,
      confidence: intentClassification.confidence,
      action: intentClassification.suggested_action
    });

    // Step 2: Route based on AI understanding, not keywords!
    switch (intentClassification.primary_intent) {
      // Removed local recommendations - these queries will be handled by main chat

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

      // Information seeking - about conference info - don't route to agents
      case 'information_seeking':
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
    
    // Fallback: Return a simple error message
    return {
      message: "I had trouble understanding your request. Could you please rephrase it?",
      metadata: {
        toolUsed: 'none',
        aiIntent: 'classification_failed',
        confidence: 0
      }
    };
  }
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
