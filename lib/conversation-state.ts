/**
 * Conversation State Manager
 * Manages conversation context and history for chat sessions
 */

import { LRUCache } from 'lru-cache';

export interface ConversationContext {
  sessionId: string;
  userId?: string;
  ownerUserId?: string; // The actual owner of this session for validation
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: Date;
    metadata?: any;
  }>;
  state: {
    waitingForPreferences?: boolean;
    agendaBuilt?: boolean;
    lastToolUsed?: string;
    userPreferences?: {
      interests?: string[];
      role?: string;
      goals?: string[];
      days?: string[];
    };
    topics?: string[];
    entities?: {
      sessions?: string[];
      speakers?: string[];
      tracks?: string[];
    };
    // Registration flow state
    registrationInProgress?: boolean;
    registrationStep?: string;
    registrationData?: any;
    // Pending agenda to save after registration
    pendingAgenda?: any;
    agendaSaved?: boolean;
    // Research agent state
    researchAgentActive?: boolean;
    researchPhase?: string;
    // Orchestrator-local state (namespaced to avoid conflicts)
    orchestrator?: any;
  };
  createdAt: Date;
  lastActivity: Date;
}

// In-memory cache with 1 hour TTL and max 1000 conversations
const conversationCache = new LRUCache<string, ConversationContext>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
  updateAgeOnGet: true,
  updateAgeOnHas: true,
});

/**
 * Get or create a conversation context
 * SECURITY: Validates session ownership for authenticated users
 */
export function getConversation(sessionId: string, userId?: string): ConversationContext {
  let conversation = conversationCache.get(sessionId);

  if (!conversation) {
    conversation = {
      sessionId,
      userId,
      ownerUserId: userId, // Set owner on creation
      messages: [],
      state: {},
      createdAt: new Date(),
      lastActivity: new Date(),
    };
    conversationCache.set(sessionId, conversation);
  } else {
    // Security check: Verify session ownership for authenticated users
    if (userId && conversation.ownerUserId && conversation.ownerUserId !== userId) {
      console.warn(`[SECURITY] User ${userId} attempted to access session ${sessionId} owned by ${conversation.ownerUserId}`);
      // Create a new session for this user instead of allowing access
      const newSessionId = generateSessionId();
      conversation = {
        sessionId: newSessionId,
        userId,
        ownerUserId: userId,
        messages: [],
        state: {},
        createdAt: new Date(),
        lastActivity: new Date(),
      };
      conversationCache.set(newSessionId, conversation);
    } else {
      conversation.lastActivity = new Date();
      // Update userId if it was previously anonymous
      if (!conversation.ownerUserId && userId) {
        conversation.ownerUserId = userId;
        conversation.userId = userId;
      }
    }
  }

  return conversation;
}

/**
 * Add a message to the conversation
 */
export function addMessage(
  sessionId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata?: any
): void {
  const conversation = getConversation(sessionId);

  conversation.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata,
  });

  // Keep only last 20 messages to prevent context from growing too large
  if (conversation.messages.length > 20) {
    conversation.messages = conversation.messages.slice(-20);
  }

  conversation.lastActivity = new Date();
  conversationCache.set(sessionId, conversation);
}

/**
 * Update conversation state
 */
export function updateConversationState(
  sessionId: string,
  stateUpdate: Partial<ConversationContext['state']>
): void {
  const conversation = getConversation(sessionId);

  conversation.state = {
    ...conversation.state,
    ...stateUpdate,
  };

  conversation.lastActivity = new Date();
  conversationCache.set(sessionId, conversation);
}

/**
 * Get conversation history for context
 */
export function getConversationHistory(
  sessionId: string,
  maxMessages: number = 10
): Array<{ role: string; content: string }> {
  const conversation = conversationCache.get(sessionId);

  if (!conversation) {
    return [];
  }

  // Get the last N messages
  const messages = conversation.messages.slice(-maxMessages);

  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Clear conversation
 */
export function clearConversation(sessionId: string): void {
  conversationCache.delete(sessionId);
}

/**
 * Extract important context from conversation
 */
export function extractContext(sessionId: string): string {
  const conversation = conversationCache.get(sessionId);

  if (!conversation) {
    return '';
  }

  const contextParts: string[] = [];

  // Add state context
  if (conversation.state.waitingForPreferences) {
    contextParts.push('The user was asked to provide preferences for building an agenda.');
  }

  if (conversation.state.agendaBuilt) {
    contextParts.push('An agenda has already been built for this user in this conversation.');
  }

  if (conversation.state.userPreferences) {
    const prefs = conversation.state.userPreferences;
    if (prefs.interests?.length) {
      contextParts.push(`User interests: ${prefs.interests.join(', ')}`);
    }
    if (prefs.role) {
      contextParts.push(`User role: ${prefs.role}`);
    }
    if (prefs.days?.length) {
      contextParts.push(`Attending days: ${prefs.days.join(', ')}`);
    }
  }

  if (conversation.state.topics?.length) {
    contextParts.push(`Topics discussed: ${conversation.state.topics.join(', ')}`);
  }

  if (conversation.state.entities) {
    const { sessions, speakers, tracks } = conversation.state.entities;
    if (sessions?.length) {
      contextParts.push(`Sessions mentioned: ${sessions.slice(0, 3).join(', ')}`);
    }
    if (speakers?.length) {
      contextParts.push(`Speakers mentioned: ${speakers.slice(0, 3).join(', ')}`);
    }
    if (tracks?.length) {
      contextParts.push(`Tracks discussed: ${tracks.join(', ')}`);
    }
  }

  // Add recent conversation summary
  const recentMessages = conversation.messages.slice(-5);
  if (recentMessages.length > 0) {
    contextParts.push('\n## Recent Conversation History:');
    contextParts.push('IMPORTANT: The following shows what has already been discussed. DO NOT ask about these topics again:');
    recentMessages.forEach(msg => {
      if (msg.role === 'user') {
        contextParts.push(`User asked: "${msg.content.substring(0, 150)}"`);
      } else if (msg.role === 'assistant') {
        contextParts.push(`You responded about: "${msg.content.substring(0, 100)}..."`);
      }
    });
    contextParts.push('\n## Key Instructions:');
    contextParts.push('- Build on the conversation context above');
    contextParts.push('- Do NOT repeat questions that have been answered');
    contextParts.push('- Remember user preferences and interests already shared');
    contextParts.push('- Provide new, relevant information based on the conversation flow');
  }

  return contextParts.join('\n');
}

/**
 * Check if we should ask for preferences
 */
export function shouldAskForPreferences(sessionId: string): boolean {
  const conversation = conversationCache.get(sessionId);

  if (!conversation) {
    return false;
  }

  return conversation.state.waitingForPreferences === true &&
         !conversation.state.agendaBuilt;
}

/**
 * Generate a session ID for anonymous users
 */
export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Store pending agenda for registration
 */
export function storePendingAgenda(sessionId: string, agenda: any): void {
  const conversation = getConversation(sessionId);
  conversation.state.pendingAgenda = agenda;
  conversation.state.agendaBuilt = true;
  conversationCache.set(sessionId, conversation);
}

/**
 * Get pending agenda
 */
export function getPendingAgenda(sessionId: string): any | null {
  const conversation = conversationCache.get(sessionId);
  return conversation?.state.pendingAgenda || null;
}

/**
 * Mark agenda as saved
 */
export function markAgendaSaved(sessionId: string): void {
  const conversation = getConversation(sessionId);
  conversation.state.agendaSaved = true;
  conversation.state.registrationInProgress = false;
  conversationCache.set(sessionId, conversation);
}

/**
 * Update registration state
 */
export function updateRegistrationState(
  sessionId: string,
  step: string,
  data?: any
): void {
  const conversation = getConversation(sessionId);
  conversation.state.registrationInProgress = true;
  conversation.state.registrationStep = step;
  if (data) {
    conversation.state.registrationData = {
      ...conversation.state.registrationData,
      ...data
    };
  }
  conversationCache.set(sessionId, conversation);
}

/**
 * Check if registration is in progress
 */
export function isRegistrationInProgress(sessionId: string): boolean {
  const conversation = conversationCache.get(sessionId);
  return conversation?.state.registrationInProgress || false;
}

/**
 * Get registration state
 */
export function getRegistrationState(sessionId: string): {
  step?: string;
  data?: any;
} {
  const conversation = conversationCache.get(sessionId);
  return {
    step: conversation?.state.registrationStep,
    data: conversation?.state.registrationData
  };
}
