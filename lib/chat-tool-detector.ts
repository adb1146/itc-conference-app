/**
 * Chat Tool Detector
 * Analyzes chat messages to determine if they should trigger specific tools/agents
 */

export type ToolType = 'agenda_builder' | 'session_search' | 'speaker_lookup' | 'general_chat' | 'preference_response' | 'local_recommendations' | 'profile_research';

export interface ToolDetectionResult {
  shouldUseTool: boolean;
  toolType: ToolType;
  confidence: number;
  extractedParams?: Record<string, any>;
  reason: string;
}

// Keywords and phrases that indicate EXPLICIT agenda building intent
// These should only trigger when user explicitly asks for agenda creation
const AGENDA_KEYWORDS = [
  'build my agenda',
  'build me an agenda',
  'create my schedule',
  'build me a schedule',
  'personalized agenda',
  'create an itinerary',
  'build a personalized agenda',
  'generate my agenda',
  'make me a schedule',
  'can you build me an agenda',
  'i want an agenda',
  'i need an agenda',
  'create a personalized schedule',
  'build my itinerary'
];

// Only match EXPLICIT requests for agenda building
const AGENDA_PATTERNS = [
  /(?:please\s+)?build.*(?:my|me|a).*(?:agenda|schedule|itinerary)/i,
  /(?:please\s+)?create.*(?:my|me|a).*(?:agenda|schedule|itinerary)/i,
  /(?:please\s+)?generate.*(?:my|me|a).*(?:agenda|schedule|itinerary)/i,
  /i\s+(?:want|need|would like).*(?:an?\s+)?(?:agenda|schedule|itinerary)/i,
  /(?:can|could|will)\s+you.*(?:build|create|make).*(?:agenda|schedule|itinerary)/i
];

// Keywords that indicate session search or questions (not full agenda)
const SESSION_SEARCH_KEYWORDS = [
  'what sessions',
  'which sessions',
  'find sessions',
  'show sessions',
  'list sessions',
  'sessions about',
  'sessions on',
  'ai sessions',
  'cybersecurity sessions',
  'when is',
  'what time',
  "what's happening",
  "what is happening",
  "what's on",
  "what is on",
  'tell me about',
  'any sessions',
  'are there sessions',
  'morning sessions',
  'afternoon sessions',
  'tomorrow',
  'today',
  'this morning',
  'this afternoon'
];

// Keywords for speaker lookup
const SPEAKER_KEYWORDS = [
  'who is speaking',
  'tell me about speaker',
  'speaker information',
  'who presents',
  'find speaker',
  'speaker profile'
];

// Keywords for local recommendations (restaurants, bars, activities)
const LOCAL_KEYWORDS = [
  'restaurant', 'eat', 'food', 'lunch', 'dinner', 'breakfast', 'meal',
  'bar', 'drink', 'cocktail', 'beer', 'wine',
  'mandalay bay', 'nearby', 'around here', 'walking distance',
  'entertainment', 'show', 'things to do', 'activities', 'fun',
  'where can i eat', 'where to eat', 'what restaurants', 'any good',
  'hungry', 'coffee', 'starbucks', 'quick bite', 'snack'
];

// Keywords that indicate preference responses
const PREFERENCE_RESPONSE_INDICATORS = [
  "i'm interested in",
  "i am interested in",
  "my interests are",
  "interested in",
  "i'm a",
  "i am a",
  "my role is",
  "attending day",
  "attending all",
  "all 3 days",
  "all three days",
  "day 1",
  "day 2",
  "day 3",
  "tuesday",
  "wednesday",
  "thursday",
  "product manager",
  "executive",
  "developer",
  "vendor",
  "consultant"
];

/**
 * Checks if a message appears to be a response to preference questions
 */
export function isPreferenceResponse(message: string): boolean {
  const lowerMessage = message.toLowerCase();

  // Check if message is too short to be an agenda request
  if (message.length < 100) {
    // Check for preference indicators
    const hasPreferenceIndicator = PREFERENCE_RESPONSE_INDICATORS.some(indicator =>
      lowerMessage.includes(indicator)
    );

    // Check if it mentions interests without asking for agenda
    const mentionsInterests = (
      lowerMessage.includes('ai') ||
      lowerMessage.includes('cybersecurity') ||
      lowerMessage.includes('claims') ||
      lowerMessage.includes('underwriting') ||
      lowerMessage.includes('digital transformation') ||
      lowerMessage.includes('customer experience') ||
      lowerMessage.includes('data analytics') ||
      lowerMessage.includes('insurtech') ||
      lowerMessage.includes('embedded insurance')
    );

    // If it has preference indicators and mentions interests but doesn't explicitly ask for agenda
    if (hasPreferenceIndicator && mentionsInterests) {
      // Make sure it's not explicitly asking for an agenda
      const hasAgendaRequest = AGENDA_KEYWORDS.some(keyword =>
        lowerMessage.includes(keyword)
      );

      return !hasAgendaRequest;
    }
  }

  return false;
}

/**
 * Detects if a chat message should trigger the agenda builder tool
 */
export function detectToolIntent(message: string): ToolDetectionResult {
  const lowerMessage = message.toLowerCase();

  // First check if this looks like a preference response
  if (isPreferenceResponse(message)) {
    return {
      shouldUseTool: false,
      toolType: 'general_chat',
      confidence: 0.9,
      reason: 'User is providing preferences in response to questions'
    };
  }

  // Check for local recommendations (restaurants, bars, activities) - HIGH PRIORITY for speed
  const hasLocalKeyword = LOCAL_KEYWORDS.some(keyword =>
    lowerMessage.includes(keyword)
  );

  if (hasLocalKeyword) {
    // Quick check to make sure it's actually about venues, not sessions
    const isAboutVenues = !lowerMessage.includes('session') &&
                          !lowerMessage.includes('speaker') &&
                          !lowerMessage.includes('presentation');

    if (isAboutVenues) {
      return {
        shouldUseTool: true,
        toolType: 'local_recommendations',
        confidence: 0.95,
        reason: 'User asking about restaurants, bars, or activities near Mandalay Bay'
      };
    }
  }

  // Check for session search or informational queries BEFORE agenda building
  const hasSessionSearch = SESSION_SEARCH_KEYWORDS.some(keyword =>
    lowerMessage.includes(keyword)
  );

  if (hasSessionSearch) {
    // User is asking for information, not building an agenda
    return {
      shouldUseTool: false,
      toolType: 'session_search',
      confidence: 0.8,
      reason: 'User is asking for session information or what\'s happening'
    };
  }

  // Check for explicit agenda building intent - ONLY after ruling out information queries
  const hasAgendaKeyword = AGENDA_KEYWORDS.some(keyword =>
    lowerMessage.includes(keyword)
  );

  const matchesAgendaPattern = AGENDA_PATTERNS.some(pattern =>
    pattern.test(message)
  );

  // High confidence agenda building
  if (hasAgendaKeyword || matchesAgendaPattern) {
    // Extract potential parameters
    const params: Record<string, any> = {};

    // Check for day specifications
    if (lowerMessage.includes('day 1') || lowerMessage.includes('tuesday')) {
      params.days = ['day1'];
    } else if (lowerMessage.includes('day 2') || lowerMessage.includes('wednesday')) {
      params.days = ['day2'];
    } else if (lowerMessage.includes('day 3') || lowerMessage.includes('thursday')) {
      params.days = ['day3'];
    } else if (lowerMessage.includes('all days') || lowerMessage.includes('three day') || lowerMessage.includes('3 day') || lowerMessage.includes('full conference')) {
      params.days = ['day1', 'day2', 'day3'];
    }

    // Check for interest areas
    const interests = [];
    if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence')) {
      interests.push('AI & Automation');
    }
    if (lowerMessage.includes('cyber') || lowerMessage.includes('security')) {
      interests.push('Cybersecurity');
    }
    if (lowerMessage.includes('claim')) {
      interests.push('Claims Technology');
    }
    if (lowerMessage.includes('underwriting')) {
      interests.push('Underwriting');
    }
    if (lowerMessage.includes('embedded')) {
      interests.push('Embedded Insurance');
    }
    if (interests.length > 0) {
      params.preferredTracks = interests;
    }

    // Check for time constraints
    if (lowerMessage.includes('morning')) {
      params.timePreference = 'morning';
    } else if (lowerMessage.includes('afternoon')) {
      params.timePreference = 'afternoon';
    }

    return {
      shouldUseTool: true,
      toolType: 'agenda_builder',
      confidence: hasAgendaKeyword ? 0.95 : 0.85,
      extractedParams: params,
      reason: 'User wants to build a personalized conference agenda'
    };
  }


  // Check for speaker lookup
  const hasSpeakerKeyword = SPEAKER_KEYWORDS.some(keyword =>
    lowerMessage.includes(keyword)
  );

  if (hasSpeakerKeyword) {
    return {
      shouldUseTool: false,
      toolType: 'speaker_lookup',
      confidence: 0.8,
      reason: 'User is asking about speakers'
    };
  }

  // If message mentions schedule/agenda but isn't an explicit request, treat as general question
  if (lowerMessage.includes('schedule') || lowerMessage.includes('agenda')) {
    // User is asking ABOUT schedules, not asking to BUILD one
    return {
      shouldUseTool: false,
      toolType: 'general_chat',
      confidence: 0.6,
      reason: 'User asking about schedules/agenda, not explicitly requesting to build one'
    };
  }

  // Default to general chat
  return {
    shouldUseTool: false,
    toolType: 'general_chat',
    confidence: 0.5,
    reason: 'General question or conversation'
  };
}

/**
 * Formats the agenda builder response for chat
 */
export function formatAgendaResponse(agenda: any): string {
  // Check if agenda is valid - it should have days object
  if (!agenda || !agenda.days || typeof agenda.days !== 'object') {
    console.error('[formatAgendaResponse] Invalid agenda structure:', agenda);
    return "I couldn't generate your agenda at this time. Please try again or be more specific about your preferences.";
  }

  const { days } = agenda;

  // Check if days object has actual content
  const hasContent = Object.keys(days).some(dayKey =>
    days[dayKey]?.schedule && days[dayKey].schedule.length > 0
  );

  if (!hasContent) {
    console.error('[formatAgendaResponse] Agenda has no sessions:', agenda);
    return "I couldn't find enough sessions matching your preferences. Please try being more specific about your interests or goals.";
  }
  let response = "# 🗓️ Your Personalized ITC Vegas 2025 Agenda\n\n";
  response += "I've created a customized conference schedule based on your interests and profile. ";
  response += `This agenda includes ${agenda.metadata?.totalSessions || 0} carefully selected sessions.\n\n`;

  // Add summary statistics
  if (agenda.metadata) {
    response += "## 📊 Agenda Overview\n";
    response += `- **Total Sessions**: ${agenda.metadata.totalSessions}\n`;
    response += `- **Coverage**: ${agenda.metadata.daysIncluded.join(', ')}\n`;
    if (agenda.metadata.tracks?.length > 0) {
      response += `- **Focus Areas**: ${agenda.metadata.tracks.join(', ')}\n`;
    }
    response += "\n";
  }

  // Format each day
  Object.entries(days).forEach(([dayKey, daySchedule]: [string, any]) => {
    const dayNum = dayKey.replace('day', '');
    const dayDate = dayNum === '1' ? 'Tuesday, Oct 14' :
                    dayNum === '2' ? 'Wednesday, Oct 15' :
                    'Thursday, Oct 16';

    response += `## Day ${dayNum} - ${dayDate}\n\n`;

    daySchedule.schedule.forEach((item: any) => {
      const isBreak = item.type === 'meal' || item.type === 'break';
      const icon = isBreak ? '☕' : '📍';

      response += `### ${icon} ${item.time} - ${item.endTime}\n`;
      response += `**[${item.title}](/agenda/session/${item.id})**\n`;

      if (item.location) {
        response += `📍 [${item.location}](/locations?location=${encodeURIComponent(item.location)})\n`;
      }

      if (item.track) {
        response += `🏷️ ${item.track}\n`;
      }

      if (item.speakers?.length > 0) {
        response += `👥 Speakers: ${item.speakers.map((s: any) =>
          `[${s.name}](/speakers/${s.id})`
        ).join(', ')}\n`;
      }

      if (item.priority) {
        const priorityEmoji = item.priority === 'high' ? '⭐' :
                             item.priority === 'medium' ? '👍' : '💡';
        response += `${priorityEmoji} Priority: ${item.priority}\n`;
      }

      response += "\n";
    });

    // Add conflicts if any
    if (daySchedule.conflicts?.length > 0) {
      response += `⚠️ **Scheduling Conflicts Detected**: ${daySchedule.conflicts.length} conflicts were automatically resolved by prioritizing sessions based on your interests.\n\n`;
    }
  });

  // Add next steps
  response += "## 🎯 Next Steps\n\n";
  response += "1. **Review your agenda** - Click on any session title for full details\n";
  response += "2. **Save to favorites** - Click the star icon on sessions you don't want to miss\n";
  response += "3. **Export calendar** - Download your agenda as an .ics file for your calendar app\n";
  response += "4. **Share with colleagues** - Export and share your personalized schedule\n\n";

  response += "💡 **Pro Tips**:\n";
  response += "- Arrive 5-10 minutes early for popular sessions\n";
  response += "- Check venue maps for walking distances between sessions\n";
  response += "- Leave time for networking between sessions\n\n";

  response += "Would you like me to adjust anything in your agenda or explore specific sessions in more detail?";

  return response;
}