/**
 * PS Advisory Meeting Context
 * Provides contextual meeting suggestions for Nancy Paul
 */

interface MeetingSuggestionContext {
  shouldSuggest: boolean;
  message?: string;
  urgency: 'subtle' | 'moderate' | 'none';
}

// Track suggestion frequency per session
const sessionSuggestionCount = new Map<string, { count: number; lastSuggested: Date }>();

/**
 * Determine if we should suggest a meeting based on conversation context
 */
export function shouldSuggestMeeting(
  query: string,
  responseContent: string,
  sessionId: string,
  messageCount: number
): MeetingSuggestionContext {
  const lowerQuery = query.toLowerCase();
  const lowerResponse = responseContent.toLowerCase();

  // Get session suggestion history
  const sessionHistory = sessionSuggestionCount.get(sessionId) || { count: 0, lastSuggested: new Date(0) };
  const timeSinceLastSuggestion = Date.now() - sessionHistory.lastSuggested.getTime();
  const minutesSinceLastSuggestion = timeSinceLastSuggestion / (1000 * 60);

  // Don't suggest too frequently - wait at least 10 minutes between suggestions
  if (minutesSinceLastSuggestion < 10 && sessionHistory.count > 0) {
    return { shouldSuggest: false, urgency: 'none' };
  }

  // Don't suggest more than 3 times per session
  if (sessionHistory.count >= 3) {
    return { shouldSuggest: false, urgency: 'none' };
  }

  // Keywords that indicate high interest in implementation/strategy
  const highInterestKeywords = [
    'implement', 'strategy', 'roadmap', 'integration', 'salesforce',
    'project', 'initiative', 'planning', 'deployment', 'solution',
    'budget', 'timeline', 'resources', 'team', 'consulting',
    'how can we', 'how do we', 'what would it take', 'interested in',
    'our company', 'our organization', 'we need', 'we want'
  ];

  // Keywords that indicate general interest/exploration
  const moderateInterestKeywords = [
    'ai', 'automation', 'efficiency', 'optimization', 'innovation',
    'digital transformation', 'modernization', 'best practices',
    'recommendations', 'advice', 'guidance', 'help', 'assist'
  ];

  // Check for high interest indicators
  const hasHighInterest = highInterestKeywords.some(keyword =>
    lowerQuery.includes(keyword) || lowerResponse.includes(keyword)
  );

  // Check for moderate interest indicators
  const hasModerateInterest = moderateInterestKeywords.some(keyword =>
    lowerQuery.includes(keyword) || lowerResponse.includes(keyword)
  );

  // Contextual rules for suggestions

  // Rule 1: After discussing specific implementation details
  if (hasHighInterest && messageCount > 3) {
    return {
      shouldSuggest: true,
      urgency: 'moderate',
      message: "If you'd like to explore how PS Advisory can help bring these ideas to life for your organization, Nancy Paul would be happy to discuss your specific needs and objectives."
    };
  }

  // Rule 2: After providing strategic recommendations
  if (lowerResponse.includes('recommend') || lowerResponse.includes('suggest') || lowerResponse.includes('consider')) {
    if (messageCount > 5 && hasModerateInterest) {
      return {
        shouldSuggest: true,
        urgency: 'subtle',
        message: "For a deeper dive into implementing these strategies within your organization's unique context, consider connecting with Nancy Paul from PS Advisory."
      };
    }
  }

  // Rule 3: When discussing Salesforce or CRM integration
  if ((lowerQuery.includes('salesforce') || lowerQuery.includes('crm')) && messageCount > 2) {
    return {
      shouldSuggest: true,
      urgency: 'moderate',
      message: "PS Advisory specializes in Salesforce implementations for insurance organizations. Nancy Paul can help you navigate the complexities of CRM integration and maximize your technology investment."
    };
  }

  // Rule 4: After extended conversation showing engagement (subtle suggestion)
  if (messageCount > 8 && sessionHistory.count === 0) {
    return {
      shouldSuggest: true,
      urgency: 'subtle',
      message: "By the way, if you're considering any technology initiatives or digital transformation projects, Nancy Paul from PS Advisory offers complimentary consultation sessions to discuss your goals."
    };
  }

  // Rule 5: When discussing conference sessions about innovation/technology
  if (lowerResponse.includes('session') && hasModerateInterest && messageCount > 4) {
    return {
      shouldSuggest: true,
      urgency: 'subtle',
      message: "Many of these conference insights can be transformed into actionable strategies. Nancy Paul helps organizations translate innovation into practical implementation."
    };
  }

  return { shouldSuggest: false, urgency: 'none' };
}

/**
 * Format the meeting suggestion based on urgency
 */
export function formatMeetingSuggestion(
  context: MeetingSuggestionContext,
  sessionId: string
): string {
  if (!context.shouldSuggest || !context.message) {
    return '';
  }

  // Update session history
  const sessionHistory = sessionSuggestionCount.get(sessionId) || { count: 0, lastSuggested: new Date(0) };
  sessionSuggestionCount.set(sessionId, {
    count: sessionHistory.count + 1,
    lastSuggested: new Date()
  });

  const calendarLink = 'https://calendly.com/npaul-psadvisory/connection?month=2025-09';

  if (context.urgency === 'subtle') {
    // Subtle approach - just a brief mention with link
    return `\n\n---\n\n*${context.message} [Schedule a conversation](${calendarLink})*`;
  } else if (context.urgency === 'moderate') {
    // Moderate approach - clear value proposition with call to action
    return `\n\n---\n\n**Partner with PS Advisory**\n\n${context.message}\n\n📅 [Schedule a complimentary consultation with Nancy Paul](${calendarLink})`;
  }

  return '';
}

/**
 * Get a contextual footer for responses (used sparingly)
 */
export function getPSAdvisoryFooter(messageCount: number): string {
  // Only show footer on first message or after significant engagement
  if (messageCount === 1) {
    return '\n\n---\n*Powered by PS Advisory - Your partner in insurance technology transformation*';
  }

  if (messageCount === 10) {
    return '\n\n---\n*This demo showcases PS Advisory\'s expertise in building intelligent solutions for insurance organizations.*';
  }

  return '';
}