// Smart Agenda Builder Tool - AI-Powered with Chain-of-Thought Reasoning
// Generates intelligent conference schedules using Claude Opus 4.1

import {
  AgendaOptions,
  ScheduleItem,
  SmartAgenda,
  DaySchedule,
  ConflictInfo,
  MealBreak,
  TimeSlot,
  GenerationResult,
  AlternativeSession
} from './types';
import { calculateVenueDistance, hasEnoughTravelTime, filterByWalkingDistance } from './venue-distance';
import { searchSimilarSessions } from '@/lib/vector-db';
import { generateEmbedding } from '@/lib/vector-db';
import prisma from '@/lib/db';
import {
  generateIntelligentAgenda,
  analyzeSessionFit,
  SessionPriority,
  type UserProfile,
  type AgendaReasoningContext,
  type AgendaReasoningResult,
  type ReasoningStep
} from './ai-reasoning-engine';
import {
  detectScheduleConflicts,
  resolveConflictWithAI,
  applyResolution,
  type ConflictResolutionContext
} from './conflict-resolver';

const DEFAULT_OPTIONS: AgendaOptions = {
  includeMeals: true,
  maxSessionsPerDay: 8,
  preferredTracks: [],
  avoidTracks: [],
  startTime: '8:00 AM',
  endTime: '6:00 PM',
  minimumBreakMinutes: 15,
  maximumWalkingMinutes: 15
};

// Conference dates
const CONFERENCE_DATES = [
  '2025-10-15', // Day 1
  '2025-10-16', // Day 2
  '2025-10-17'  // Day 3
];

// Standard meal times
const MEAL_TIMES = {
  breakfast: { start: '7:30 AM', end: '8:30 AM', title: 'Breakfast Break' },
  lunch: { start: '12:00 PM', end: '1:00 PM', title: 'Lunch Break' },
  dinner: { start: '6:00 PM', end: '7:30 PM', title: 'Dinner Break' }
};

/**
 * Main entry point for generating a smart agenda
 * REQUIRES AUTHENTICATION
 */
export async function generateSmartAgenda(
  userId: string | null,
  options: Partial<AgendaOptions> = {}
): Promise<GenerationResult> {
  // Check authentication
  if (!userId) {
    return {
      success: false,
      error: 'Authentication required',
      requiresAuth: true
    };
  }

  try {
    // Merge with default options
    const finalOptions = { ...DEFAULT_OPTIONS, ...options };

    // Load user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: {
          include: {
            session: {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            },
            speaker: true
          }
        }
      }
    });

    if (!user) {
      return {
        success: false,
        error: 'User not found',
        requiresAuth: true
      };
    }

    // Get all sessions
    const allSessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Extract favorited sessions
    const favoritedSessions = user.favorites
      .filter(f => f.type === 'session' && f.session)
      .map(f => f.session!);

    // Extract favorited speakers
    const favoritedSpeakers = user.favorites
      .filter(f => f.type === 'speaker' && f.speaker)
      .map(f => f.speaker!);

    // Calculate profile completeness early
    const userProfile: UserProfile = {
      id: user.id,
      name: user.name || '',
      role: user.role || '',
      company: user.company || '',
      organizationType: user.organizationType || '',
      interests: user.interests || [],
      goals: user.goals || [],
      yearsExperience: 0, // user.yearsExperience || 0 - not in user model
      usingSalesforce: user.usingSalesforce || false,
      interestedInSalesforce: user.interestedInSalesforce || false
    };

    const profileCompleteness = calculateProfileCompleteness(userProfile);

    // Build agenda for each day
    const days: DaySchedule[] = [];
    const conflicts: ConflictInfo[] = [];
    const suggestions: string[] = [];
    let allReasoningSteps: ReasoningStep[] = [];
    let profileCoachingMessages: string[] = [];
    let usingAI = profileCompleteness >= 40;

    for (let dayIndex = 0; dayIndex < CONFERENCE_DATES.length; dayIndex++) {
      const date = CONFERENCE_DATES[dayIndex];
      const daySchedule = await buildDaySchedule(
        date,
        dayIndex + 1,
        favoritedSessions,
        favoritedSpeakers,
        allSessions,
        user,
        finalOptions
      );

      days.push(daySchedule);

      // Collect reasoning if available
      if ('reasoning' in daySchedule && daySchedule.reasoning) {
        allReasoningSteps.push(...daySchedule.reasoning);
      }

      // Detect and resolve conflicts intelligently
      const dayConflicts = detectScheduleConflicts(daySchedule.schedule);

      // Try to resolve conflicts with AI if profile is complete enough
      if (user && profileCompleteness >= 40) {
        for (const conflict of dayConflicts) {
          try {
            const resolutionContext: ConflictResolutionContext = {
              conflict,
              currentSchedule: daySchedule.schedule,
              availableSessions: allSessions.filter(session => {
                const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
                return sessionDate === date;
              }),
              userProfile: {
                interests: user.interests || [],
                goals: user.goals || [],
                role: user.role || ''
              },
              userInterests: user.interests || [],
              date: date
            };

            const resolution = await resolveConflictWithAI(resolutionContext);

            // Apply high-confidence resolutions automatically
            if (resolution.confidence >= 80 && resolution.type !== 'accept') {
              daySchedule.schedule = applyResolution(
                daySchedule.schedule,
                resolution,
                conflict.sessionIds
              );

              // Update conflict with resolution
              conflict.resolution = resolution.action;
              conflict.alternatives = resolution.alternatives;
            }
          } catch (error) {
            console.error('Failed to resolve conflict with AI:', error);
          }
        }
      }

      conflicts.push(...dayConflicts);
    }

    // Generate profile coaching messages
    if (profileCompleteness < 80) {
      profileCoachingMessages.push(`Your profile is ${profileCompleteness}% complete. Complete it for better recommendations.`);
    }
    if (!user.interests || user.interests.length === 0) {
      profileCoachingMessages.push('💡 Add interests to get personalized AI recommendations');
    }
    if (!user.goals || user.goals.length === 0) {
      profileCoachingMessages.push('🎯 Set conference goals for a more strategic agenda');
    }

    // Calculate overall metrics
    const totalFavorites = favoritedSessions.length;
    const favoritesIncluded = days.reduce((sum, day) =>
      sum + day.schedule.filter(item => item.source === 'user-favorite').length, 0
    );
    const aiSuggestionsAdded = days.reduce((sum, day) =>
      sum + day.schedule.filter(item => item.source === 'ai-suggested').length, 0
    );

    // Generate suggestions
    if (favoritesIncluded < totalFavorites) {
      suggestions.push(`${totalFavorites - favoritesIncluded} of your favorites couldn't be included due to conflicts`);
    }

    if (aiSuggestionsAdded > 0) {
      suggestions.push(`Added ${aiSuggestionsAdded} AI-recommended sessions based on your interests`);
    }

    if (user.interests && user.interests.length === 0) {
      suggestions.push('Add interests to your profile for better AI recommendations');
    }

    // Add profile coaching to suggestions
    suggestions.push(...profileCoachingMessages);

    // Build final agenda with AI enhancements
    const agenda: SmartAgenda = {
      userId,
      generatedAt: new Date(),
      days,
      metrics: {
        totalFavorites,
        favoritesIncluded,
        aiSuggestionsAdded,
        conflictsResolved: conflicts.filter(c => c.resolution).length,
        overallConfidence: calculateOverallConfidence(days),
        profileCompleteness
      },
      conflicts,
      suggestions,
      warnings: [],
      aiReasoning: allReasoningSteps.length > 0 ? allReasoningSteps : undefined,
      profileCoaching: profileCoachingMessages.length > 0 ? profileCoachingMessages : undefined,
      usingAI: allReasoningSteps.length > 0
    };

    return {
      success: true,
      agenda
    };

  } catch (error) {
    console.error('Error generating smart agenda:', error);
    return {
      success: false,
      error: 'Failed to generate agenda'
    };
  }
}

/**
 * Build schedule for a single day using AI reasoning
 */
async function buildDaySchedule(
  date: string,
  dayNumber: number,
  favoritedSessions: any[],
  favoritedSpeakers: any[],
  allSessions: any[],
  user: any,
  options: AgendaOptions,
  userProfile?: UserProfile,
  profileCompleteness?: number
): Promise<DaySchedule & { reasoning?: ReasoningStep[] }> {
  // Filter sessions for this day
  const daySessions = allSessions.filter(session => {
    const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
    return sessionDate === date;
  });

  // Use provided profile or create one
  if (!userProfile) {
    userProfile = {
      id: user.id,
      name: user.name || '',
      role: user.role || '',
      company: user.company || '',
      organizationType: user.organizationType || '',
      interests: user.interests || [],
      goals: user.goals || [],
      yearsExperience: 0, // user.yearsExperience || 0 - not in user model
      usingSalesforce: user.usingSalesforce || false,
      interestedInSalesforce: user.interestedInSalesforce || false
    };
  }

  // Prepare AI context
  const aiContext: AgendaReasoningContext = {
    userProfile,
    favorites: user.favorites || [],
    allSessions: daySessions,
    constraints: {
      startTime: options.startTime,
      endTime: options.endTime,
      includeMeals: options.includeMeals,
      maxSessionsPerDay: options.maxSessionsPerDay,
      minimumBreakMinutes: options.minimumBreakMinutes,
      maximumWalkingMinutes: options.maximumWalkingMinutes,
      targetSessionsPerPeriod: {
        morning: 3,
        afternoon: 3,
        evening: 1
      }
    },
    dayNumber,
    date
  };

  // Use provided profile completeness or calculate it
  if (profileCompleteness === undefined) {
    profileCompleteness = calculateProfileCompleteness(userProfile);
  }

  // Use AI reasoning if profile is sufficiently complete
  let aiResult: AgendaReasoningResult | null = null;
  let reasoning: ReasoningStep[] = [];

  if (profileCompleteness >= 40) {
    try {
      console.log(`Using AI reasoning for day ${dayNumber} (profile ${profileCompleteness}% complete)`);
      aiResult = await generateIntelligentAgenda(aiContext);
      reasoning = aiResult.reasoning;
    } catch (error) {
      console.error('AI reasoning failed, falling back to rule-based algorithm:', error);
    }
  }

  // If AI reasoning succeeded and returned a schedule, use it
  if (aiResult && aiResult.schedule.length > 0) {
    return {
      date,
      dayNumber,
      schedule: aiResult.schedule,
      stats: calculateDayStats(aiResult.schedule, date, options),
      reasoning
    };
  }

  // Otherwise, fall back to the original algorithm
  console.log(`Using rule-based algorithm for day ${dayNumber}`);
  const schedule: ScheduleItem[] = [];

  // Filter favorited sessions for this day
  const dayFavorites = favoritedSessions.filter(session => {
    const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
    return sessionDate === date;
  });

  // Sort by start time
  dayFavorites.sort((a, b) =>
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Add meal breaks if requested
  if (options.includeMeals) {
    // Check for networking meals in sessions
    const breakfastSession = findMealSession(daySessions, 'breakfast');
    const lunchSession = findMealSession(daySessions, 'lunch');

    if (breakfastSession) {
      schedule.push(createSessionItem(breakfastSession, 'user-favorite',
        dayFavorites.includes(breakfastSession)));
    } else {
      schedule.push(createMealBreak('breakfast', date));
    }

    if (lunchSession) {
      schedule.push(createSessionItem(lunchSession, 'user-favorite',
        dayFavorites.includes(lunchSession)));
    } else {
      schedule.push(createMealBreak('lunch', date));
    }
  }

  // Add favorited sessions
  for (const session of dayFavorites) {
    // Skip if it's a meal session we already added
    if (isMealSession(session)) continue;

    const item = createSessionItem(session, 'user-favorite', true);
    schedule.push(item);
  }

  // Find sessions with favorited speakers
  const speakerSessions = daySessions.filter(session => {
    return session.speakers?.some((s: any) =>
      favoritedSpeakers.some(speaker => speaker.id === s.speaker.id)
    );
  });

  // Add speaker sessions that don't conflict
  for (const session of speakerSessions) {
    if (!dayFavorites.includes(session) && !hasTimeConflict(schedule, session)) {
      const item = createSessionItem(session, 'ai-suggested', false);
      item.aiMetadata = {
        confidence: 90,
        reasoning: `Features your favorited speaker: ${session.speakers[0].speaker.name}`,
        matchScore: 0.9,
        similarityToFavorites: 0.8,
        method: 'keyword-match'
      };
      schedule.push(item);
    }
  }

  // Sort schedule by time
  schedule.sort((a, b) => {
    const timeA = new Date(`${date} ${a.time}`).getTime();
    const timeB = new Date(`${date} ${b.time}`).getTime();
    return timeA - timeB;
  });

  // Find gaps and fill with AI suggestions
  const gaps = findScheduleGaps(schedule, date, options);

  for (const gap of gaps) {
    const suggestion = await findBestSessionForGap(
      gap,
      schedule,
      daySessions,
      user,
      options
    );

    if (suggestion) {
      schedule.push(suggestion);
    }
  }

  // Final sort
  schedule.sort((a, b) => {
    const timeA = new Date(`${date} ${a.time}`).getTime();
    const timeB = new Date(`${date} ${b.time}`).getTime();
    return timeA - timeB;
  });

  // Add travel time blocks where needed
  const scheduleWithTravel = addTravelTimeBlocks(schedule, date);

  // Calculate stats
  const stats = calculateDayStats(scheduleWithTravel, date, options);

  return {
    date,
    dayNumber,
    schedule: scheduleWithTravel,
    stats
  };
}

/**
 * Calculate profile completeness score
 */
function calculateProfileCompleteness(profile: UserProfile): number {
  const weights = {
    name: 5,
    role: 15,
    company: 10,
    organizationType: 10,
    interests: 25,
    goals: 20,
    yearsExperience: 5,
    usingSalesforce: 5,
    interestedInSalesforce: 5
  };

  let score = 0;

  if (profile.name) score += weights.name;
  if (profile.role) score += weights.role;
  if (profile.company) score += weights.company;
  if (profile.organizationType) score += weights.organizationType;
  if (profile.interests && profile.interests.length > 0) {
    score += Math.min(weights.interests, (profile.interests.length / 5) * weights.interests);
  }
  if (profile.goals && profile.goals.length > 0) {
    score += Math.min(weights.goals, (profile.goals.length / 3) * weights.goals);
  }
  if (profile.yearsExperience > 0) score += weights.yearsExperience;
  score += weights.usingSalesforce;
  score += weights.interestedInSalesforce;

  return Math.round(score);
}

/**
 * Calculate day statistics
 */
function calculateDayStats(
  schedule: ScheduleItem[],
  date: string,
  options: AgendaOptions
): DaySchedule['stats'] {
  return {
    totalSessions: schedule.filter(i => i.type === 'session').length,
    favoritesCovered: schedule.filter(i => i.source === 'user-favorite').length,
    aiSuggestions: schedule.filter(i => i.source === 'ai-suggested').length,
    walkingMinutes: schedule.filter(i => i.type === 'travel')
      .reduce((sum, i) => sum + parseInt(i.item.description || '0'), 0),
    breakMinutes: schedule.filter(i => i.type === 'break' || i.type === 'meal')
      .reduce((sum, i) => {
        const start = new Date(`${date} ${i.time}`);
        const end = new Date(`${date} ${i.endTime}`);
        return sum + (end.getTime() - start.getTime()) / 60000;
      }, 0),
    mealsCovered: options.includeMeals
  };
}

/**
 * Create a schedule item from a session
 */
function createSessionItem(
  session: any,
  source: 'user-favorite' | 'ai-suggested',
  isFavorite: boolean
): ScheduleItem {
  const startTime = new Date(session.startTime);
  const endTime = new Date(session.endTime);

  return {
    id: `session-${session.id}`,
    time: formatTime(startTime),
    endTime: formatTime(endTime),
    type: 'session',
    source: isFavorite ? 'user-favorite' : source,
    item: {
      id: session.id,
      title: session.title,
      description: session.description,
      location: session.location,
      speakers: session.speakers,
      track: session.track
    },
    actions: {
      canRemove: source !== 'user-favorite',
      canReplace: source === 'ai-suggested',
      canMoveTime: false,
      alternatives: []
    }
  };
}

/**
 * Create a meal break
 */
function createMealBreak(
  type: 'breakfast' | 'lunch' | 'dinner',
  date: string
): ScheduleItem {
  const meal = MEAL_TIMES[type];

  return {
    id: `meal-${type}-${date}`,
    time: meal.start,
    endTime: meal.end,
    type: 'meal',
    source: 'system',
    item: {
      id: `${type}-${date}`,
      title: meal.title,
      description: 'Time to refuel and network',
      location: 'Various locations'
    },
    actions: {
      canRemove: true,
      canReplace: false,
      canMoveTime: true,
      alternatives: []
    }
  };
}

/**
 * Find meal sessions (breakfast, lunch sessions)
 */
function findMealSession(sessions: any[], mealType: string): any | null {
  return sessions.find(session => {
    const title = session.title.toLowerCase();
    return title.includes(mealType) ||
           (mealType === 'breakfast' && title.includes('kickoff')) ||
           (mealType === 'lunch' && title.includes('luncheon'));
  });
}

/**
 * Check if a session is a meal session
 */
function isMealSession(session: any): boolean {
  const title = session.title.toLowerCase();
  return title.includes('breakfast') ||
         title.includes('lunch') ||
         title.includes('dinner') ||
         title.includes('reception');
}

/**
 * Check for time conflicts
 */
function hasTimeConflict(schedule: ScheduleItem[], session: any): boolean {
  const sessionStart = new Date(session.startTime).getTime();
  const sessionEnd = new Date(session.endTime).getTime();

  return schedule.some(item => {
    if (item.type !== 'session') return false;

    const itemStart = new Date(session.startTime).getTime();
    const itemEnd = new Date(session.endTime).getTime();

    return (sessionStart < itemEnd && sessionEnd > itemStart);
  });
}

/**
 * Find gaps in the schedule
 */
function findScheduleGaps(
  schedule: ScheduleItem[],
  date: string,
  options: AgendaOptions
): TimeSlot[] {
  const gaps: TimeSlot[] = [];
  const startOfDay = new Date(`${date} ${options.startTime}`);
  const endOfDay = new Date(`${date} ${options.endTime}`);

  // Sort schedule by time
  const sorted = [...schedule].sort((a, b) => {
    const timeA = new Date(`${date} ${a.time}`).getTime();
    const timeB = new Date(`${date} ${b.time}`).getTime();
    return timeA - timeB;
  });

  // Check gap at start of day
  if (sorted.length > 0) {
    const firstItem = new Date(`${date} ${sorted[0].time}`);
    if (firstItem.getTime() - startOfDay.getTime() > 60 * 60 * 1000) { // > 1 hour
      gaps.push({
        startTime: startOfDay,
        endTime: firstItem,
        available: true
      });
    }
  }

  // Check gaps between items
  for (let i = 0; i < sorted.length - 1; i++) {
    const currentEnd = new Date(`${date} ${sorted[i].endTime}`);
    const nextStart = new Date(`${date} ${sorted[i + 1].time}`);

    const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / 60000;

    if (gapMinutes > 60) { // > 1 hour gap
      gaps.push({
        startTime: currentEnd,
        endTime: nextStart,
        available: true
      });
    }
  }

  // Check gap at end of day
  if (sorted.length > 0) {
    const lastItem = new Date(`${date} ${sorted[sorted.length - 1].endTime}`);
    if (endOfDay.getTime() - lastItem.getTime() > 60 * 60 * 1000) { // > 1 hour
      gaps.push({
        startTime: lastItem,
        endTime: endOfDay,
        available: true
      });
    }
  }

  return gaps;
}

/**
 * Find the best session to fill a gap using AI
 */
async function findBestSessionForGap(
  gap: TimeSlot,
  currentSchedule: ScheduleItem[],
  availableSessions: any[],
  user: any,
  options: AgendaOptions
): Promise<ScheduleItem | null> {
  // Filter sessions that fit in the gap
  const candidateSessions = availableSessions.filter(session => {
    const sessionStart = new Date(session.startTime);
    const sessionEnd = new Date(session.endTime);

    // Check if it fits in the gap
    if (sessionStart < gap.startTime || sessionEnd > gap.endTime) {
      return false;
    }

    // Check if already in schedule
    if (currentSchedule.some(item =>
      item.type === 'session' && item.item.id === session.id
    )) {
      return false;
    }

    // Check track preferences
    if (options.avoidTracks.length > 0 &&
        options.avoidTracks.includes(session.track)) {
      return false;
    }

    return true;
  });

  if (candidateSessions.length === 0) {
    return null;
  }

  // Use vector search to find best match
  let bestSession = null;
  let bestScore = 0;
  let bestReasoning = '';

  // Create enhanced search query based on user profile
  const profileKeywords = [];

  // Add interests
  if (user.interests?.length > 0) {
    profileKeywords.push(...user.interests);
  }

  // Add goals
  if (user.goals?.length > 0) {
    profileKeywords.push(...user.goals);
  }

  // Add role-specific keywords
  if (user.role) {
    profileKeywords.push(user.role);
    // Add role-specific interests
    if (user.role.includes('Executive')) {
      profileKeywords.push('strategy', 'leadership', 'transformation');
    } else if (user.role.includes('Developer') || user.role.includes('Engineer')) {
      profileKeywords.push('technical', 'implementation', 'architecture');
    } else if (user.role.includes('Product')) {
      profileKeywords.push('product strategy', 'user experience', 'roadmap');
    }
  }

  // Add organization-specific keywords
  if (user.organizationType) {
    profileKeywords.push(user.organizationType);
    if (user.organizationType === 'Carrier') {
      profileKeywords.push('underwriting', 'claims', 'risk');
    } else if (user.organizationType === 'Broker') {
      profileKeywords.push('distribution', 'sales', 'customer');
    } else if (user.organizationType === 'InsurTech') {
      profileKeywords.push('innovation', 'disruption', 'digital');
    }
  }

  const searchQuery = profileKeywords.length > 0
    ? profileKeywords.join(' ')
    : 'insurance technology innovation';

  // Simple keyword-based scoring instead of expensive vector search
  for (const candidate of candidateSessions) {
    let score = 0;
    const matchedKeywords = [];

    // Convert session text to lowercase for matching
    const sessionText = `${candidate.title} ${candidate.description} ${candidate.track}`.toLowerCase();

    // Score based on interests
    if (user.interests?.length > 0) {
      for (const interest of user.interests) {
        if (sessionText.includes(interest.toLowerCase())) {
          score += 3;
          matchedKeywords.push(interest);
        }
      }
    }

    // Score based on goals
    if (user.goals?.length > 0) {
      for (const goal of user.goals) {
        if (sessionText.includes(goal.toLowerCase())) {
          score += 2;
          matchedKeywords.push(goal);
        }
      }
    }

    // Score based on role
    if (user.role && sessionText.includes(user.role.toLowerCase())) {
      score += 2;
    }

    // Score based on organization type
    if (user.organizationType && sessionText.includes(user.organizationType.toLowerCase())) {
      score += 1;
    }

    // Bonus for favorited speakers
    if (user.favorites?.length > 0) {
      const favoritedSpeakerIds = user.favorites
        .filter((f: any) => f.type === 'speaker')
        .map((f: any) => f.speakerId);

      if (candidate.speakers?.some((s: any) => favoritedSpeakerIds.includes(s.speakerId))) {
        score += 5;
        matchedKeywords.push('favorite speaker');
      }
    }

    // Update best if this is better
    if (score > bestScore) {
      bestSession = candidate;
      bestScore = score;

      // Build personalized reasoning
      const reasoningParts = [];
      if (matchedKeywords.length > 0) {
        reasoningParts.push(`matches ${matchedKeywords.slice(0, 3).join(', ')}`);
      }
      if (user.role && sessionText.includes(user.role.toLowerCase())) {
        reasoningParts.push(`relevant to ${user.role} role`);
      }

      bestReasoning = reasoningParts.length > 0
        ? reasoningParts.join(' and ')
        : 'Selected to fill schedule gap';
    }
  }

  // If no matches found based on scoring, pick the first available
  if (!bestSession && candidateSessions.length > 0) {
    bestSession = candidateSessions[0];
    bestScore = 0.1;
    bestReasoning = 'Selected to fill schedule gap';
  }

  if (!bestSession) {
    return null;
  }

  const item = createSessionItem(bestSession, 'ai-suggested', false);
  item.aiMetadata = {
    confidence: Math.round(bestScore * 100),
    reasoning: bestReasoning,
    matchScore: bestScore,
    similarityToFavorites: bestScore * 0.8,
    method: 'vector-similarity'
  };

  // Find alternatives
  const alternatives = candidateSessions
    .filter(s => s.id !== bestSession.id)
    .slice(0, 3)
    .map(s => ({
      id: s.id,
      title: s.title,
      confidence: 70,
      reasoning: 'Alternative option'
    }));

  if (item.actions) {
    item.actions.alternatives = alternatives;
  }

  return item;
}

/**
 * Add travel time blocks between distant venues
 */
function addTravelTimeBlocks(
  schedule: ScheduleItem[],
  date: string
): ScheduleItem[] {
  const result: ScheduleItem[] = [];

  for (let i = 0; i < schedule.length; i++) {
    result.push(schedule[i]);

    if (i < schedule.length - 1) {
      const current = schedule[i];
      const next = schedule[i + 1];

      if (current.type === 'session' && next.type === 'session') {
        const currentLocation = current.item.location || 'TBD';
        const nextLocation = next.item.location || 'TBD';

        const distance = calculateVenueDistance(currentLocation, nextLocation);

        if (distance.walkingMinutes > 5) {
          // Add travel block
          result.push({
            id: `travel-${i}`,
            time: current.endTime,
            endTime: next.time,
            type: 'travel',
            source: 'system',
            item: {
              id: `travel-${i}`,
              title: 'Travel Time',
              description: `${distance.walkingMinutes} minute walk`,
              location: `${currentLocation} → ${nextLocation}`
            },
            actions: {
              canRemove: false,
              canReplace: false,
              canMoveTime: false,
              alternatives: []
            }
          });
        }
      }
    }
  }

  return result;
}

// Conflict detection moved to conflict-resolver.ts
// Using detectScheduleConflicts from conflict-resolver module

/**
 * Calculate overall confidence score
 */
function calculateOverallConfidence(days: DaySchedule[]): number {
  let totalConfidence = 0;
  let aiCount = 0;

  for (const day of days) {
    for (const item of day.schedule) {
      if (item.aiMetadata && item.aiMetadata.confidence) {
        totalConfidence += item.aiMetadata.confidence;
        aiCount++;
      }
    }
  }

  return aiCount > 0 ? Math.round(totalConfidence / aiCount) : 100;
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}