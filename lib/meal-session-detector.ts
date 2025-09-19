/**
 * Meal Session Detection System
 * Intelligently identifies conference meal sessions vs external dining queries
 */

export interface MealDetectionResult {
  isMealQuery: boolean;
  mealType?: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'general';
  queryType: 'conference-meal' | 'external-dining' | 'both' | 'none';
  timeContext?: 'today' | 'tomorrow' | 'specific-day' | 'general';
  confidence: number;
}

export interface MealSession {
  id: string;
  title: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'lunch-seminar' | 'reception';
  startTime: Date;
  endTime: Date;
  location: string;
  sponsor?: string;
  description?: string;
  isIncluded: boolean; // Included with registration
  hasFoodProvided: boolean;
  track?: string;
  day: number;
}

/**
 * Detect if a query is meal-related and determine the type
 */
export function detectMealQuery(query: string): MealDetectionResult {
  const lowerQuery = query.toLowerCase();

  // Meal-related keywords
  const breakfastKeywords = ['breakfast', 'morning meal', 'morning food'];
  const lunchKeywords = ['lunch', 'midday meal', 'noon meal', 'lunch seminar'];
  const dinnerKeywords = ['dinner', 'supper', 'evening meal'];
  const generalFoodKeywords = ['eat', 'food', 'meal', 'dining', 'hungry', 'restaurant', 'cafe', 'snack', 'coffee'];

  // Context keywords
  const conferenceKeywords = ['conference', 'included', 'sponsored', 'registration', 'agenda', 'session'];
  const externalKeywords = ['restaurant', 'cafe', 'nearby', 'outside', 'hotel', 'vegas'];
  const timeKeywords = ['when', 'where', 'what time', 'location'];

  // Determine meal type
  let mealType: MealDetectionResult['mealType'] = 'general';
  let isMealQuery = false;
  let confidence = 0;

  if (breakfastKeywords.some(keyword => lowerQuery.includes(keyword))) {
    mealType = 'breakfast';
    isMealQuery = true;
    confidence = 0.9;
  } else if (lunchKeywords.some(keyword => lowerQuery.includes(keyword))) {
    mealType = 'lunch';
    isMealQuery = true;
    confidence = 0.9;
  } else if (dinnerKeywords.some(keyword => lowerQuery.includes(keyword))) {
    mealType = 'dinner';
    isMealQuery = true;
    confidence = 0.9;
  } else if (generalFoodKeywords.some(keyword => lowerQuery.includes(keyword))) {
    mealType = 'general';
    isMealQuery = true;
    confidence = 0.7;
  }

  // Determine query type (conference vs external)
  let queryType: MealDetectionResult['queryType'] = 'none';

  if (!isMealQuery) {
    return {
      isMealQuery: false,
      queryType: 'none',
      confidence: 0
    };
  }

  const hasConferenceContext = conferenceKeywords.some(keyword => lowerQuery.includes(keyword));
  const hasExternalContext = externalKeywords.some(keyword => lowerQuery.includes(keyword));

  if (hasConferenceContext && !hasExternalContext) {
    queryType = 'conference-meal';
    confidence = Math.min(confidence + 0.1, 1.0);
  } else if (!hasConferenceContext && hasExternalContext) {
    queryType = 'external-dining';
  } else if (timeKeywords.some(keyword => lowerQuery.includes(keyword))) {
    // If asking about time/location, likely conference meal
    queryType = 'conference-meal';
    confidence = Math.min(confidence + 0.05, 1.0);
  } else {
    // Default: show both conference and external options
    queryType = 'both';
  }

  // Determine time context
  let timeContext: MealDetectionResult['timeContext'] = 'general';
  if (lowerQuery.includes('today') || lowerQuery.includes('now')) {
    timeContext = 'today';
  } else if (lowerQuery.includes('tomorrow')) {
    timeContext = 'tomorrow';
  } else if (lowerQuery.includes('day 1') || lowerQuery.includes('day 2') || lowerQuery.includes('day 3') ||
             lowerQuery.includes('tuesday') || lowerQuery.includes('wednesday') || lowerQuery.includes('thursday')) {
    timeContext = 'specific-day';
  }

  return {
    isMealQuery,
    mealType,
    queryType,
    timeContext,
    confidence
  };
}

/**
 * Identify meal sessions from conference sessions
 */
export function identifyMealSessions(sessions: any[]): MealSession[] {
  const mealSessions: MealSession[] = [];

  for (const session of sessions) {
    const titleLower = session.title?.toLowerCase() || '';
    const locationLower = session.location?.toLowerCase() || '';
    const descriptionLower = session.description?.toLowerCase() || '';

    let type: MealSession['type'] | null = null;
    let isIncluded = false;
    let hasFoodProvided = false;

    // Check for sponsored meals (usually included with registration)
    if (titleLower.includes('breakfast sponsored')) {
      type = 'breakfast';
      isIncluded = true;
      hasFoodProvided = true;
    } else if (titleLower.includes('lunch sponsored')) {
      type = 'lunch';
      isIncluded = true;
      hasFoodProvided = true;
    } else if (titleLower.includes('dinner') && titleLower.includes('sponsor')) {
      type = 'dinner';
      isIncluded = true;
      hasFoodProvided = true;
    }

    // Check for lunch seminars (special meal+content sessions)
    else if (locationLower.includes('lunch seminar') || titleLower.includes('lunch seminar')) {
      type = 'lunch-seminar';
      hasFoodProvided = true;
      isIncluded = false; // Usually requires separate registration
    }

    // Check for receptions (usually evening with food/drinks)
    else if (titleLower.includes('reception') || titleLower.includes('happy hour')) {
      type = 'reception';
      hasFoodProvided = true;
      isIncluded = titleLower.includes('opening reception') || titleLower.includes('closing');
    }

    // Check time-based patterns (breakfast = 7-9am, lunch = 12-2pm, dinner = 6-8pm)
    else if (session.startTime) {
      const startHour = new Date(session.startTime).getHours();

      if (startHour >= 7 && startHour <= 9 &&
          (titleLower.includes('breakfast') || titleLower.includes('coffee'))) {
        type = 'breakfast';
        hasFoodProvided = titleLower.includes('sponsored');
        isIncluded = hasFoodProvided;
      } else if (startHour >= 11 && startHour <= 14 &&
                 (titleLower.includes('lunch') || locationLower.includes('lunch'))) {
        type = 'lunch';
        hasFoodProvided = titleLower.includes('sponsored') || locationLower.includes('seminar');
        isIncluded = titleLower.includes('sponsored');
      } else if (startHour >= 18 && startHour <= 20 &&
                 (titleLower.includes('dinner') || titleLower.includes('gala'))) {
        type = 'dinner';
        hasFoodProvided = true;
        isIncluded = titleLower.includes('gala') || titleLower.includes('awards');
      }
    }

    // If we identified a meal session, add it
    if (type) {
      // Extract sponsor from title if present
      let sponsor: string | undefined;
      const sponsorMatch = session.title.match(/Sponsored by ([^,]+)/i);
      if (sponsorMatch) {
        sponsor = sponsorMatch[1].trim();
      }

      // Determine day number from tags or date
      let day = 1;
      if (session.tags?.includes('day2')) {
        day = 2;
      } else if (session.tags?.includes('day3')) {
        day = 3;
      } else if (session.startTime) {
        const date = new Date(session.startTime).getDate();
        if (date === 15) day = 2;
        else if (date === 16) day = 3;
      }

      mealSessions.push({
        id: session.id,
        title: session.title,
        type,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        location: session.location || 'TBD',
        sponsor,
        description: session.description,
        isIncluded,
        hasFoodProvided,
        track: session.track,
        day
      });
    }
  }

  // Sort by start time
  mealSessions.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

  return mealSessions;
}

/**
 * Get meal recommendations based on current time
 */
export function getMealRecommendations(
  mealSessions: MealSession[],
  currentTime: Date = new Date()
): {
  upcoming: MealSession[];
  current: MealSession[];
  past: MealSession[];
} {
  const upcoming: MealSession[] = [];
  const current: MealSession[] = [];
  const past: MealSession[] = [];

  for (const session of mealSessions) {
    const startTime = new Date(session.startTime).getTime();
    const endTime = new Date(session.endTime).getTime();
    const now = currentTime.getTime();

    if (now < startTime) {
      // Upcoming: starts in the future
      upcoming.push(session);
    } else if (now >= startTime && now <= endTime) {
      // Current: happening now
      current.push(session);
    } else {
      // Past: already ended
      past.push(session);
    }
  }

  return { upcoming, current, past };
}

/**
 * Format meal type for display
 */
export function formatMealType(type: MealSession['type']): string {
  const typeMap = {
    'breakfast': 'Breakfast',
    'lunch': 'Lunch',
    'dinner': 'Dinner',
    'lunch-seminar': 'Lunch Seminar',
    'reception': 'Reception'
  };

  return typeMap[type] || 'Meal';
}