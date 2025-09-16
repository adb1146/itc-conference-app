/**
 * Base Agent Class
 * Provides common functionality and dependency injection for all agents
 */

import { SearchService } from '../../application/services/SearchService';
import { AgendaService } from '../../application/services/AgendaService';
import { ConversationService } from '../../application/services/ConversationService';
import { IEventBus } from '../../infrastructure/events/EventBus';
import { IMessageQueue } from '../../infrastructure/events/MessageQueue';
import { ISessionRepository } from '../interfaces/IRepository';

export interface AgentDependencies {
  searchService: SearchService;
  agendaService: AgendaService;
  conversationService: ConversationService;
  sessionRepository: ISessionRepository;
  eventBus: IEventBus;
  messageQueue: IMessageQueue;
}

export interface AgentContext {
  sessionId: string;
  userId?: string;
  message: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface AgentResponse {
  message: string;
  data?: any;
  metadata?: {
    agentName: string;
    confidence?: number;
    toolsUsed?: string[];
    processingTime?: number;
  };
  nextAction?: string;
}

export abstract class BaseAgent {
  protected name: string;
  protected description: string;
  protected dependencies: AgentDependencies;
  
  constructor(name: string, description: string, dependencies: AgentDependencies) {
    this.name = name;
    this.description = description;
    this.dependencies = dependencies;
  }
  
  /**
   * Get agent name
   */
  getName(): string {
    return this.name;
  }
  
  /**
   * Get agent description
   */
  getDescription(): string {
    return this.description;
  }
  
  /**
   * Check if this agent can handle the given message
   */
  abstract canHandle(context: AgentContext): boolean;
  
  /**
   * Process the message and return a response
   */
  abstract process(context: AgentContext): Promise<AgentResponse>;
  
  /**
   * Public interface for invoking the agent
   */
  async invoke(context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();
    
    try {
      // Check if agent can handle this request
      if (!this.canHandle(context)) {
        return {
          message: `This request is outside my capabilities. ${this.getDescription()}`,
          metadata: {
            agentName: this.name,
            confidence: 0
          }
        };
      }
      
      // Log agent invocation
      await this.logInvocation(context);
      
      // Process the request
      const response = await this.process(context);
      
      // Add metadata
      response.metadata = response.metadata || {};
      response.metadata.agentName = this.name;
      response.metadata.processingTime = Date.now() - startTime;
      
      // Log completion
      await this.logCompletion(context, response);
      
      return response;
      
    } catch (error) {
      console.error(`[${this.name}] Error processing request:`, error);
      
      // Log failure
      await this.logFailure(context, error);
      
      return {
        message: 'I encountered an error while processing your request. Please try again.',
        metadata: {
          agentName: this.name,
          confidence: 0,
          processingTime: Date.now() - startTime
        }
      };
    }
  }
  
  /**
   * Helper: Search for sessions
   */
  protected async searchSessions(query: string, limit: number = 20): Promise<any[]> {
    const result = await this.dependencies.searchService.search({
      query,
      type: 'hybrid',
      limit
    });
    return result.sessions;
  }
  
  /**
   * Helper: Get conversation history
   */
  protected async getConversationHistory(sessionId: string): Promise<any> {
    return await this.dependencies.conversationService.getConversation(sessionId);
  }
  
  /**
   * Helper: Save message to conversation
   */
  protected async saveMessage(sessionId: string, role: 'user' | 'assistant', content: string): Promise<void> {
    await this.dependencies.conversationService.addMessage(sessionId, {
      role,
      content,
      timestamp: new Date()
    });
  }
  
  /**
   * Helper: Update conversation state
   */
  protected async updateConversationState(sessionId: string, state: any): Promise<void> {
    await this.dependencies.conversationService.updateState(sessionId, state);
  }
  
  /**
   * Log agent invocation
   */
  private async logInvocation(context: AgentContext): Promise<void> {
    await this.dependencies.eventBus.emit('agent.invoked', {
      agentName: this.name,
      sessionId: context.sessionId,
      userId: context.userId,
      message: context.message.substring(0, 100) // First 100 chars
    });
  }
  
  /**
   * Log successful completion
   */
  private async logCompletion(context: AgentContext, response: AgentResponse): Promise<void> {
    await this.dependencies.eventBus.emit('agent.completed', {
      agentName: this.name,
      sessionId: context.sessionId,
      processingTime: response.metadata?.processingTime,
      confidence: response.metadata?.confidence
    });
  }
  
  /**
   * Log agent failure
   */
  private async logFailure(context: AgentContext, error: any): Promise<void> {
    await this.dependencies.eventBus.emit('agent.failed', {
      agentName: this.name,
      sessionId: context.sessionId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
  
  /**
   * Extract keywords from message
   */
  protected extractKeywords(message: string): string[] {
    const keywords: string[] = [];
    const lower = message.toLowerCase();
    
    // Common conference-related terms
    const terms = [
      'ai', 'artificial intelligence', 'machine learning',
      'insurance', 'insurtech', 'claims', 'underwriting',
      'cyber', 'security', 'data', 'analytics', 'digital',
      'transformation', 'innovation', 'automation'
    ];
    
    terms.forEach(term => {
      if (lower.includes(term)) {
        keywords.push(term);
      }
    });
    
    return keywords;
  }
}