/**
 * Chat Route Handler
 * Thin routing layer with parallel implementation support
 */

import { NextRequest } from 'next/server';
import { featureFlags } from '@/infrastructure/FeatureFlags';
import { ChatService } from '@/application/services/ChatService';
import { SearchService } from '@/application/services/SearchService';
import { ResponseGenerator } from '@/domain/services/ResponseGenerator';
import { IntentClassifier } from '@/domain/services/IntentClassifier';
import { ConversationService } from '@/application/services/ConversationService';
import { createRepositories } from '@/infrastructure/RepositoryFactory';

// Import legacy handler
import { POST as legacyHandler } from '@/app/api/chat/stream/route';

export class ChatRoute {
  private chatService: ChatService | null = null;
  private initialized = false;

  /**
   * Initialize the new service (lazy loading)
   */
  private async initializeNewService(): Promise<ChatService> {
    if (!this.initialized) {
      // Create repositories
      const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
      
      // Create services
      const searchService = new SearchService(sessionRepo, vectorRepo, cacheRepo);
      const intentClassifier = new IntentClassifier();
      const responseGenerator = new ResponseGenerator();
      const conversationService = new ConversationService();
      
      // Create chat service
      this.chatService = new ChatService(
        intentClassifier,
        searchService,
        responseGenerator,
        conversationService
      );
      
      this.initialized = true;
    }
    
    return this.chatService!;
  }

  /**
   * Main POST handler with parallel implementation
   */
  async POST(req: NextRequest): Promise<Response> {
    try {
      // Extract user ID from request
      const body = await req.json();
      const userId = body.userId || req.headers.get('x-user-id');
      
      // Check if new implementation should be used
      const useNewImplementation = await featureFlags.isEnabled('new-chat-service', {
        userId,
        percentage: 10 // Start with 10% of traffic
      });

      if (useNewImplementation) {
        console.log('[ChatRoute] Using NEW implementation');
        
        try {
          // Use new implementation
          const chatService = await this.initializeNewService();
          
          const response = await chatService.processMessageStream({
            message: body.message,
            sessionId: body.sessionId || generateSessionId(),
            userId,
            userPreferences: body.userPreferences
          });

          // Log success for monitoring
          logMetric('chat.new_implementation.success', 1);

          // Return streaming response
          return new Response(response.stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
              'X-Implementation': 'new'
            }
          });
          
        } catch (error) {
          // Log failure and fallback
          console.error('[ChatRoute] New implementation failed, falling back:', error);
          logMetric('chat.new_implementation.failure', 1);
          logMetric('chat.fallback', 1);
          
          // Fallback to legacy
          const response = await legacyHandler(req);
          response.headers.set('X-Implementation', 'legacy-fallback');
          return response;
        }
      } else {
        console.log('[ChatRoute] Using LEGACY implementation');
        
        // Use legacy implementation
        const response = await legacyHandler(req);
        response.headers.set('X-Implementation', 'legacy');
        
        // Log for comparison
        logMetric('chat.legacy_implementation.success', 1);
        
        return response;
      }
      
    } catch (error) {
      console.error('[ChatRoute] Request failed:', error);
      logMetric('chat.error', 1);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }
}

/**
 * Helper function to generate session IDs
 */
function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Helper function to log metrics (placeholder)
 */
function logMetric(metric: string, value: number): void {
  // In production, this would send to monitoring service
  console.log(`[Metric] ${metric}: ${value}`);
}

// Export instance
export const chatRoute = new ChatRoute();