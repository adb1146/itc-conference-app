/**
 * ITC Vegas 2025 Conference Date System
 * Provides consistent date/time context for AI understanding
 */

export const CONFERENCE_DATES = {
  // Core date mappings - CORRECTED
  DAY_1: {
    dayNumber: 1,
    dayName: 'Day 1',
    date: '2025-10-14',
    dayOfWeek: 'Tuesday',
    fullDate: 'Tuesday, October 14, 2025',
    shortDate: 'Oct 14',
    tag: 'day1'
  },
  DAY_2: {
    dayNumber: 2,
    dayName: 'Day 2',
    date: '2025-10-15',
    dayOfWeek: 'Wednesday',
    fullDate: 'Wednesday, October 15, 2025',
    shortDate: 'Oct 15',
    tag: 'day2'
  },
  DAY_3: {
    dayNumber: 3,
    dayName: 'Day 3',
    date: '2025-10-16',
    dayOfWeek: 'Thursday',
    fullDate: 'Thursday, October 16, 2025',
    shortDate: 'Oct 16',
    tag: 'day3'
  },

  // Conference details
  CONFERENCE_NAME: 'ITC Vegas 2025',
  VENUE: 'Mandalay Bay Resort and Casino, Las Vegas',
  TIMEZONE: 'America/Los_Angeles', // Pacific Time (Vegas uses PT)

  // Date range
  START_DATE: '2025-10-14',
  END_DATE: '2025-10-16',

  // Pre-conference (if any activities before main conference)
  PRE_CONFERENCE: {
    date: '2025-10-13',
    dayOfWeek: 'Monday',
    fullDate: 'Monday, October 13, 2025',
    description: 'Pre-conference activities and registration'
  }
};

/**
 * Get conference day info by various inputs
 */
export function getConferenceDay(input: string | number | Date): typeof CONFERENCE_DATES.DAY_1 | null {
  const normalizedInput = typeof input === 'string' ? input.toLowerCase() : input;

  // Check by day number
  if (typeof normalizedInput === 'number') {
    switch (normalizedInput) {
      case 1: return CONFERENCE_DATES.DAY_1;
      case 2: return CONFERENCE_DATES.DAY_2;
      case 3: return CONFERENCE_DATES.DAY_3;
      default: return null;
    }
  }

  // Check by date
  if (input instanceof Date) {
    const dateStr = input.toISOString().split('T')[0];
    if (dateStr === CONFERENCE_DATES.DAY_1.date) return CONFERENCE_DATES.DAY_1;
    if (dateStr === CONFERENCE_DATES.DAY_2.date) return CONFERENCE_DATES.DAY_2;
    if (dateStr === CONFERENCE_DATES.DAY_3.date) return CONFERENCE_DATES.DAY_3;
    return null;
  }

  // Check by string patterns
  if (typeof normalizedInput === 'string') {
    // Day references
    if (normalizedInput.includes('day 1') || normalizedInput.includes('day1') || normalizedInput.includes('first day')) {
      return CONFERENCE_DATES.DAY_1;
    }
    if (normalizedInput.includes('day 2') || normalizedInput.includes('day2') || normalizedInput.includes('second day')) {
      return CONFERENCE_DATES.DAY_2;
    }
    if (normalizedInput.includes('day 3') || normalizedInput.includes('day3') || normalizedInput.includes('third day') || normalizedInput.includes('last day') || normalizedInput.includes('final day')) {
      return CONFERENCE_DATES.DAY_3;
    }

    // Day of week references - CORRECTED
    if (normalizedInput.includes('tuesday') || normalizedInput.includes('tue') || normalizedInput.includes('tues')) {
      return CONFERENCE_DATES.DAY_1;
    }
    if (normalizedInput.includes('wednesday') || normalizedInput.includes('wed')) {
      return CONFERENCE_DATES.DAY_2;
    }
    if (normalizedInput.includes('thursday') || normalizedInput.includes('thu') || normalizedInput.includes('thurs')) {
      return CONFERENCE_DATES.DAY_3;
    }

    // Date references - CORRECTED
    if (normalizedInput.includes('october 14') || normalizedInput.includes('oct 14') || normalizedInput.includes('10/14') || normalizedInput.includes('14th')) {
      return CONFERENCE_DATES.DAY_1;
    }
    if (normalizedInput.includes('october 15') || normalizedInput.includes('oct 15') || normalizedInput.includes('10/15') || normalizedInput.includes('15th')) {
      return CONFERENCE_DATES.DAY_2;
    }
    if (normalizedInput.includes('october 16') || normalizedInput.includes('oct 16') || normalizedInput.includes('10/16') || normalizedInput.includes('16th')) {
      return CONFERENCE_DATES.DAY_3;
    }
  }

  return null;
}

/**
 * Generate comprehensive date context for AI prompts
 */
export function generateDateContext(): string {
  return `
CONFERENCE DATE REFERENCE (CRITICAL - MEMORIZE THIS):
========================================================
ITC Vegas 2025 runs for 3 days:

📅 DAY 1 = TUESDAY, October 14, 2025
   - This is a TUESDAY (not Monday, not Wednesday)
   - Date: October 14, 2025
   - When someone says "Day 1" or "first day" → Tuesday Oct 14

📅 DAY 2 = WEDNESDAY, October 15, 2025
   - This is a WEDNESDAY (not Tuesday, not Thursday)
   - Date: October 15, 2025
   - When someone says "Day 2" or "second day" → Wednesday Oct 15

📅 DAY 3 = THURSDAY, October 16, 2025
   - This is a THURSDAY (not Wednesday, not Friday)
   - Date: October 16, 2025
   - When someone says "Day 3" or "third day" or "last day" → Thursday Oct 16

IMPORTANT MAPPINGS:
- "Tuesday" or "Tue" → Day 1 (Oct 14)
- "Wednesday" or "Wed" → Day 2 (Oct 15)
- "Thursday" or "Thu/Thurs" → Day 3 (Oct 16)
- "Monday" → Pre-conference day (Oct 13) - NOT part of main conference
- "Friday" → Post-conference (Oct 17) - NOT part of main conference

TIME ZONE: Pacific Time (PT) - Las Vegas uses Pacific Time
VENUE: Mandalay Bay Resort and Casino, Las Vegas

When answering questions:
- ALWAYS use the correct day of week for each conference day
- If someone asks about "Wednesday afternoon" → Day 2 afternoon sessions
- If someone asks about "Day 3" → Explicitly mention it's Thursday, Oct 16
- Never confuse the day numbers with days of the week
========================================================`;
}

/**
 * Parse time-related queries to identify which day is being asked about
 */
export function parseTimeQuery(query: string): {
  day: typeof CONFERENCE_DATES.DAY_1 | null;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | null;
} {
  const lowerQuery = query.toLowerCase();
  const day = getConferenceDay(query);

  let timeOfDay: 'morning' | 'afternoon' | 'evening' | null = null;

  if (lowerQuery.includes('morning') || lowerQuery.includes('breakfast') || lowerQuery.includes('am')) {
    timeOfDay = 'morning';
  } else if (lowerQuery.includes('afternoon') || lowerQuery.includes('lunch')) {
    timeOfDay = 'afternoon';
  } else if (lowerQuery.includes('evening') || lowerQuery.includes('dinner') || lowerQuery.includes('night')) {
    timeOfDay = 'evening';
  }

  return { day, timeOfDay };
}

/**
 * Format session time with day context
 */
export function formatSessionTime(sessionDate: Date | string, includeDay: boolean = true): string {
  const date = typeof sessionDate === 'string' ? new Date(sessionDate) : sessionDate;
  const dateStr = date.toISOString().split('T')[0];

  const day = getConferenceDay(dateStr);
  if (!day) {
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });

  if (includeDay) {
    return `${day.dayOfWeek}, ${day.shortDate} at ${timeStr}`;
  }

  return timeStr;
}

/**
 * Get all date variations for search purposes
 */
export function getDateSearchTerms(dayNumber: 1 | 2 | 3): string[] {
  const day = dayNumber === 1 ? CONFERENCE_DATES.DAY_1 :
              dayNumber === 2 ? CONFERENCE_DATES.DAY_2 :
              CONFERENCE_DATES.DAY_3;

  return [
    day.dayName.toLowerCase(),
    `day ${dayNumber}`,
    `day${dayNumber}`,
    day.dayOfWeek.toLowerCase(),
    day.dayOfWeek.substring(0, 3).toLowerCase(),
    day.date,
    day.shortDate.toLowerCase(),
    `october ${14 + dayNumber - 1}`,
    `oct ${14 + dayNumber - 1}`,
    `10/${14 + dayNumber - 1}`
  ];
}