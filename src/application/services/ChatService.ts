/**
 * Chat Service
 * Orchestrates the entire chat flow with clean separation of concerns
 */

import { SearchService, SearchQuery } from './SearchService';
import { Session } from '@/domain/interfaces/IRepository';

export interface ChatRequest {
  message: string;
  sessionId: string;
  userId?: string;
  userPreferences?: UserPreferences;
}

export interface ChatResponse {
  message: string;
  sessionId: string;
  metadata?: {
    intent?: string;
    confidence?: number;
    sessionsFound?: number;
    responseTime?: number;
    agent?: string;
  };
  sources?: Array<{
    type: string;
    title?: string;
    url?: string;
  }>;
  stream?: ReadableStream;
}

export interface UserPreferences {
  name?: string;
  email?: string;
  interests?: string[];
  role?: string;
  company?: string;
}

export interface IIntentClassifier {
  classify(message: string, context?: any): Promise<IntentClassification>;
}

export interface IntentClassification {
  type: IntentType;
  confidence: number;
  entities?: Record<string, any>;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  suggestedAction?: string;
}

export type IntentType =
  | 'information_seeking'
  | 'agenda_building'
  | 'local_recommendations'
  | 'profile_research'
  | 'greeting'
  | 'general_chat';

export interface IResponseGenerator {
  generate(context: ResponseContext): Promise<string>;
  generateStream(context: ResponseContext): ReadableStream;
}

export interface ResponseContext {
  query: string;
  intent: IntentClassification;
  sessions: Session[];
  userProfile?: UserPreferences;
  conversationHistory?: Message[];
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface IAgent {
  name: string;
  canHandle(intent: IntentType): boolean;
  handle(request: ChatRequest, intent: IntentClassification): Promise<ChatResponse>;
}

export class ChatService {
  private agents: Map<IntentType, IAgent> = new Map();

  constructor(
    private intentClassifier: IIntentClassifier,
    private searchService: SearchService,
    private responseGenerator: IResponseGenerator,
    private conversationService: IConversationService
  ) {
    this.registerAgents();
  }

  /**
   * Register specialized agents for different intents
   */
  private registerAgents() {
    // Agents will be registered here
    // For now, we'll handle everything in the default flow
  }

  /**
   * Process incoming chat message
   */
  async processMessage(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    try {
      // 1. Get conversation context
      const conversation = await this.conversationService.getConversation(request.sessionId);

      // 2. Add user message to history
      await this.conversationService.addMessage(request.sessionId, {
        role: 'user',
        content: request.message,
        timestamp: new Date()
      });

      // 3. Classify intent
      const intent = await this.intentClassifier.classify(request.message, {
        history: conversation.messages,
        userProfile: request.userPreferences
      });

      console.log('[ChatService] Intent classified:', {
        type: intent.type,
        confidence: intent.confidence
      });

      // 4. Check if a specialized agent should handle this
      const agent = this.agents.get(intent.type);
      if (agent && agent.canHandle(intent.type)) {
        console.log(`[ChatService] Routing to ${agent.name} agent`);
        return await agent.handle(request, intent);
      }

      // 5. Default flow: Search and generate response
      const response = await this.handleDefaultFlow(request, intent, conversation);

      // 6. Add assistant message to history
      await this.conversationService.addMessage(request.sessionId, {
        role: 'assistant',
        content: response.message,
        timestamp: new Date()
      });

      // 7. Add metadata
      response.metadata = {
        intent: intent.type,
        confidence: intent.confidence,
        responseTime: Date.now() - startTime
      };

      return response;

    } catch (error) {
      console.error('[ChatService] Error processing message:', error);

      return {
        message: 'I encountered an error while processing your request. Please try again.',
        sessionId: request.sessionId,
        metadata: {
          intent: 'error',
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Handle default flow: search for context and generate response
   */
  private async handleDefaultFlow(
    request: ChatRequest,
    intent: IntentClassification,
    conversation: IConversation
  ): Promise<ChatResponse> {
    // 1. Search for relevant sessions
    const searchQuery: SearchQuery = {
      query: request.message,
      type: intent.searchType || 'hybrid',
      keywords: this.extractKeywords(request.message),
      userInterests: request.userPreferences?.interests,
      limit: this.determineResultLimit(intent.type)
    };

    const searchResults = await this.searchService.search(searchQuery);

    console.log(`[ChatService] Found ${searchResults.sessions.length} relevant sessions`);

    // 2. Generate response based on search results
    const responseContext: ResponseContext = {
      query: request.message,
      intent: intent,
      sessions: searchResults.sessions,
      userProfile: request.userPreferences,
      conversationHistory: conversation.messages
    };

    const generatedResponse = await this.responseGenerator.generate(responseContext);

    // 3. Format sources
    const sources = this.formatSources(searchResults.sessions);

    return {
      message: generatedResponse,
      sessionId: request.sessionId,
      metadata: {
        sessionsFound: searchResults.totalResults,
        agent: 'default'
      },
      sources
    };
  }

  /**
   * Process message with streaming response
   */
  async processMessageStream(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();

    // Get conversation context
    const conversation = await this.conversationService.getConversation(request.sessionId);

    // Classify intent
    const intent = await this.intentClassifier.classify(request.message, {
      history: conversation.messages,
      userProfile: request.userPreferences
    });

    // Search for context
    const searchQuery: SearchQuery = {
      query: request.message,
      type: intent.searchType || 'hybrid',
      keywords: this.extractKeywords(request.message),
      userInterests: request.userPreferences?.interests,
      limit: this.determineResultLimit(intent.type)
    };

    const searchResults = await this.searchService.search(searchQuery);

    // Create response context
    const responseContext: ResponseContext = {
      query: request.message,
      intent: intent,
      sessions: searchResults.sessions,
      userProfile: request.userPreferences,
      conversationHistory: conversation.messages
    };

    // Generate streaming response
    const stream = this.responseGenerator.generateStream(responseContext);

    return {
      message: '', // Will be streamed
      sessionId: request.sessionId,
      metadata: {
        intent: intent.type,
        confidence: intent.confidence,
        sessionsFound: searchResults.totalResults,
        responseTime: Date.now() - startTime,
        agent: 'default'
      },
      sources: this.formatSources(searchResults.sessions),
      stream
    };
  }

  /**
   * Extract keywords from message
   */
  private extractKeywords(message: string): string[] {
    const lowerMessage = message.toLowerCase();
    const keywords: string[] = [];

    const importantTerms = [
      'ai', 'artificial intelligence', 'machine learning',
      'automation', 'claims', 'underwriting', 'cyber', 'security',
      'data', 'analytics', 'innovation', 'digital', 'transformation',
      'customer', 'experience', 'embedded', 'insurtech', 'blockchain'
    ];

    importantTerms.forEach(term => {
      if (lowerMessage.includes(term)) {
        keywords.push(term);
      }
    });

    return keywords;
  }

  /**
   * Determine how many results to fetch based on intent
   */
  private determineResultLimit(intentType: IntentType): number {
    switch (intentType) {
      case 'agenda_building':
        return 50; // Need more for agenda building
      case 'information_seeking':
        return 20;
      case 'general_chat':
        return 10;
      default:
        return 15;
    }
  }

  /**
   * Format sources for response
   */
  private formatSources(sessions: Session[]): Array<{ type: string; title?: string; url?: string }> {
    return sessions.slice(0, 5).map(session => ({
      type: 'session',
      title: session.title,
      url: `/agenda/session/${session.id}`
    }));
  }

  /**
   * Register a new agent
   */
  registerAgent(intentType: IntentType, agent: IAgent): void {
    this.agents.set(intentType, agent);
    console.log(`[ChatService] Registered ${agent.name} agent for ${intentType}`);
  }
}

/**
 * Conversation Service Interface
 */
interface IConversationService {
  getConversation(sessionId: string): Promise<IConversation>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  updateState(sessionId: string, state: any): Promise<void>;
}

interface IConversation {
  sessionId: string;
  messages: Message[];
  state: any;
  createdAt: Date;
  updatedAt: Date;
}