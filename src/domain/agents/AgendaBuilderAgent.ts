/**
 * Agenda Builder Agent
 * Specializes in creating personalized conference agendas
 */

import { BaseAgent, AgentContext, AgentResponse, AgentDependencies } from './BaseAgent';
import { PersonalizedAgenda } from '../../application/services/AgendaService';

export class AgendaBuilderAgent extends BaseAgent {
  constructor(dependencies: AgentDependencies) {
    super(
      'AgendaBuilderAgent',
      'I help create personalized conference agendas based on your interests and preferences',
      dependencies
    );
  }
  
  /**
   * Check if this agent should handle the request
   */
  canHandle(context: AgentContext): boolean {
    const lower = context.message.toLowerCase();
    
    // Check for agenda-related keywords
    const agendaKeywords = [
      'agenda', 'schedule', 'itinerary', 'plan',
      'sessions', 'talks', 'build my', 'create my',
      'personalized', 'recommend sessions'
    ];
    
    // Also handle "help me with my schedule" pattern
    const needsHelp = (lower.includes('help') || lower.includes('assist')) &&
                     (lower.includes('schedule') || lower.includes('agenda'));
    
    return agendaKeywords.some(keyword => lower.includes(keyword)) || needsHelp;
  }
  
  /**
   * Process the agenda building request
   */
  async process(context: AgentContext): Promise<AgentResponse> {
    try {
      // Get user preferences from conversation state
      const conversation = await this.getConversationHistory(context.sessionId);
      const userState = conversation.state?.userProfile || {};
      
      // Extract interests from the message and conversation history
      const interests = this.extractInterests(context.message, conversation);
      
      // Check if user already has an agenda
      if (context.userId) {
        const existingAgenda = await this.checkExistingAgenda(context.userId);
        if (existingAgenda) {
          return this.handleExistingAgenda(context, existingAgenda, interests);
        }
      }
      
      // Build new agenda
      const agenda = await this.buildPersonalizedAgenda(context, interests, userState);
      
      // Save agenda if user is logged in
      if (context.userId && agenda.items.length > 0) {
        await this.saveAgenda(context.userId, agenda);
      }
      
      // Format response
      return this.formatAgendaResponse(agenda, context.userId);
      
    } catch (error) {
      console.error('[AgendaBuilderAgent] Error building agenda:', error);
      throw error;
    }
  }
  
  /**
   * Extract user interests from message and conversation
   */
  private extractInterests(message: string, conversation: any): string[] {
    const interests = new Set<string>();
    
    // Extract from current message
    const keywords = this.extractKeywords(message);
    keywords.forEach(k => interests.add(k));
    
    // Extract from conversation history
    if (conversation.messages) {
      conversation.messages.forEach((msg: any) => {
        if (msg.role === 'user') {
          const msgKeywords = this.extractKeywords(msg.content);
          msgKeywords.forEach(k => interests.add(k));
        }
      });
    }
    
    // Add from user profile if available
    if (conversation.state?.userProfile?.interests) {
      conversation.state.userProfile.interests.forEach((i: string) => interests.add(i));
    }
    
    return Array.from(interests);
  }
  
  /**
   * Build personalized agenda
   */
  private async buildPersonalizedAgenda(
    context: AgentContext,
    interests: string[],
    userState: any
  ): Promise<PersonalizedAgenda> {
    // Use AgendaService to build agenda
    const agenda = await this.dependencies.agendaService.buildAgenda({
      userId: context.userId,
      interests: interests.length > 0 ? interests : ['innovation', 'technology', 'insurance'],
      tracks: userState.preferredTracks,
      preferredFormat: 'detailed',
      avoidConflicts: true
    });
    
    // Update conversation state
    await this.updateConversationState(context.sessionId, {
      agendaBuilt: true,
      totalSessions: agenda.totalSessions,
      interests: agenda.coverage.interests
    });
    
    return agenda;
  }
  
  /**
   * Check for existing agenda
   */
  private async checkExistingAgenda(userId: string): Promise<any> {
    // This would query the database for existing agenda
    // For now, return null to always build new
    return null;
  }
  
  /**
   * Handle case where user already has an agenda
   */
  private async handleExistingAgenda(
    context: AgentContext,
    existingAgenda: any,
    newInterests: string[]
  ): Promise<AgentResponse> {
    const message = `I see you already have a personalized agenda with ${existingAgenda.totalSessions} sessions. 

Would you like me to:
1. Update your existing agenda with new interests: ${newInterests.join(', ')}
2. Create a completely new agenda
3. View your current agenda

Just let me know what you'd prefer!`;
    
    return {
      message,
      data: { existingAgenda, suggestedInterests: newInterests },
      metadata: {
        agentName: this.name,
        confidence: 0.9,
        toolsUsed: ['agenda_check']
      }
    };
  }
  
  /**
   * Save agenda to database
   */
  private async saveAgenda(userId: string, agenda: PersonalizedAgenda): Promise<void> {
    // Queue agenda save operation
    await this.dependencies.messageQueue.publish('agenda.save', {
      userId,
      agenda,
      timestamp: new Date()
    });
  }
  
  /**
   * Format agenda into readable response
   */
  private formatAgendaResponse(agenda: PersonalizedAgenda, userId?: string): AgentResponse {
    if (agenda.items.length === 0) {
      return {
        message: "I couldn't find any sessions matching your interests. Could you tell me more about what topics you're interested in?",
        metadata: {
          agentName: this.name,
          confidence: 0.3
        }
      };
    }
    
    // Build formatted message
    let message = `📅 **Your Personalized ITC Conference Agenda**\n\n`;
    message += `I've created an agenda with **${agenda.totalSessions} sessions** based on your interests in: ${agenda.coverage.interests.join(', ')}\n\n`;
    
    // Group sessions by day
    const sessionsByDay = new Map<string, typeof agenda.items>();
    agenda.items.forEach(item => {
      const day = new Date(item.startTime).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, []);
      }
      sessionsByDay.get(day)!.push(item);
    });
    
    // Format sessions by day
    sessionsByDay.forEach((sessions, day) => {
      message += `\n**${day}**\n`;
      
      sessions.forEach(item => {
        const time = new Date(item.startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit' 
        });
        
        const priority = item.priority === 'must-attend' ? '🌟' : 
                        item.priority === 'recommended' ? '⭐' : '';
        
        message += `\n${priority} **${time}** - ${item.session.title}\n`;
        
        if (item.session.location) {
          message += `   📍 ${item.session.location}\n`;
        }
        
        if (item.reason) {
          message += `   💡 ${item.reason}\n`;
        }
        
        if (item.conflicts && item.conflicts.length > 0) {
          message += `   ⚠️ Conflicts with ${item.conflicts.length} other session(s)\n`;
        }
      });
    });
    
    // Add recommendations
    if (agenda.recommendations.length > 0) {
      message += `\n\n**💡 Recommendations:**\n`;
      agenda.recommendations.forEach(rec => {
        message += `• ${rec}\n`;
      });
    }
    
    // Add save note for logged-in users
    if (userId) {
      message += `\n✅ Your agenda has been saved and you can access it anytime!`;
    } else {
      message += `\n🔒 Sign in to save your personalized agenda and get updates!`;
    }
    
    return {
      message,
      data: { agenda },
      metadata: {
        agentName: this.name,
        confidence: 0.95,
        toolsUsed: ['agenda_builder', 'session_search']
      }
    };
  }
}