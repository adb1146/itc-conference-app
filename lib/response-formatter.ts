/**
 * Enhanced Response Formatter
 * Intelligently formats search results based on query type and context
 */

import { EnhancedResult } from './result-enhancer';

export type QueryType =
  | 'meal_query'
  | 'time_query'
  | 'recommendation_query'
  | 'speaker_query'
  | 'track_query'
  | 'topic_query'
  | 'general_search';

export interface FormattingOptions {
  includePersonalization?: boolean;
  includeEnrichments?: boolean;
  includeRelatedSessions?: boolean;
  includeCallToAction?: boolean;
  maxResults?: number;
  groupByCategory?: boolean;
  showScores?: boolean; // Debug option
}

/**
 * Main formatting function
 */
export async function optimizeResponseFormat(
  results: EnhancedResult[],
  query: string,
  queryType: QueryType,
  options?: FormattingOptions
): Promise<string> {
  const defaults: FormattingOptions = {
    includePersonalization: true,
    includeEnrichments: true,
    includeRelatedSessions: false,
    includeCallToAction: true,
    maxResults: 10,
    groupByCategory: true,
    showScores: false
  };

  const settings = { ...defaults, ...options };

  // Limit results for display
  const displayResults = results.slice(0, settings.maxResults);

  // Generate appropriate header
  let response = generateContextualHeader(query, displayResults.length, results.length, queryType);

  // Group results if needed
  const groupedResults = settings.groupByCategory
    ? smartGroupResults(displayResults, queryType)
    : { default: displayResults };

  // Format based on query type
  switch (queryType) {
    case 'meal_query':
      response += formatMealResults(groupedResults, settings);
      break;
    case 'time_query':
      response += formatTimeBasedResults(groupedResults, settings);
      break;
    case 'recommendation_query':
      response += formatRecommendationResults(groupedResults, settings);
      break;
    case 'speaker_query':
      response += formatSpeakerResults(groupedResults, settings);
      break;
    case 'track_query':
      response += formatTrackResults(groupedResults, settings);
      break;
    case 'topic_query':
      response += formatTopicResults(groupedResults, settings);
      break;
    default:
      response += formatDefaultResults(groupedResults, settings);
  }

  // Add contextual footer
  if (settings.includeCallToAction) {
    response += generateContextualFooter(query, displayResults, results.length, queryType);
  }

  return response;
}

/**
 * Generate contextual header based on query and results
 */
function generateContextualHeader(
  query: string,
  displayCount: number,
  totalCount: number,
  queryType: QueryType
): string {
  if (displayCount === 0) {
    return `❌ **No Results Found**\n\nI couldn't find any sessions matching "${query}". Try:\n• Using different keywords\n• Checking the full agenda\n• Asking about specific topics or speakers\n\n`;
  }

  const headerMap: Record<QueryType, string> = {
    meal_query: '🍽️ **Conference Meal Sessions**',
    time_query: '⏰ **Sessions by Time**',
    recommendation_query: '✨ **Personalized Recommendations**',
    speaker_query: '👤 **Speaker Sessions**',
    track_query: '📚 **Track Sessions**',
    topic_query: '🎯 **Topic Results**',
    general_search: '🔍 **Search Results**'
  };

  let header = headerMap[queryType] || '🔍 **Search Results**';

  if (displayCount < totalCount) {
    header += ` (Showing ${displayCount} of ${totalCount})`;
  } else if (totalCount > 1) {
    header += ` (${totalCount} results)`;
  }

  return header + '\n\n';
}

/**
 * Smart grouping of results based on query type
 */
function smartGroupResults(
  results: EnhancedResult[],
  queryType: QueryType
): Record<string, EnhancedResult[]> {
  const groups: Record<string, EnhancedResult[]> = {};

  switch (queryType) {
    case 'meal_query':
      // Group by meal type
      results.forEach(result => {
        const mealType = getMealType(result);
        if (!groups[mealType]) groups[mealType] = [];
        groups[mealType].push(result);
      });
      break;

    case 'time_query':
      // Group by day/time
      results.forEach(result => {
        const timeGroup = getTimeGroup(result);
        if (!groups[timeGroup]) groups[timeGroup] = [];
        groups[timeGroup].push(result);
      });
      break;

    case 'track_query':
      // Group by track
      results.forEach(result => {
        const track = result.track || 'General';
        if (!groups[track]) groups[track] = [];
        groups[track].push(result);
      });
      break;

    default:
      // Group by relevance tiers
      results.forEach(result => {
        const tier = getRelevanceTier(result);
        if (!groups[tier]) groups[tier] = [];
        groups[tier].push(result);
      });
  }

  return Object.keys(groups).length > 0 ? groups : { default: results };
}

/**
 * Format meal session results
 */
function formatMealResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';
  const mealOrder = ['Breakfast', 'Lunch', 'Dinner', 'Reception', 'Coffee Break', 'Other'];

  // Sort groups by meal order
  const sortedGroups = Object.entries(groupedResults).sort((a, b) => {
    const aIndex = mealOrder.indexOf(a[0]) !== -1 ? mealOrder.indexOf(a[0]) : 999;
    const bIndex = mealOrder.indexOf(b[0]) !== -1 ? mealOrder.indexOf(b[0]) : 999;
    return aIndex - bIndex;
  });

  sortedGroups.forEach(([mealType, sessions]) => {
    if (mealType !== 'default') {
      output += `### ${mealType}\n\n`;
    }

    sessions.forEach(session => {
      output += formatSingleMealSession(session, settings);
    });
  });

  return output;
}

/**
 * Format a single meal session
 */
function formatSingleMealSession(
  session: EnhancedResult,
  settings: FormattingOptions
): string {
  let output = `📍 **[${session.title}](/agenda/session/${session.id})**\n`;

  // Time and location
  if (session.startTime) {
    output += `  ⏰ ${formatDateTime(session.startTime)}`;
    if (session.endTime) {
      output += ` - ${formatDateTime(session.endTime, true)}`;
    }
    output += '\n';
  }

  if (session.location) {
    output += `  📍 ${session.location}`;
    if (session.enrichments?.walking_time_from_main) {
      output += ` (${session.enrichments.walking_time_from_main} min walk)`;
    }
    output += '\n';
  }

  // Availability warning
  if (session.enrichments?.availability?.spots_remaining &&
      session.enrichments.availability.spots_remaining < 20) {
    output += `  ⚠️ **Limited spots**: ${session.enrichments.availability.spots_remaining} remaining\n`;
  }

  // Dietary info
  if (session.enrichments?.dietary_info && session.enrichments.dietary_info.length > 0) {
    output += `  🥗 ${session.enrichments.dietary_info.join(', ')}\n`;
  }

  // Personalization
  if (settings.includePersonalization && session.personalizedReasons && session.personalizedReasons.length > 0) {
    output += `  ✨ *${session.personalizedReasons[0]}*\n`;
  }

  // Debug scores
  if (settings.showScores) {
    output += `  📊 Scores: R:${session.relevanceScore?.toFixed(2)} P:${session.personalizedScore?.toFixed(2)} Q:${session.qualityScore?.toFixed(2)} F:${session.finalScore?.toFixed(2)}\n`;
  }

  output += '\n';
  return output;
}

/**
 * Format time-based results
 */
function formatTimeBasedResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';
  const now = new Date();

  // Sort groups by time
  const sortedGroups = Object.entries(groupedResults).sort((a, b) => {
    const timeOrder = ['Happening Now', 'Starting Soon', 'Today', 'Tomorrow', 'This Week', 'Later'];
    const aIndex = timeOrder.indexOf(a[0]) !== -1 ? timeOrder.indexOf(a[0]) : 999;
    const bIndex = timeOrder.indexOf(b[0]) !== -1 ? timeOrder.indexOf(b[0]) : 999;
    return aIndex - bIndex;
  });

  sortedGroups.forEach(([timeGroup, sessions]) => {
    if (timeGroup !== 'default') {
      const emoji = getTimeGroupEmoji(timeGroup);
      output += `### ${emoji} ${timeGroup}\n\n`;
    }

    sessions.forEach(session => {
      output += formatSingleSession(session, settings, 'time');
    });
  });

  return output;
}

/**
 * Format recommendation results with strong personalization
 */
function formatRecommendationResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';

  // Special formatting for personalized recommendations
  const sortedGroups = Object.entries(groupedResults).sort((a, b) => {
    const priority = ['Highly Recommended', 'Recommended', 'You Might Like', 'default'];
    return priority.indexOf(a[0]) - priority.indexOf(b[0]);
  });

  sortedGroups.forEach(([tier, sessions]) => {
    if (tier !== 'default') {
      const emoji = tier === 'Highly Recommended' ? '⭐' : tier === 'Recommended' ? '👍' : '💡';
      output += `### ${emoji} ${tier}\n\n`;
    }

    sessions.forEach((session, index) => {
      // Rank display for top recommendations
      if (tier === 'Highly Recommended' && index < 3) {
        const medals = ['🥇', '🥈', '🥉'];
        output += `${medals[index]} `;
      }

      output += formatSingleSession(session, settings, 'recommendation');
    });
  });

  // Add Smart Agenda Builder CTA
  output += '\n---\n\n';
  output += '💡 **Want a complete personalized agenda?**\n';
  output += 'I can direct you to our Smart Agenda Builder that will:\n';
  output += '• Analyze all 280+ sessions\n';
  output += '• Match your interests and role\n';
  output += '• Avoid scheduling conflicts\n';
  output += '• Include meals and networking\n\n';
  output += '**Just say:** "Take me to the Smart Agenda Builder"\n';

  return output;
}

/**
 * Format speaker-focused results
 */
function formatSpeakerResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';

  Object.entries(groupedResults).forEach(([group, sessions]) => {
    sessions.forEach(session => {
      output += formatSingleSession(session, settings, 'speaker');
    });
  });

  return output;
}

/**
 * Format track results
 */
function formatTrackResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';

  Object.entries(groupedResults).forEach(([track, sessions]) => {
    if (track !== 'default') {
      output += `### 📚 ${track} Track\n\n`;
    }

    sessions.forEach(session => {
      output += formatSingleSession(session, settings, 'track');
    });
  });

  return output;
}

/**
 * Format topic results
 */
function formatTopicResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';

  Object.entries(groupedResults).forEach(([group, sessions]) => {
    sessions.forEach(session => {
      output += formatSingleSession(session, settings, 'topic');
    });
  });

  return output;
}

/**
 * Format default results
 */
function formatDefaultResults(
  groupedResults: Record<string, EnhancedResult[]>,
  settings: FormattingOptions
): string {
  let output = '';

  Object.entries(groupedResults).forEach(([group, sessions]) => {
    if (group !== 'default' && sessions.length > 0) {
      output += `### ${group}\n\n`;
    }

    sessions.forEach(session => {
      output += formatSingleSession(session, settings, 'default');
    });
  });

  return output;
}

/**
 * Format a single session with appropriate details
 */
function formatSingleSession(
  session: EnhancedResult,
  settings: FormattingOptions,
  context: string = 'default'
): string {
  let output = `**[${session.title}](/agenda/session/${session.id})**\n`;

  // Speaker info (prominent for speaker queries)
  if (context === 'speaker' && session.speaker_name) {
    output += `  👤 ${session.speaker_name}`;
    if (session.speaker_company) {
      output += ` - ${session.speaker_company}`;
    }
    output += '\n';
  }

  // Time info
  if (session.startTime) {
    const status = session.enrichments?.status;
    if (status === 'live') {
      output += `  🔴 **LIVE NOW**`;
    } else if (status === 'upcoming') {
      output += `  ⏰ ${formatDateTime(session.startTime)}`;
      if (session.enrichments?.time_until_start) {
        output += ` (${session.enrichments.time_until_start})`;
      }
    } else {
      output += `  ⏰ ${formatDateTime(session.startTime)}`;
    }
    output += '\n';
  }

  // Location
  if (session.location) {
    output += `  📍 ${session.location}`;
    if (settings.includeEnrichments && session.enrichments?.walking_time_from_main) {
      output += ` • ${session.enrichments.walking_time_from_main} min walk`;
    }
    output += '\n';
  }

  // Track and level
  if (session.track && context !== 'track') {
    output += `  🏷️ ${session.track}`;
    if (session.level) {
      output += ` • ${session.level}`;
    }
    output += '\n';
  }

  // Brief description (for non-meal queries)
  if (context !== 'meal_query' && session.description) {
    const brief = session.description.substring(0, 150);
    output += `  📝 *${brief}${session.description.length > 150 ? '...' : ''}*\n`;
  }

  // Personalization reasons
  if (settings.includePersonalization && session.personalizedReasons && session.personalizedReasons.length > 0) {
    const reasons = session.personalizedReasons.slice(0, 2);
    output += `  ✨ **Why this session:** ${reasons.join(', ')}\n`;
  }

  // Availability (if limited)
  if (settings.includeEnrichments && session.enrichments?.availability) {
    const avail = session.enrichments.availability;
    if (avail.is_full) {
      output += `  ❌ **FULL**`;
      if (avail.waitlist_available) {
        output += ' (Waitlist available)';
      }
      output += '\n';
    } else if (avail.spots_remaining < 20) {
      output += `  ⚠️ Only ${avail.spots_remaining} spots left\n`;
    }
  }

  // Related sessions (only for detailed views)
  if (settings.includeRelatedSessions && session.enrichments?.related_sessions && session.enrichments.related_sessions.length > 0) {
    output += `  🔗 Related: `;
    const related = session.enrichments.related_sessions.slice(0, 2);
    output += related.map(r => `[${truncateTitle(r.title)}](/agenda/session/${r.id})`).join(', ');
    output += '\n';
  }

  // Debug scores
  if (settings.showScores) {
    output += `  📊 Scores - R:${(session.relevanceScore || 0).toFixed(2)} `;
    output += `P:${(session.personalizedScore || 0).toFixed(2)} `;
    output += `Q:${(session.qualityScore || 0).toFixed(2)} `;
    output += `F:${(session.finalScore || 0).toFixed(2)}\n`;
  }

  output += '\n';
  return output;
}

/**
 * Generate contextual footer with helpful actions
 */
function generateContextualFooter(
  query: string,
  displayResults: EnhancedResult[],
  totalCount: number,
  queryType: QueryType
): string {
  let footer = '\n---\n\n';

  // Add "see more" if there are more results
  if (displayResults.length < totalCount) {
    footer += `📋 Showing ${displayResults.length} of ${totalCount} results. `;
    footer += `Say "show more" to see additional results.\n\n`;
  }

  // Query-specific CTAs
  switch (queryType) {
    case 'recommendation_query':
      footer += '🎯 **Next Steps:**\n';
      footer += '• Click any session to see full details\n';
      footer += '• Say "Build my agenda" for a complete schedule\n';
      footer += '• Ask about specific topics for more recommendations\n';
      break;

    case 'meal_query':
      footer += '🍽️ **Meal Information:**\n';
      footer += '• All conference meals are included with registration\n';
      footer += '• Dietary restrictions? Contact conference services\n';
      footer += '• Looking for restaurants? Ask "What restaurants are at Mandalay Bay?"\n';
      break;

    case 'time_query':
      footer += '⏰ **Schedule Tips:**\n';
      footer += '• Click sessions to add to your agenda\n';
      footer += '• Avoid back-to-back sessions in different buildings\n';
      footer += '• Leave time for networking between sessions\n';
      break;

    case 'speaker_query':
      footer += '👤 **Speaker Info:**\n';
      footer += '• Click sessions for full speaker bios\n';
      footer += '• Most speakers available for Q&A after sessions\n';
      footer += '• Follow speakers on LinkedIn for continued learning\n';
      break;

    default:
      footer += '💡 **Helpful Actions:**\n';
      footer += '• Click any session to see full details\n';
      footer += '• Say "Build my agenda" for personalized scheduling\n';
      footer += '• Try different search terms for more results\n';
  }

  // Add search suggestions if results are limited
  if (displayResults.length < 3) {
    footer += '\n🔍 **Try Also Searching For:**\n';
    footer += generateSearchSuggestions(query, queryType);
  }

  return footer;
}

/**
 * Helper functions
 */

function getMealType(session: EnhancedResult): string {
  const title = (session.title || '').toLowerCase();
  if (title.includes('breakfast')) return 'Breakfast';
  if (title.includes('lunch')) return 'Lunch';
  if (title.includes('dinner')) return 'Dinner';
  if (title.includes('reception')) return 'Reception';
  if (title.includes('coffee')) return 'Coffee Break';
  return 'Other';
}

function getTimeGroup(session: EnhancedResult): string {
  if (!session.startTime) return 'Time TBD';

  const now = new Date();
  const sessionTime = new Date(session.startTime);
  const diffHours = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (session.enrichments?.status === 'live') return 'Happening Now';
  if (diffHours < 0) return 'Past';
  if (diffHours < 2) return 'Starting Soon';
  if (diffHours < 24) return 'Today';
  if (diffHours < 48) return 'Tomorrow';
  if (diffHours < 168) return 'This Week';
  return 'Later';
}

function getRelevanceTier(session: EnhancedResult): string {
  const score = session.finalScore || session.relevanceScore || 0;
  if (score >= 0.8) return 'Highly Recommended';
  if (score >= 0.6) return 'Recommended';
  if (score >= 0.4) return 'You Might Like';
  return 'Other Results';
}

function getTimeGroupEmoji(timeGroup: string): string {
  const emojiMap: Record<string, string> = {
    'Happening Now': '🔴',
    'Starting Soon': '⚡',
    'Today': '📅',
    'Tomorrow': '📆',
    'This Week': '📍',
    'Later': '📌',
    'Past': '✅'
  };
  return emojiMap[timeGroup] || '📍';
}

function formatDateTime(date: Date | string, timeOnly: boolean = false): string {
  const d = typeof date === 'string' ? new Date(date) : date;

  if (timeOnly) {
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const isToday = d.toDateString() === today.toDateString();
  const isTomorrow = d.toDateString() === tomorrow.toDateString();

  if (isToday) {
    return `Today at ${d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
  }

  if (isTomorrow) {
    return `Tomorrow at ${d.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    })}`;
  }

  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) return title;
  return title.substring(0, maxLength - 3) + '...';
}

function generateSearchSuggestions(query: string, queryType: QueryType): string {
  const suggestions = [];

  switch (queryType) {
    case 'speaker_query':
      suggestions.push('• Other keynote speakers');
      suggestions.push('• Panel discussions');
      suggestions.push('• Executive presentations');
      break;

    case 'topic_query':
      suggestions.push('• Related technology topics');
      suggestions.push('• Industry trends');
      suggestions.push('• Innovation sessions');
      break;

    default:
      suggestions.push('• Popular sessions');
      suggestions.push('• Keynote presentations');
      suggestions.push('• Networking events');
  }

  return suggestions.join('\n');
}

/**
 * Classify query type based on content
 */
export function classifyQueryType(query: string): QueryType {
  const lowerQuery = query.toLowerCase();

  // Check for meal queries
  if (lowerQuery.match(/\b(breakfast|lunch|dinner|meal|food|eat|dining|reception)\b/)) {
    return 'meal_query';
  }

  // Check for time queries
  if (lowerQuery.match(/\b(today|tomorrow|now|morning|afternoon|evening|\d{1,2}:\d{2}|when)\b/)) {
    return 'time_query';
  }

  // Check for recommendation queries
  if (lowerQuery.match(/\b(recommend|suggest|should i|best|top|popular|interesting|personalized|for me)\b/)) {
    return 'recommendation_query';
  }

  // Check for speaker queries
  if (lowerQuery.match(/\b(speaker|presenter|panelist|keynote|who is)\b/) ||
      /[A-Z][a-z]+ [A-Z][a-z]+/.test(query)) { // Name pattern
    return 'speaker_query';
  }

  // Check for track queries
  if (lowerQuery.match(/\b(track|stream|category|series)\b/)) {
    return 'track_query';
  }

  // Check for topic queries
  if (lowerQuery.match(/\b(about|topic|subject|theme|related to|regarding)\b/)) {
    return 'topic_query';
  }

  return 'general_search';
}