/**
 * Shared types for chat functionality
 */

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

export interface UserProfile {
  name?: string;
  email?: string;
  interests?: string[];
  role?: string;
  company?: string;
  goals?: string[];
}

export interface ChatContext {
  sessionId?: string;
  conversationHistory: ConversationMessage[];
  userProfile?: UserProfile;
  lastTopic?: string;
}