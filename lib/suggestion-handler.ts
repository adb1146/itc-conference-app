/**
 * Enhanced Suggestion Handler
 * Implements Anthropic's best practices for context-aware suggestions
 */

import { ConversationMessage } from './chat/types';

export interface SuggestionContext {
  currentMessage: string;
  conversationHistory: ConversationMessage[];
  userProfile?: {
    name?: string;
    interests?: string[];
    role?: string;
    company?: string;
  };
  lastTopic?: string;
  sessionContext?: any[];
}

export interface GeneratedSuggestion {
  question: string;
  category: 'follow-up' | 'explore' | 'action' | 'clarification';
  relevanceScore: number;
}

/**
 * Analyzes conversation to determine the current context and topic
 */
export function analyzeConversationContext(
  history: ConversationMessage[]
): { topic: string; entities: string[]; intent: string } {
  if (!history || history.length === 0) {
    return { topic: 'general', entities: [], intent: 'explore' };
  }

  // Get last few messages to understand context
  const recentMessages = history.slice(-4);
  const lastAssistantMessage = recentMessages
    .filter(m => m.role === 'assistant')
    .pop();

  // Extract key topics and entities from recent conversation
  const topics: string[] = [];
  const entities: string[] = [];

  // Extract sessions mentioned
  const sessionPattern = /session\s+(?:titled\s+)?["']([^"']+)["']/gi;
  const dayPattern = /day\s+(\d)/gi;
  const speakerPattern = /speaker[s]?\s+(?:named\s+)?([A-Z][a-z]+\s+[A-Z][a-z]+)/g;

  recentMessages.forEach(msg => {
    const content = msg.content.toLowerCase();

    // Track topics discussed
    if (content.includes('happy hour')) topics.push('happy_hour');
    if (content.includes('networking')) topics.push('networking');
    if (content.includes('ai') || content.includes('artificial intelligence')) topics.push('ai');
    if (content.includes('agenda') || content.includes('schedule')) topics.push('agenda');
    if (content.includes('speaker')) topics.push('speakers');
    if (content.includes('cybersecurity') || content.includes('security')) topics.push('security');

    // Extract entities
    let match;
    while ((match = sessionPattern.exec(msg.content)) !== null) {
      entities.push(match[1]);
    }
    while ((match = dayPattern.exec(msg.content)) !== null) {
      entities.push(`Day ${match[1]}`);
    }
    while ((match = speakerPattern.exec(msg.content)) !== null) {
      entities.push(match[1]);
    }
  });

  // Determine primary topic
  const topic = topics.length > 0 ? topics[topics.length - 1] : 'general';

  // Determine intent based on recent interaction
  const lastUserMessage = recentMessages
    .filter(m => m.role === 'user')
    .pop();

  let intent = 'explore';
  if (lastUserMessage) {
    const userContent = lastUserMessage.content.toLowerCase();
    if (userContent.includes('how') || userContent.includes('what') || userContent.includes('when')) {
      intent = 'information';
    } else if (userContent.includes('should') || userContent.includes('recommend')) {
      intent = 'recommendation';
    } else if (userContent.includes('ok') || userContent.includes('yes') || userContent.includes('that')) {
      intent = 'follow-up';
    }
  }

  return { topic, entities: [...new Set(entities)], intent };
}

/**
 * Generates contextual suggestions based on Anthropic's best practices
 */
export function generateContextualSuggestions(
  context: SuggestionContext
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];
  const { topic, entities, intent } = analyzeConversationContext(context.conversationHistory);

  // 1. Follow-up suggestions based on last response
  if (intent === 'follow-up' || context.conversationHistory.length > 0) {
    const lastMessage = context.conversationHistory[context.conversationHistory.length - 1];

    if (lastMessage?.role === 'assistant') {
      // Analyze what was discussed and suggest logical follow-ups
      const content = lastMessage.content.toLowerCase();

      if (content.includes('session') && entities.length > 0) {
        suggestions.push({
          question: `Tell me more about the speakers in that session`,
          category: 'follow-up',
          relevanceScore: 0.95
        });
        suggestions.push({
          question: `What other sessions are similar to this one?`,
          category: 'explore',
          relevanceScore: 0.9
        });
      }

      if (content.includes('day 1') || content.includes('day 2') || content.includes('day 3')) {
        suggestions.push({
          question: `What are the must-attend sessions on that day?`,
          category: 'follow-up',
          relevanceScore: 0.92
        });
        suggestions.push({
          question: `Show me the networking events for that day`,
          category: 'explore',
          relevanceScore: 0.88
        });
      }

      if (content.includes('happy hour') || content.includes('networking')) {
        suggestions.push({
          question: `How do I register for that event?`,
          category: 'action',
          relevanceScore: 0.9
        });
        suggestions.push({
          question: `What's the dress code for evening events?`,
          category: 'clarification',
          relevanceScore: 0.85
        });
      }
    }
  }

  // 2. Topic-specific exploration suggestions
  if (topic !== 'general') {
    const topicSuggestions = getTopicSpecificSuggestions(topic, context.userProfile);
    suggestions.push(...topicSuggestions);
  }

  // 3. User profile-based personalized suggestions
  if (context.userProfile?.interests && context.userProfile.interests.length > 0) {
    const interests = context.userProfile.interests;

    interests.forEach(interest => {
      if (!suggestions.some(s => s.question.toLowerCase().includes(interest.toLowerCase()))) {
        suggestions.push({
          question: `What are the best ${interest} sessions I should attend?`,
          category: 'explore',
          relevanceScore: 0.85
        });
      }
    });
  }

  // 4. Action-oriented suggestions based on conversation stage
  if (context.conversationHistory.length > 2) {
    // User has been engaged, suggest concrete actions
    if (!suggestions.some(s => s.category === 'action')) {
      suggestions.push({
        question: `Build me a personalized agenda based on our conversation`,
        category: 'action',
        relevanceScore: 0.88
      });
      suggestions.push({
        question: `Export my favorite sessions to my calendar`,
        category: 'action',
        relevanceScore: 0.82
      });
    }
  }

  // 5. Clarification suggestions if the conversation seems stuck
  const lastUserMessages = context.conversationHistory
    .filter(m => m.role === 'user')
    .slice(-2)
    .map(m => m.content.length);

  if (lastUserMessages.every(len => len < 20)) {
    // Short responses might indicate user needs more guidance
    suggestions.push({
      question: `Would you like me to recommend sessions based on your role?`,
      category: 'clarification',
      relevanceScore: 0.75
    });
    suggestions.push({
      question: `What topics are you most interested in learning about?`,
      category: 'clarification',
      relevanceScore: 0.73
    });
  }

  // Sort by relevance and limit to top suggestions
  return suggestions
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);
}

/**
 * Gets topic-specific suggestions
 */
function getTopicSpecificSuggestions(
  topic: string,
  userProfile?: any
): GeneratedSuggestion[] {
  const suggestions: GeneratedSuggestion[] = [];

  switch (topic) {
    case 'ai':
      suggestions.push({
        question: `Which AI sessions focus on practical implementation?`,
        category: 'explore',
        relevanceScore: 0.87
      });
      suggestions.push({
        question: `Who are the leading AI speakers at the conference?`,
        category: 'explore',
        relevanceScore: 0.84
      });
      break;

    case 'networking':
      suggestions.push({
        question: `What's the best networking event for ${userProfile?.role || 'my role'}?`,
        category: 'explore',
        relevanceScore: 0.89
      });
      suggestions.push({
        question: `Are there industry-specific meetups I should know about?`,
        category: 'explore',
        relevanceScore: 0.86
      });
      break;

    case 'agenda':
      suggestions.push({
        question: `How can I avoid scheduling conflicts in my agenda?`,
        category: 'action',
        relevanceScore: 0.91
      });
      suggestions.push({
        question: `Can you optimize my schedule for maximum learning?`,
        category: 'action',
        relevanceScore: 0.88
      });
      break;

    case 'security':
      suggestions.push({
        question: `What are the key cybersecurity trends being discussed?`,
        category: 'explore',
        relevanceScore: 0.86
      });
      suggestions.push({
        question: `Which sessions cover cyber insurance best practices?`,
        category: 'explore',
        relevanceScore: 0.84
      });
      break;

    case 'speakers':
      suggestions.push({
        question: `Who are the keynote speakers and what will they discuss?`,
        category: 'explore',
        relevanceScore: 0.88
      });
      suggestions.push({
        question: `Which speakers are from leading insurtech companies?`,
        category: 'explore',
        relevanceScore: 0.85
      });
      break;

    default:
      suggestions.push({
        question: `What are the conference highlights I shouldn't miss?`,
        category: 'explore',
        relevanceScore: 0.8
      });
  }

  return suggestions;
}

/**
 * Formats suggestions for display with enhanced context
 */
export function formatSuggestionsForResponse(
  suggestions: GeneratedSuggestion[],
  context: SuggestionContext
): string {
  if (suggestions.length === 0) {
    return '';
  }

  // Group suggestions by category
  const followUps = suggestions.filter(s => s.category === 'follow-up');
  const explorations = suggestions.filter(s => s.category === 'explore');
  const actions = suggestions.filter(s => s.category === 'action');
  const clarifications = suggestions.filter(s => s.category === 'clarification');

  let formatted = '\n\n';

  // Add contextual introduction based on conversation stage
  if (context.conversationHistory.length === 0) {
    formatted += '**How can I help you plan your conference experience?**\n\n';
  } else if (followUps.length > 0) {
    formatted += '**Based on what we discussed:**\n\n';
  } else {
    formatted += '**You might also want to know:**\n\n';
  }

  // Format follow-ups first (most relevant)
  if (followUps.length > 0) {
    followUps.forEach(s => {
      formatted += `• ${s.question}\n`;
    });
    if (explorations.length > 0 || actions.length > 0) {
      formatted += '\n';
    }
  }

  // Add explorations
  if (explorations.length > 0) {
    if (followUps.length > 0) {
      formatted += '**Explore related topics:**\n';
    }
    explorations.forEach(s => {
      formatted += `• ${s.question}\n`;
    });
    if (actions.length > 0) {
      formatted += '\n';
    }
  }

  // Add actions
  if (actions.length > 0) {
    formatted += '**Ready to take action?**\n';
    actions.forEach(s => {
      formatted += `• ${s.question}\n`;
    });
  }

  // Add clarifications if needed
  if (clarifications.length > 0 && followUps.length === 0) {
    formatted += '\n**Tell me more about your interests:**\n';
    clarifications.forEach(s => {
      formatted += `• ${s.question}\n`;
    });
  }

  return formatted;
}

/**
 * Interface for conversation messages
 */
interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}