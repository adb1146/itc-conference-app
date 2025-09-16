/**
 * Agent Factory
 * Creates and manages agent instances with dependency injection
 */

import { BaseAgent, AgentDependencies } from '../../domain/agents/BaseAgent';
import { AgendaBuilderAgent } from '../../domain/agents/AgendaBuilderAgent';
import { LocalExpertAgent } from '../../domain/agents/LocalExpertAgent';
import { SearchService } from '../../application/services/SearchService';
import { AgendaService } from '../../application/services/AgendaService';
import { ConversationService } from '../../application/services/ConversationService';
import { createRepositories } from '../RepositoryFactory';
import { eventBus } from '../events/EventBus';
import { messageQueue } from '../events/MessageQueue';

export class AgentFactory {
  private static instance: AgentFactory;
  private agents: Map<string, BaseAgent> = new Map();
  private dependencies: AgentDependencies | null = null;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  static getInstance(): AgentFactory {
    if (!AgentFactory.instance) {
      AgentFactory.instance = new AgentFactory();
    }
    return AgentFactory.instance;
  }
  
  /**
   * Initialize dependencies
   */
  async initialize(): Promise<void> {
    if (this.dependencies) {
      return; // Already initialized
    }
    
    console.log('[AgentFactory] Initializing dependencies...');
    
    // Create repositories
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    
    // Create services
    const searchService = new SearchService(sessionRepo, vectorRepo, cacheRepo);
    const agendaService = new AgendaService(searchService);
    const conversationService = new ConversationService();
    
    // Create dependencies object
    this.dependencies = {
      searchService,
      agendaService,
      conversationService,
      sessionRepository: sessionRepo,
      eventBus,
      messageQueue
    };
    
    // Create and register agents
    this.registerAgents();
    
    console.log('[AgentFactory] Initialization complete');
  }
  
  /**
   * Register all available agents
   */
  private registerAgents(): void {
    if (!this.dependencies) {
      throw new Error('Dependencies not initialized');
    }
    
    // Create agents
    const agendaBuilder = new AgendaBuilderAgent(this.dependencies);
    const localExpert = new LocalExpertAgent(this.dependencies);
    
    // Register agents
    this.agents.set('agenda_builder', agendaBuilder);
    this.agents.set('local_expert', localExpert);
    
    console.log(`[AgentFactory] Registered ${this.agents.size} agents`);
  }
  
  /**
   * Get an agent by name
   */
  getAgent(name: string): BaseAgent | undefined {
    return this.agents.get(name);
  }
  
  /**
   * Get all agents
   */
  getAllAgents(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
  
  /**
   * Find best agent for a message
   */
  async findBestAgent(message: string, sessionId: string, userId?: string): Promise<BaseAgent | null> {
    const context = { message, sessionId, userId };
    
    // Check each agent to see if it can handle the message
    for (const agent of this.agents.values()) {
      if (agent.canHandle(context)) {
        console.log(`[AgentFactory] Selected ${agent.getName()} for message`);
        return agent;
      }
    }
    
    console.log('[AgentFactory] No suitable agent found for message');
    return null;
  }
  
  /**
   * Get agent statistics
   */
  getStats(): { totalAgents: number; agentNames: string[] } {
    return {
      totalAgents: this.agents.size,
      agentNames: Array.from(this.agents.keys())
    };
  }
}