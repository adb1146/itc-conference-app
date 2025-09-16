/**
 * Smart Router Wrapper
 * Gradually transitions from keyword-based to AI-based routing
 * Uses feature flags for safe rollout
 */

import { routeMessage as keywordRouteMessage } from './agent-router';
import { aiRouteMessage, isAIRoutingEnabled } from './ai-agent-router';
import type { RouteContext } from './agent-router';
import type { AIRouteContext, AIRouteOutput } from './ai-agent-router';

/**
 * Smart routing that can use either AI or keyword routing
 * based on feature flags and rollout percentage
 */
export async function smartRouteMessage(
  message: string,
  context: RouteContext & { conversationHistory?: Array<{ role: string; content: string }> }
): Promise<AIRouteOutput> {
  
  // Check if AI routing is enabled for this user
  const useAI = await isAIRoutingEnabled(context.userId);
  
  if (useAI) {
    console.log('[Smart Router] Using AI-powered routing');
    
    try {
      // Try AI routing first
      const aiContext: AIRouteContext = {
        sessionId: context.sessionId,
        userId: context.userId,
        conversationHistory: context.conversationHistory
      };
      
      const result = await aiRouteMessage(message, aiContext);
      
      // Log for monitoring
      logRoutingDecision('ai', message, result.metadata?.aiIntent || 'unknown', result.metadata?.confidence || 0);
      
      return result;
      
    } catch (error) {
      console.error('[Smart Router] AI routing failed, falling back to keywords:', error);
      logRoutingError('ai', error);
      
      // Fall through to keyword routing
    }
  }
  
  // Use keyword routing (either as primary or fallback)
  console.log('[Smart Router] Using keyword-based routing');
  
  const keywordResult = await keywordRouteMessage(message, {
    sessionId: context.sessionId,
    userId: context.userId
  });
  
  // Convert to AI output format
  const result: AIRouteOutput = {
    ...keywordResult,
    metadata: {
      ...keywordResult.metadata,
      aiIntent: 'keyword_routing',
      confidence: 0.5 // Keywords have medium confidence
    }
  };
  
  // Log for monitoring
  logRoutingDecision('keyword', message, result.metadata?.toolUsed || 'none', 0.5);
  
  return result;
}

/**
 * Log routing decisions for monitoring and analysis
 */
function logRoutingDecision(
  method: 'ai' | 'keyword',
  message: string,
  decision: string,
  confidence: number
): void {
  // In production, this would send to analytics
  console.log('[Routing Analytics]', {
    method,
    messageLength: message.length,
    decision,
    confidence,
    timestamp: new Date().toISOString()
  });
  
  // Track specific problem cases
  if (message.toLowerCase().includes('keynote') && decision.includes('local')) {
    console.error('[Routing Error] Keynote query routed to local recommendations!');
  }
}

/**
 * Log routing errors for debugging
 */
function logRoutingError(method: string, error: any): void {
  console.error('[Routing Error]', {
    method,
    error: error.message || error,
    timestamp: new Date().toISOString()
  });
}