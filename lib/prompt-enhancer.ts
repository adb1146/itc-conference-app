/**
 * Prompt Enhancement Utility
 * Enhances clickable suggestions with context and routes agenda requests to Smart Agenda
 * Following Anthropic's best practices for XML-structured prompting
 */

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface UserProfile {
  email?: string;
  name?: string;
  role?: string;
  company?: string;
  interests?: string[];
  organizationType?: string;
}

export interface ConversationContext {
  messages: Message[];
  sessionId: string;
  lastAssistantMessage?: Message;
  agendaBuilt?: boolean;
  userPreferences?: any;
}

export interface EnhancementResult {
  type: 'enhanced_prompt' | 'agenda_redirect' | 'simple';
  prompt?: string;
  displayPrompt?: string;
  shouldRedirect?: boolean;
  redirectPath?: string;
  metadata?: any;
}

// Agenda-related phrases that should trigger Smart Agenda routing
const AGENDA_PHRASES = [
  'organize these into your personal schedule',
  'organize these into my personal schedule',
  'want me to organize these',
  'build my schedule',
  'build my agenda',
  'create my agenda',
  'create my schedule',
  'create a personalized agenda',
  'build me a personalized agenda',
  'organize my conference schedule'
];

// Suggestions that need context enhancement
const CONTEXT_NEEDED_PATTERNS = [
  /I'm an? .+, what sessions should I attend/i,
  /Find similar .+ events/i,
  /What other sessions .+ same time/i,
  /Best .+ events for .+/i,
  /sessions for days? (two|three|2|3)/i,
  /suggest additional days/i,
  /provide more details about/i,
  /tell me more about/i,
  /what sessions should I attend/i
];

/**
 * Main enhancement function
 */
export function enhancePromptWithContext(
  suggestion: string,
  messages: Message[],
  userProfile: UserProfile | null,
  conversationContext: ConversationContext
): EnhancementResult {

  // CRITICAL: Check for agenda-building intent FIRST
  if (isAgendaBuildingRequest(suggestion, conversationContext)) {
    return handleAgendaRequest(suggestion, userProfile);
  }

  // Check if this suggestion needs context enhancement
  if (!shouldEnhanceSuggestion(suggestion)) {
    return {
      type: 'simple',
      prompt: suggestion,
      displayPrompt: suggestion
    };
  }

  // Extract context from conversation
  const context = extractConversationContext(messages, userProfile);

  // Build enhanced prompt using Anthropic's XML structure
  const enhancedPrompt = buildXMLStructuredPrompt(suggestion, context);

  return {
    type: 'enhanced_prompt',
    prompt: enhancedPrompt,
    displayPrompt: suggestion // Show original to user for transparency
  };
}

/**
 * Detect if this is an agenda-building request
 */
function isAgendaBuildingRequest(suggestion: string, context: ConversationContext): boolean {
  const lowerSuggestion = suggestion.toLowerCase();

  // Check for direct agenda phrases
  if (AGENDA_PHRASES.some(phrase => lowerSuggestion.includes(phrase))) {
    return true;
  }

  // Check if this is a response to an agenda offer
  const lastAssistantMsg = context.lastAssistantMessage;
  if (lastAssistantMsg) {
    const lastContent = lastAssistantMsg.content.toLowerCase();

    // Check if assistant offered to organize schedule
    if (lastContent.includes('want me to organize these') ||
        lastContent.includes('organize these into your personal schedule') ||
        lastContent.includes('build my schedule')) {

      // Check if user is responding affirmatively
      const affirmativeResponses = ['yes', 'sure', 'okay', 'ok', 'please', 'do it', 'go ahead', 'build', 'create'];
      if (affirmativeResponses.some(word => lowerSuggestion.includes(word))) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Handle agenda building requests
 */
function handleAgendaRequest(suggestion: string, userProfile: UserProfile | null): EnhancementResult {
  // Check if user is authenticated
  if (!userProfile?.email) {
    // Guest user - redirect to Smart Agenda with guest flow message
    return {
      type: 'agenda_redirect',
      shouldRedirect: true,
      redirectPath: '/agenda/intelligent',
      prompt: `I'll help you create a personalized agenda! Let me redirect you to our Smart Agenda builder where I can create an AI-powered schedule based on your interests. You can sign up during or after the process to save your agenda.`,
      displayPrompt: 'Taking you to Smart Agenda builder...',
      metadata: {
        guestFlow: true,
        originalRequest: suggestion
      }
    };
  }

  // Authenticated user - redirect to Smart Agenda with personalized message
  const interests = userProfile.interests?.length > 0
    ? userProfile.interests.join(', ')
    : 'your conference goals';

  return {
    type: 'agenda_redirect',
    shouldRedirect: true,
    redirectPath: '/agenda/intelligent',
    prompt: `Perfect! Let me take you to the Smart Agenda builder where I'll create your personalized conference schedule using AI. I'll optimize it based on your interests in ${interests} and ensure you don't miss any key sessions.`,
    displayPrompt: 'Taking you to Smart Agenda builder...',
    metadata: {
      userId: userProfile.email,
      interests: userProfile.interests,
      role: userProfile.role,
      originalRequest: suggestion
    }
  };
}

/**
 * Check if suggestion needs enhancement
 */
function shouldEnhanceSuggestion(suggestion: string): boolean {
  return CONTEXT_NEEDED_PATTERNS.some(pattern => pattern.test(suggestion));
}

/**
 * Extract relevant context from conversation
 */
interface ExtractedContext {
  mentionedSessions: string[];
  mentionedSpeakers: string[];
  discussedTopics: string[];
  userInterests: string[];
  userRole?: string;
  dayContext?: string;
  events: string[];
}

function extractConversationContext(messages: Message[], userProfile: UserProfile | null): ExtractedContext {
  const context: ExtractedContext = {
    mentionedSessions: [],
    mentionedSpeakers: [],
    discussedTopics: [],
    userInterests: userProfile?.interests || [],
    userRole: userProfile?.role,
    dayContext: undefined,
    events: []
  };

  // Extract from recent messages (last 5)
  const recentMessages = messages.slice(-5);

  recentMessages.forEach(msg => {
    const content = msg.content;

    // Extract session titles (usually in quotes or after certain keywords)
    const sessionMatches = content.match(/"([^"]+)"|'([^']+)'|(?:session:|titled|called)\s+([^,\.\n]+)/gi);
    if (sessionMatches) {
      sessionMatches.forEach(match => {
        const cleaned = match.replace(/["']|^(session:|titled|called)\s*/gi, '').trim();
        if (cleaned.length > 10 && cleaned.length < 150) {
          context.mentionedSessions.push(cleaned);
        }
      });
    }

    // Extract speaker names
    const speakerPattern = /(?:by|with|featuring|speaker:?)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g;
    let speakerMatch;
    while ((speakerMatch = speakerPattern.exec(content)) !== null) {
      context.mentionedSpeakers.push(speakerMatch[1]);
    }

    // Extract events (Reception, Awards, etc.)
    const eventPattern = /(?:Opening Reception|Innovation Awards|Closing Party|Happy Hour|Breakfast|Lunch|Networking)(?:\s+(?:at|in)\s+[^,\.\n]+)?/gi;
    let eventMatch;
    while ((eventMatch = eventPattern.exec(content)) !== null) {
      context.events.push(eventMatch[0]);
    }

    // Extract topics
    const topics = ['AI', 'automation', 'cybersecurity', 'claims', 'underwriting', 'data', 'analytics', 'blockchain', 'insurtech'];
    topics.forEach(topic => {
      if (content.toLowerCase().includes(topic.toLowerCase())) {
        context.discussedTopics.push(topic);
      }
    });

    // Extract day context
    const dayPattern = /day\s+(one|two|three|1|2|3)/i;
    const dayMatch = content.match(dayPattern);
    if (dayMatch) {
      context.dayContext = dayMatch[0];
    }
  });

  // Remove duplicates
  context.mentionedSessions = [...new Set(context.mentionedSessions)];
  context.mentionedSpeakers = [...new Set(context.mentionedSpeakers)];
  context.discussedTopics = [...new Set(context.discussedTopics)];
  context.events = [...new Set(context.events)];

  return context;
}

/**
 * Build XML-structured prompt following Anthropic best practices
 */
function buildXMLStructuredPrompt(suggestion: string, context: ExtractedContext): string {
  const lowerSuggestion = suggestion.toLowerCase();

  // Handle different types of suggestions
  if (lowerSuggestion.includes('additional days') || lowerSuggestion.includes('days two') || lowerSuggestion.includes('days three')) {
    return buildDaysSuggestionPrompt(suggestion, context);
  }

  if (lowerSuggestion.includes('more details') || lowerSuggestion.includes('tell me more')) {
    return buildDetailsPrompt(suggestion, context);
  }

  if (lowerSuggestion.includes("i'm a") || lowerSuggestion.includes("i am a")) {
    return buildRoleBasedPrompt(suggestion, context);
  }

  if (lowerSuggestion.includes('similar') || lowerSuggestion.includes('other')) {
    return buildSimilarEventsPrompt(suggestion, context);
  }

  // Default enhancement
  return buildDefaultEnhancedPrompt(suggestion, context);
}

/**
 * Build prompt for additional days suggestions
 */
function buildDaysSuggestionPrompt(suggestion: string, context: ExtractedContext): string {
  return `<conversation_context>
  <user_profile>
    ${context.userInterests.length > 0 ? `<interests>${context.userInterests.join(', ')}</interests>` : ''}
    ${context.userRole ? `<role>${context.userRole}</role>` : ''}
  </user_profile>

  ${context.mentionedSessions.length > 0 ? `
  <sessions_already_discussed>
    ${context.mentionedSessions.map(s => `- ${s}`).join('\n    ')}
  </sessions_already_discussed>` : ''}

  ${context.events.length > 0 ? `
  <events_mentioned>
    ${context.events.map(e => `- ${e}`).join('\n    ')}
  </events_mentioned>` : ''}
</conversation_context>

<user_request>
Based on my interests${context.userInterests.length > 0 ? ` in ${context.userInterests.join(', ')}` : ''}, suggest sessions for additional conference days that would complement what we've already discussed. Focus on maximizing learning and networking opportunities.
</user_request>

<instructions>
1. Prioritize sessions that align with the user's interests
2. Avoid scheduling conflicts with mentioned sessions
3. Include a mix of technical sessions and networking opportunities
4. Provide specific session titles, times, and speakers
</instructions>`;
}

/**
 * Build prompt for session details
 */
function buildDetailsPrompt(suggestion: string, context: ExtractedContext): string {
  if (context.mentionedSessions.length === 0) {
    return suggestion; // No sessions to reference
  }

  return `<previous_discussion>
  <mentioned_sessions>
    ${context.mentionedSessions.map(s => `<session>${s}</session>`).join('\n    ')}
  </mentioned_sessions>

  ${context.mentionedSpeakers.length > 0 ? `
  <mentioned_speakers>
    ${context.mentionedSpeakers.map(s => `<speaker>${s}</speaker>`).join('\n    ')}
  </mentioned_speakers>` : ''}
</previous_discussion>

<task>
The user wants more details about sessions mentioned above.
First, identify which specific session they're asking about.
Then provide comprehensive information including:
- Full session description
- Speaker backgrounds
- Key takeaways
- Time and location
- Related sessions they might enjoy
</task>`;
}

/**
 * Build role-based prompt
 */
function buildRoleBasedPrompt(suggestion: string, context: ExtractedContext): string {
  // Extract role from suggestion
  const roleMatch = suggestion.match(/I'?m an?\s+([^,]+),/i);
  const role = roleMatch ? roleMatch[1] : context.userRole || 'professional';

  return `<conversation_context>
  <user_profile>
    <role>${role}</role>
    ${context.userInterests.length > 0 ? `<interests>${context.userInterests.join(', ')}</interests>` : ''}
  </user_profile>

  ${context.mentionedSessions.length > 0 || context.events.length > 0 ? `
  <already_interested_in>
    ${context.mentionedSessions.map(s => `- ${s}`).join('\n    ')}
    ${context.events.map(e => `- ${e}`).join('\n    ')}
  </already_interested_in>` : ''}
</conversation_context>

<request>
As a ${role}${context.userInterests.length > 0 ? ` interested in ${context.userInterests.join(', ')}` : ''}, recommend sessions that:
1. Are most relevant to my role and responsibilities
2. Complement the sessions and events already discussed
3. Provide practical insights I can implement
4. Offer networking opportunities with peers in similar roles
</request>`;
}

/**
 * Build prompt for similar events
 */
function buildSimilarEventsPrompt(suggestion: string, context: ExtractedContext): string {
  return `<context>
  ${context.events.length > 0 ? `
  <events_already_discussed>
    ${context.events.map(e => `- ${e}`).join('\n    ')}
  </events_already_discussed>` : ''}

  ${context.discussedTopics.length > 0 ? `
  <topics_of_interest>
    ${context.discussedTopics.join(', ')}
  </topics_of_interest>` : ''}
</context>

<task>
Find other breakfast sessions, networking events, or social gatherings similar to what's been discussed. Focus on:
1. Events with similar networking value
2. Opportunities to meet industry leaders
3. Sessions that combine learning with networking
4. Events at convenient times that don't conflict
</task>`;
}

/**
 * Default enhancement for other patterns
 */
function buildDefaultEnhancedPrompt(suggestion: string, context: ExtractedContext): string {
  return `<conversation_context>
  ${context.userInterests.length > 0 || context.userRole ? `
  <user_profile>
    ${context.userRole ? `<role>${context.userRole}</role>` : ''}
    ${context.userInterests.length > 0 ? `<interests>${context.userInterests.join(', ')}</interests>` : ''}
  </user_profile>` : ''}

  ${context.mentionedSessions.length > 0 || context.mentionedSpeakers.length > 0 || context.events.length > 0 ? `
  <previous_discussion>
    ${context.mentionedSessions.length > 0 ? `Sessions: ${context.mentionedSessions.join(', ')}` : ''}
    ${context.mentionedSpeakers.length > 0 ? `Speakers: ${context.mentionedSpeakers.join(', ')}` : ''}
    ${context.events.length > 0 ? `Events: ${context.events.join(', ')}` : ''}
  </previous_discussion>` : ''}
</conversation_context>

<user_request>
${suggestion}
</user_request>

<instructions>
Consider the conversation context and provide a response that:
1. Builds on what has already been discussed
2. Aligns with the user's interests and role
3. Provides specific, actionable recommendations
</instructions>`;
}