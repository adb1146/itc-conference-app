/**
 * Schedule Offer Detector
 * Intelligently detects when to softly offer personalized schedule building
 * based on conversation context
 */

export interface ScheduleOfferContext {
  shouldOffer: boolean;
  offerType: 'soft' | 'medium' | 'direct';
  reason: string;
  suggestedPrompt: string;
}

/**
 * Analyzes conversation to determine if we should offer schedule building
 */
export function detectScheduleOfferOpportunity(
  message: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  hasAgendaAlready: boolean = false
): ScheduleOfferContext {
  const lowerMessage = message.toLowerCase();

  // Don't offer if user already has an agenda
  if (hasAgendaAlready) {
    return {
      shouldOffer: false,
      offerType: 'soft',
      reason: 'User already has an agenda',
      suggestedPrompt: ''
    };
  }

  // Keywords that indicate interest in sessions/schedule
  const scheduleInterestKeywords = [
    'session', 'sessions', 'schedule', 'agenda', 'day 1', 'day 2', 'day 3',
    'tuesday', 'wednesday', 'thursday', 'morning', 'afternoon',
    'what should i attend', 'what to see', 'recommendations', 'suggest',
    'must see', 'don\'t miss', 'worth attending', 'interested in'
  ];

  // Topics that indicate specific interests
  const topicKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'underwriting',
    'claims', 'fraud', 'customer experience', 'cx', 'insurtech',
    'blockchain', 'iot', 'telematics', 'cyber', 'climate', 'parametric',
    'embedded', 'distribution', 'data', 'analytics', 'innovation'
  ];

  // Check if discussing sessions or topics
  const discussingSessions = scheduleInterestKeywords.some(keyword =>
    lowerMessage.includes(keyword)
  );

  const discussingTopics = topicKeywords.filter(keyword =>
    lowerMessage.includes(keyword)
  ).length > 0;

  // Check conversation history for context
  const recentMessages = conversationHistory.slice(-3);
  const hasBeenDiscussingConference = recentMessages.some(msg =>
    msg.content.toLowerCase().includes('session') ||
    msg.content.toLowerCase().includes('speaker') ||
    msg.content.toLowerCase().includes('itc vegas')
  );

  // Determine if and how to offer
  if (discussingSessions && discussingTopics) {
    // Strong signal - user is actively looking at sessions and has interests
    return {
      shouldOffer: true,
      offerType: 'medium',
      reason: 'User discussing specific sessions and topics',
      suggestedPrompt: generateMediumOffer(extractTopics(message))
    };
  } else if (discussingSessions) {
    // Medium signal - user asking about sessions generally
    return {
      shouldOffer: true,
      offerType: 'soft',
      reason: 'User asking about sessions',
      suggestedPrompt: generateSoftOffer()
    };
  } else if (discussingTopics && hasBeenDiscussingConference) {
    // Soft signal - user has interests and has been talking about conference
    return {
      shouldOffer: true,
      offerType: 'soft',
      reason: 'User has shown topic interests in conference context',
      suggestedPrompt: generateTopicBasedOffer(extractTopics(message))
    };
  } else if (message.includes('?') && discussingTopics) {
    // Very soft signal - user asking questions about topics
    return {
      shouldOffer: true,
      offerType: 'soft',
      reason: 'User asking questions about relevant topics',
      suggestedPrompt: generateVerySoftOffer()
    };
  }

  return {
    shouldOffer: false,
    offerType: 'soft',
    reason: 'No clear schedule building opportunity detected',
    suggestedPrompt: ''
  };
}

/**
 * Generates a soft, natural offer to build a schedule
 */
function generateSoftOffer(): string {
  const offers = [
    "\n\n💡 *By the way, if you'd like, I can create a personalized schedule based on what we've been discussing. Just let me know!*",
    "\n\n*PS: I can help you build a customized agenda with these sessions if you're interested - just say the word!*",
    "\n\n*Quick note: If you want me to organize these into a personalized Day 1 schedule, I'm happy to help!*"
  ];
  return offers[Math.floor(Math.random() * offers.length)];
}

/**
 * Generates a medium-strength offer when user shows clear interest
 */
function generateMediumOffer(topics: string[]): string {
  const topicString = topics.slice(0, 2).join(' and ');
  return `\n\n📅 **Would you like me to build you a personalized schedule?** I can create an optimized agenda focusing on ${topicString || 'your interests'}, making sure you don't miss the best sessions while leaving time for networking. Just say "yes" or "build my schedule"!`;
}

/**
 * Generates topic-based offer
 */
function generateTopicBasedOffer(topics: string[]): string {
  const topicString = topics.slice(0, 2).join(' and ');
  return `\n\n*Since you're interested in ${topicString}, I could build you a complete conference schedule around these topics - would that be helpful?*`;
}

/**
 * Generates very soft offer for subtle opportunities
 */
function generateVerySoftOffer(): string {
  return '\n\n*Let me know if you\'d like help organizing any of this into a personalized conference schedule.*';
}

/**
 * Extracts topics from message
 */
function extractTopics(message: string): string[] {
  const topics: string[] = [];
  const lowerMessage = message.toLowerCase();

  const topicMap: Record<string, string> = {
    'ai': 'AI',
    'artificial intelligence': 'AI',
    'machine learning': 'Machine Learning',
    'underwriting': 'Underwriting',
    'claims': 'Claims',
    'fraud': 'Fraud Detection',
    'customer experience': 'Customer Experience',
    'cx': 'Customer Experience',
    'blockchain': 'Blockchain',
    'iot': 'IoT',
    'cyber': 'Cyber Security',
    'climate': 'Climate Risk',
    'parametric': 'Parametric Insurance',
    'data': 'Data & Analytics',
    'analytics': 'Analytics'
  };

  Object.entries(topicMap).forEach(([keyword, topic]) => {
    if (lowerMessage.includes(keyword) && !topics.includes(topic)) {
      topics.push(topic);
    }
  });

  return topics;
}

/**
 * Generates contextual schedule offer for chat responses
 */
export function generateContextualScheduleOffer(
  responseContent: string,
  userMessage: string,
  hasAgenda: boolean = false
): string {
  // Don't offer if user already has agenda
  if (hasAgenda) return '';

  const lowerResponse = responseContent.toLowerCase();
  const lowerMessage = userMessage.toLowerCase();

  // Check if response mentions multiple sessions
  const sessionCount = (responseContent.match(/\[.*?\]\(\/agenda\/session\//g) || []).length;

  if (sessionCount >= 3) {
    // Multiple sessions mentioned - good opportunity
    return '\n\n---\n\n📅 **Want me to organize these into your personal schedule?** I can create an optimized agenda with all these sessions, check for conflicts, and add networking breaks. Just say "build my schedule"!';
  } else if (sessionCount > 0 && lowerMessage.includes('interest')) {
    // User expressed interest and we showed sessions
    return '\n\n💡 *I can help you build a complete conference agenda around these topics if you\'d like - just let me know!*';
  } else if (lowerResponse.includes('track') || lowerResponse.includes('sessions')) {
    // Discussing tracks or sessions generally
    return '\n\n*PS: If you want a personalized schedule for any of the conference days, I\'m here to help!*';
  }

  return '';
}

/**
 * Checks if user response is accepting schedule offer
 */
export function isAcceptingScheduleOffer(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  const acceptancePatterns = [
    'yes', 'yeah', 'sure', 'ok', 'okay', 'please',
    'build my schedule', 'create my agenda', 'make my schedule',
    'personalize', 'customize', 'help me plan',
    'sounds good', 'let\'s do it', 'go ahead',
    'i\'d like that', 'that would be great', 'perfect'
  ];

  return acceptancePatterns.some(pattern => lowerMessage.includes(pattern));
}

/**
 * Generates follow-up prompt after user accepts offer
 */
export function generateScheduleBuilderPrompt(): string {
  return `Great! I'll help you create a personalized schedule. To build the perfect agenda for you, could you tell me:

**1. What topics interest you most?** (e.g., AI, underwriting, claims, cyber, etc.)

**2. What's your role?** (e.g., carrier executive, insurtech founder, investor, broker)

**3. Any specific goals for the conference?** (e.g., learn about new tech, find partners, network)

Or just tell me your interests in your own words, like "I'm a carrier CTO interested in AI and claims automation"!`;
}

/**
 * Determines if we should use the research agent for deeper personalization
 */
export function shouldUseResearchAgent(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Indicators that suggest using research agent
  const researchIndicators = [
    'research my background',
    'look me up',
    'find out about me',
    'learn about my',
    'search for my',
    'personalize based on my company',
    'tailor to my role'
  ];

  return researchIndicators.some(indicator => lowerMessage.includes(indicator));
}

/**
 * Generates an enhanced offer that mentions the research capability
 */
export function generateEnhancedScheduleOffer(): string {
  return `\n\n📅 **Would you like me to build you a personalized schedule?**

I can:
- Create an optimized agenda based on your interests
- Research your professional background for deeper personalization
- Ensure you don't miss key sessions while leaving time for networking

Just say "yes" or "build my schedule" to get started!`;
}