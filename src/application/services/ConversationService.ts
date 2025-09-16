/**
 * Conversation Service
 * Manages conversation state and history
 */

import { Message } from '../services/ChatService';

export interface IConversation {
  sessionId: string;
  messages: Message[];
  state: any;
  createdAt: Date;
  updatedAt: Date;
}

export interface IConversationService {
  getConversation(sessionId: string): Promise<IConversation>;
  addMessage(sessionId: string, message: Message): Promise<void>;
  updateState(sessionId: string, state: any): Promise<void>;
}

export class ConversationService implements IConversationService {
  // In-memory storage for now, would use database in production
  private conversations: Map<string, IConversation> = new Map();

  async getConversation(sessionId: string): Promise<IConversation> {
    let conversation = this.conversations.get(sessionId);
    
    if (!conversation) {
      conversation = {
        sessionId,
        messages: [],
        state: {},
        createdAt: new Date(),
        updatedAt: new Date()
      };
      this.conversations.set(sessionId, conversation);
    }
    
    return conversation;
  }

  async addMessage(sessionId: string, message: Message): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    conversation.messages.push(message);
    conversation.updatedAt = new Date();
    
    // Keep only last 20 messages to prevent memory bloat
    if (conversation.messages.length > 20) {
      conversation.messages = conversation.messages.slice(-20);
    }
  }

  async updateState(sessionId: string, state: any): Promise<void> {
    const conversation = await this.getConversation(sessionId);
    conversation.state = { ...conversation.state, ...state };
    conversation.updatedAt = new Date();
  }

  /**
   * Clean up old conversations (would run periodically)
   */
  async cleanup(): Promise<void> {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    
    for (const [sessionId, conversation] of this.conversations.entries()) {
      if (conversation.updatedAt < oneHourAgo) {
        this.conversations.delete(sessionId);
      }
    }
  }

  /**
   * Get statistics about conversations
   */
  getStats(): { total: number; active: number } {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    let active = 0;
    
    for (const conversation of this.conversations.values()) {
      if (conversation.updatedAt > fiveMinutesAgo) {
        active++;
      }
    }
    
    return {
      total: this.conversations.size,
      active
    };
  }
}