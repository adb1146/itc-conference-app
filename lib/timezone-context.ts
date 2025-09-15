/**
 * Timezone Context Utility
 * Provides temporal awareness for the ITC Vegas conference
 */

import { format, toZonedTime } from 'date-fns-tz';
import { addDays, isWithinInterval, startOfDay, endOfDay, setHours, setMinutes } from 'date-fns';

const VEGAS_TIMEZONE = 'America/Los_Angeles'; // Las Vegas uses Pacific Time
const CONFERENCE_START = new Date('2025-10-14T00:00:00');
const CONFERENCE_END = new Date('2025-10-16T23:59:59');

export interface TimeContext {
  currentTimeVegas: Date;
  currentTimeString: string;
  conferenceStatus: 'before' | 'during' | 'after';
  conferenceDay?: 1 | 2 | 3;
  timeOfDay: 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'night';
  relativeTimeContext: string;
}

/**
 * Get current time in Las Vegas
 */
export function getVegasTime(): Date {
  return toZonedTime(new Date(), VEGAS_TIMEZONE);
}

/**
 * Format Vegas time for display
 */
export function formatVegasTime(date?: Date): string {
  const vegasTime = date || getVegasTime();
  return format(vegasTime, 'EEEE, MMMM d, yyyy h:mm a zzz', { timeZone: VEGAS_TIMEZONE });
}

/**
 * Get the time of day classification
 */
export function getTimeOfDay(date: Date): TimeContext['timeOfDay'] {
  const hour = date.getHours();

  if (hour >= 5 && hour < 9) return 'early_morning';
  if (hour >= 9 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

/**
 * Determine which conference day it is (if during conference)
 */
export function getConferenceDay(date: Date): 1 | 2 | 3 | undefined {
  const vegasDate = toZonedTime(date, VEGAS_TIMEZONE);
  const startDate = toZonedTime(CONFERENCE_START, VEGAS_TIMEZONE);

  const day1 = startOfDay(startDate);
  const day2 = startOfDay(addDays(startDate, 1));
  const day3 = startOfDay(addDays(startDate, 2));

  if (isWithinInterval(vegasDate, { start: day1, end: endOfDay(day1) })) return 1;
  if (isWithinInterval(vegasDate, { start: day2, end: endOfDay(day2) })) return 2;
  if (isWithinInterval(vegasDate, { start: day3, end: endOfDay(day3) })) return 3;

  return undefined;
}

/**
 * Get comprehensive time context
 */
export function getTimeContext(): TimeContext {
  const currentTimeVegas = getVegasTime();
  const currentTimeString = formatVegasTime(currentTimeVegas);

  // Determine conference status
  let conferenceStatus: TimeContext['conferenceStatus'];
  if (currentTimeVegas < CONFERENCE_START) {
    conferenceStatus = 'before';
  } else if (currentTimeVegas > CONFERENCE_END) {
    conferenceStatus = 'after';
  } else {
    conferenceStatus = 'during';
  }

  const conferenceDay = getConferenceDay(currentTimeVegas);
  const timeOfDay = getTimeOfDay(currentTimeVegas);

  // Build relative context string for AI
  let relativeTimeContext = `Current time in Las Vegas: ${currentTimeString}. `;

  if (conferenceStatus === 'before') {
    const daysUntil = Math.ceil((CONFERENCE_START.getTime() - currentTimeVegas.getTime()) / (1000 * 60 * 60 * 24));
    relativeTimeContext += `The conference starts in ${daysUntil} days (October 14-16, 2025). `;
    relativeTimeContext += `When users ask about "today" or "this morning", they likely mean the first day of the conference, not the current date.`;
  } else if (conferenceStatus === 'during' && conferenceDay) {
    relativeTimeContext += `The conference is currently in progress (Day ${conferenceDay} of 3). `;
    relativeTimeContext += `It is currently ${timeOfDay.replace('_', ' ')}. `;

    const tomorrowDay = Math.min(conferenceDay + 1, 3);
    if (timeOfDay === 'morning') {
      relativeTimeContext += `"This afternoon" means today after 12pm. "Tomorrow" means Day ${tomorrowDay}.`;
    } else if (timeOfDay === 'afternoon' || timeOfDay === 'evening') {
      relativeTimeContext += `"This morning" has already passed. "Tomorrow" means Day ${tomorrowDay}.`;
    }
  } else {
    relativeTimeContext += `The conference has ended (was October 14-16, 2025).`;
  }

  return {
    currentTimeVegas,
    currentTimeString,
    conferenceStatus,
    conferenceDay,
    timeOfDay,
    relativeTimeContext
  };
}

/**
 * Parse relative time references in user queries
 */
export function parseRelativeTime(query: string, context: TimeContext): {
  needsClarification: boolean;
  clarificationMessage?: string;
  interpretedTime?: string;
} {
  const lowerQuery = query.toLowerCase();

  // Keywords that indicate relative time
  const relativeKeywords = [
    'today', 'tomorrow', 'yesterday',
    'this morning', 'this afternoon', 'this evening', 'tonight',
    'tomorrow morning', 'tomorrow afternoon',
    'now', 'later', 'soon', 'next'
  ];

  const hasRelativeTime = relativeKeywords.some(keyword => lowerQuery.includes(keyword));

  if (!hasRelativeTime) {
    return { needsClarification: false };
  }

  // Before conference - relative times are ambiguous
  if (context.conferenceStatus === 'before') {
    if (lowerQuery.includes('today') || lowerQuery.includes('this morning') ||
        lowerQuery.includes('this afternoon') || lowerQuery.includes('tonight')) {
      return {
        needsClarification: true,
        clarificationMessage: `I notice you're asking about "${lowerQuery.includes('today') ? 'today' : 'this'}" but the conference doesn't start until October 14, 2025. Did you mean:\n- The first day of the conference (Tuesday, October 14)?\n- The current date (${format(context.currentTimeVegas, 'EEEE, MMMM d')})?`
      };
    }

    if (lowerQuery.includes('tomorrow')) {
      return {
        needsClarification: true,
        clarificationMessage: `When you say "tomorrow," did you mean:\n- The second day of the conference (Wednesday, October 15)?\n- Tomorrow's date (${format(addDays(context.currentTimeVegas, 1), 'EEEE, MMMM d')})?`
      };
    }
  }

  // During conference - we can interpret most things
  if (context.conferenceStatus === 'during') {
    let interpretedTime = '';

    if (lowerQuery.includes('now') || lowerQuery.includes('happening now')) {
      interpretedTime = `Current time (Day ${context.conferenceDay}, ${context.timeOfDay.replace('_', ' ')})`;
    } else if (lowerQuery.includes('this morning')) {
      if (context.timeOfDay === 'early_morning' || context.timeOfDay === 'morning') {
        interpretedTime = `This morning (Day ${context.conferenceDay}, current)`;
      } else {
        interpretedTime = `This morning (Day ${context.conferenceDay}, already passed)`;
      }
    } else if (lowerQuery.includes('this afternoon')) {
      if (context.timeOfDay === 'afternoon') {
        interpretedTime = `This afternoon (Day ${context.conferenceDay}, current)`;
      } else if (context.timeOfDay === 'evening' || context.timeOfDay === 'night') {
        interpretedTime = `This afternoon (Day ${context.conferenceDay}, already passed)`;
      } else {
        interpretedTime = `This afternoon (Day ${context.conferenceDay}, upcoming)`;
      }
    } else if (lowerQuery.includes('tomorrow')) {
      if (context.conferenceDay === 3) {
        return {
          needsClarification: true,
          clarificationMessage: "Tomorrow would be after the conference ends. Did you mean to ask about something on the final day (Thursday, October 16)?"
        };
      }
      interpretedTime = `Tomorrow (Day ${(context.conferenceDay || 0) + 1})`;
    }

    return {
      needsClarification: false,
      interpretedTime
    };
  }

  // After conference
  if (context.conferenceStatus === 'after') {
    return {
      needsClarification: true,
      clarificationMessage: "The conference has already ended (October 14-16, 2025). Are you looking for information about what happened during the conference?"
    };
  }

  return { needsClarification: false };
}

/**
 * Generate temporal context for AI prompt
 */
export function getTemporalContextForAI(): string {
  const context = getTimeContext();

  let prompt = `TEMPORAL CONTEXT:\n${context.relativeTimeContext}\n\n`;
  prompt += `IMPORTANT TIME INTERPRETATION RULES:\n`;

  if (context.conferenceStatus === 'before') {
    prompt += `- The conference hasn't started yet. Be careful with relative time references.\n`;
    prompt += `- If someone asks about "today" or "this morning/afternoon", ask for clarification.\n`;
    prompt += `- Assume they might mean the conference days, not the current date.\n`;
  } else if (context.conferenceStatus === 'during' && context.conferenceDay) {
    prompt += `- We are currently on Day ${context.conferenceDay} of the conference.\n`;
    prompt += `- "Today" = Day ${context.conferenceDay} (${['Tuesday', 'Wednesday', 'Thursday'][context.conferenceDay - 1]})\n`;
    prompt += `- "Tomorrow" = Day ${Math.min(context.conferenceDay + 1, 3)}\n`;
    prompt += `- Current time period: ${context.timeOfDay.replace('_', ' ')}\n`;
  } else {
    prompt += `- The conference has ended. Past tense should be used.\n`;
    prompt += `- Redirect questions about "current" events to recordings or summaries.\n`;
  }

  return prompt;
}