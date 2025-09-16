/**
 * Response Generator Service
 * Generates intelligent responses using AI
 */

import { Anthropic } from '@anthropic-ai/sdk';
import { IResponseGenerator, ResponseContext } from '@/application/services/ChatService';
import { Session } from '@/domain/interfaces/IRepository';

export class ResponseGenerator implements IResponseGenerator {
  private anthropic: Anthropic;

  constructor() {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });
  }

  async generate(context: ResponseContext): Promise<string> {
    const systemPrompt = this.buildSystemPrompt(context);
    const userMessage = this.buildUserMessage(context);

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: systemPrompt,
        messages: [
          ...this.formatConversationHistory(context),
          { role: 'user', content: userMessage }
        ]
      });

      return response.content[0].type === 'text' 
        ? response.content[0].text 
        : 'I apologize, but I encountered an issue generating a response.';
        
    } catch (error) {
      console.error('[ResponseGenerator] Failed to generate response:', error);
      return this.generateFallbackResponse(context);
    }
  }

  generateStream(context: ResponseContext): ReadableStream {
    const encoder = new TextEncoder();

    return new ReadableStream({
      start: async (controller) => {
        try {
          const systemPrompt = this.buildSystemPrompt(context);
          const userMessage = this.buildUserMessage(context);

          const stream = await this.anthropic.messages.create({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            stream: true,
            system: systemPrompt,
            messages: [
              ...this.formatConversationHistory(context),
              { role: 'user', content: userMessage }
            ]
          });

          for await (const chunk of stream) {
            if (chunk.type === 'content_block_delta') {
              const text = chunk.delta.text || '';
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();

        } catch (error) {
          console.error('[ResponseGenerator] Stream failed:', error);
          const fallback = this.generateFallbackResponse(context);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallback })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      }
    });
  }

  private buildSystemPrompt(context: ResponseContext): string {
    const basePrompt = `You are an AI assistant for the InsureTech Connect (ITC) conference in Las Vegas.
    Your role is to help attendees find relevant sessions, build personalized agendas, and answer questions about the conference.`;

    const intentPrompts: Record<string, string> = {
      information_seeking: `\n\nThe user is seeking information. Provide accurate, detailed answers based on the conference sessions and content available.`,
      agenda_building: `\n\nThe user wants help building their conference agenda. Create a personalized schedule based on their interests and the available sessions.`,
      local_recommendations: `\n\nThe user is looking for local recommendations in Las Vegas. Suggest restaurants, venues, and activities near the conference.`,
      profile_research: `\n\nThe user is researching speakers or companies. Provide relevant information about the speakers and their sessions.`
    };

    const intentPrompt = intentPrompts[context.intent.type] || '';
    
    return `${basePrompt}${intentPrompt}\n\nAvailable context about sessions:\n${this.formatSessions(context.sessions)}`;
  }

  private buildUserMessage(context: ResponseContext): string {
    return context.query;
  }

  private formatSessions(sessions: Session[]): string {
    if (!sessions || sessions.length === 0) {
      return 'No specific sessions found for this query.';
    }

    return sessions.slice(0, 10).map(session => 
      `- ${session.title} (${session.track || 'General'})\n  ${session.description}\n  Speakers: ${session.speakers?.map(s => s.name).join(', ') || 'TBA'}`
    ).join('\n\n');
  }

  private formatConversationHistory(context: ResponseContext): Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!context.conversationHistory || context.conversationHistory.length === 0) {
      return [];
    }

    // Take last 5 messages for context
    return context.conversationHistory
      .slice(-5)
      .map(msg => ({
        role: msg.role,
        content: msg.content
      }));
  }

  private generateFallbackResponse(context: ResponseContext): string {
    const responses: Record<string, string> = {
      information_seeking: `I found ${context.sessions.length} sessions related to your query. Here are some highlights:\n\n${this.formatSessionsSimple(context.sessions)}`,
      agenda_building: `Based on your interests, I've identified ${context.sessions.length} relevant sessions. Would you like me to help you create a personalized schedule?`,
      local_recommendations: 'For dining and entertainment in Las Vegas, I recommend checking out the restaurants at the Wynn, Aria, or Cosmopolitan hotels, all within walking distance of the conference venue.',
      general_chat: 'I\'m here to help you make the most of the ITC conference. You can ask me about sessions, speakers, or get help building your agenda.'
    };

    return responses[context.intent.type] || responses.general_chat;
  }

  private formatSessionsSimple(sessions: Session[]): string {
    return sessions.slice(0, 5).map(s => 
      `• ${s.title}`
    ).join('\n');
  }
}