/**
 * Agent Route Handler
 * Routes messages to appropriate agents using the new architecture
 */

import { NextRequest } from 'next/server';
import { AgentFactory } from '@/infrastructure/agents/AgentFactory';
import { AgentContext } from '@/domain/agents/BaseAgent';
import { featureFlags } from '@/infrastructure/FeatureFlags';

export class AgentRoute {
  private factory: AgentFactory;
  private initialized = false;
  
  /**
   * Initialize the agent factory
   */
  private async initialize(): Promise<void> {
    if (!this.initialized) {
      this.factory = AgentFactory.getInstance();
      await this.factory.initialize();
      this.initialized = true;
      console.log('[AgentRoute] Initialized with new architecture');
    }
  }
  
  /**
   * Route message to appropriate agent
   */
  async routeMessage(message: string, sessionId: string, userId?: string): Promise<any> {
    await this.initialize();
    
    // Create context
    const context: AgentContext = {
      message,
      sessionId,
      userId
    };
    
    // Find best agent for the message
    const agent = await this.factory.findBestAgent(message, sessionId, userId);
    
    if (!agent) {
      // No specific agent found, return default response
      return {
        message: "I'm here to help! I can:\n\n📅 Build a personalized conference agenda\n🌍 Provide local recommendations for dining and entertainment\n🔍 Help you find specific sessions or speakers\n\nWhat would you like to know?",
        metadata: {
          agentName: 'default',
          routed: false
        }
      };
    }
    
    // Invoke the selected agent
    const response = await agent.invoke(context);
    
    return {
      ...response,
      metadata: {
        ...response.metadata,
        routed: true,
        architecture: 'new'
      }
    };
  }
  
  /**
   * Main POST handler
   */
  async POST(req: NextRequest): Promise<Response> {
    try {
      const body = await req.json();
      const { message, sessionId, userId } = body;
      
      if (!message || !sessionId) {
        return new Response(
          JSON.stringify({ error: 'Missing required fields: message and sessionId' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Check if new agent system should be used
      const useNewAgents = await featureFlags.isEnabled('new-agent-system', {
        userId,
        percentage: 50 // Start with 50% of traffic
      });
      
      if (useNewAgents) {
        console.log('[AgentRoute] Using NEW agent architecture');
        
        const response = await this.routeMessage(message, sessionId, userId);
        
        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/json',
              'X-Agent-Architecture': 'new'
            } 
          }
        );
      } else {
        // Fall back to legacy agent router
        console.log('[AgentRoute] Using LEGACY agent system');
        
        // Import legacy router dynamically to avoid circular dependencies
        const { routeMessage } = await import('@/lib/agents/agent-router');
        const response = await routeMessage(message, { sessionId, userId });
        
        return new Response(
          JSON.stringify(response),
          { 
            status: 200, 
            headers: { 
              'Content-Type': 'application/json',
              'X-Agent-Architecture': 'legacy'
            } 
          }
        );
      }
      
    } catch (error) {
      console.error('[AgentRoute] Error:', error);
      
      return new Response(
        JSON.stringify({ 
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  /**
   * Get agent statistics
   */
  async getStats(): Promise<any> {
    await this.initialize();
    return this.factory.getStats();
  }
}

// Export instance
export const agentRoute = new AgentRoute();