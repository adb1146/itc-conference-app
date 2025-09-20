/**
 * Personalization Engine
 * Tailors search results based on user preferences, history, and behavior
 */

import prisma from '@/lib/db';
import { EnhancedResult } from './result-enhancer';

export interface UserProfile {
  id: string;
  email?: string;
  name?: string;
  interests?: string[];
  role?: string;
  company?: string;
  industry?: string;
  experience_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  preferred_tracks?: string[];
  preferred_times?: string[];
  preferred_session_types?: string[];
  avoided_topics?: string[];
  language_preference?: string;
  accessibility_needs?: string[];
}

export interface UserHistory {
  user_id: string;
  scheduled_sessions?: string[];
  attended_sessions?: string[];
  favorited_sessions?: string[];
  viewed_sessions?: string[];
  registered_sessions?: string[];
  search_history?: SearchHistoryItem[];
  feedback_history?: FeedbackItem[];
}

export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  clicked_results?: string[];
  search_type?: string;
}

export interface FeedbackItem {
  session_id: string;
  rating?: number;
  helpful?: boolean;
  tags?: string[];
  comment?: string;
  timestamp: Date;
}

export interface PersonalizationContext {
  profile?: UserProfile;
  history?: UserHistory;
  current_time?: Date;
  location?: string;
  device_type?: string;
}

// Cache for user profiles to avoid repeated DB queries
const profileCache = new Map<string, { profile: UserProfile; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Main personalization function
 */
export async function personalizeResults(
  results: EnhancedResult[],
  userId?: string,
  context?: Partial<PersonalizationContext>
): Promise<EnhancedResult[]> {
  if (!userId || results.length === 0) {
    return results;
  }

  try {
    // Get full personalization context
    const fullContext = await getPersonalizationContext(userId, context);

    // Apply various personalization strategies
    let personalizedResults = [...results];

    // 1. Interest-based personalization
    personalizedResults = applyInterestPersonalization(personalizedResults, fullContext);

    // 2. Role and experience level matching
    personalizedResults = applyRolePersonalization(personalizedResults, fullContext);

    // 3. Historical behavior personalization
    personalizedResults = applyHistoricalPersonalization(personalizedResults, fullContext);

    // 4. Time and schedule preference
    personalizedResults = applyTimePersonalization(personalizedResults, fullContext);

    // 5. Social and collaborative filtering
    personalizedResults = await applySocialPersonalization(personalizedResults, fullContext);

    // 6. Negative preference filtering
    personalizedResults = applyNegativeFiltering(personalizedResults, fullContext);

    // 7. Calculate composite personalization scores
    personalizedResults = calculateCompositeScores(personalizedResults);

    return personalizedResults;
  } catch (error) {
    console.error('Personalization error:', error);
    return results; // Return unpersonalized results on error
  }
}

/**
 * Get complete personalization context for a user
 */
async function getPersonalizationContext(
  userId: string,
  partialContext?: Partial<PersonalizationContext>
): Promise<PersonalizationContext> {
  const profile = await getUserProfile(userId);
  const history = await getUserHistory(userId);

  return {
    profile,
    history,
    current_time: new Date(),
    ...partialContext
  };
}

/**
 * Get user profile with caching
 */
export async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  // Check cache first
  const cached = profileCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.profile;
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        preferences: true,
        agenda: {
          include: {
            sessions: true
          }
        }
      }
    });

    if (!user) return undefined;

    // Build profile from user data
    const profile: UserProfile = {
      id: user.id,
      email: user.email || undefined,
      name: user.name || undefined,
      interests: user.preferences?.interests || [],
      role: user.preferences?.role || undefined,
      company: user.preferences?.company || undefined,
      industry: user.preferences?.industry || undefined,
      experience_level: user.preferences?.experienceLevel as UserProfile['experience_level'],
      preferred_tracks: user.preferences?.preferredTracks || [],
      preferred_times: user.preferences?.preferredTimes || [],
      preferred_session_types: user.preferences?.sessionTypes || [],
      avoided_topics: user.preferences?.avoidedTopics || [],
      language_preference: user.preferences?.language || undefined,
      accessibility_needs: user.preferences?.accessibilityNeeds || []
    };

    // Update cache
    profileCache.set(userId, { profile, timestamp: Date.now() });

    return profile;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return undefined;
  }
}

/**
 * Get user history and activity
 */
async function getUserHistory(userId: string): Promise<UserHistory | undefined> {
  try {
    const [agenda, activities] = await Promise.all([
      prisma.agenda.findFirst({
        where: { userId },
        include: {
          sessions: {
            select: { sessionId: true }
          }
        }
      }),
      prisma.userActivity.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 100
      })
    ]);

    const history: UserHistory = {
      user_id: userId,
      scheduled_sessions: agenda?.sessions.map(s => s.sessionId) || [],
      viewed_sessions: activities
        .filter(a => a.action === 'view_session')
        .map(a => a.sessionId)
        .filter((id): id is string => id !== null),
      search_history: activities
        .filter(a => a.action === 'search')
        .map(a => ({
          query: a.data?.query || '',
          timestamp: a.timestamp,
          clicked_results: a.data?.clicked || []
        }))
    };

    return history;
  } catch (error) {
    console.error('Error fetching user history:', error);
    return undefined;
  }
}

/**
 * Apply interest-based personalization
 */
function applyInterestPersonalization(
  results: EnhancedResult[],
  context: PersonalizationContext
): EnhancedResult[] {
  if (!context.profile?.interests || context.profile.interests.length === 0) {
    return results;
  }

  return results.map(result => {
    let interestScore = 0;
    const matchedInterests: string[] = [];

    context.profile!.interests!.forEach(interest => {
      const interestLower = interest.toLowerCase();

      // Check various fields for interest matches
      if (result.title?.toLowerCase().includes(interestLower)) {
        interestScore += 0.3;
        matchedInterests.push(interest);
      }
      if (result.description?.toLowerCase().includes(interestLower)) {
        interestScore += 0.2;
        if (!matchedInterests.includes(interest)) matchedInterests.push(interest);
      }
      if (result.tags?.some(tag => tag.toLowerCase().includes(interestLower))) {
        interestScore += 0.15;
        if (!matchedInterests.includes(interest)) matchedInterests.push(interest);
      }
      if (result.track?.toLowerCase().includes(interestLower)) {
        interestScore += 0.1;
        if (!matchedInterests.includes(interest)) matchedInterests.push(interest);
      }
    });

    if (matchedInterests.length > 0) {
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push(`Matches your interests: ${matchedInterests.join(', ')}`);
    }

    result.personalizedScore = (result.personalizedScore || 0.5) + interestScore;
    return result;
  });
}

/**
 * Apply role and experience level personalization
 */
function applyRolePersonalization(
  results: EnhancedResult[],
  context: PersonalizationContext
): EnhancedResult[] {
  if (!context.profile?.role && !context.profile?.experience_level) {
    return results;
  }

  return results.map(result => {
    let roleScore = 0;

    // Role matching
    if (context.profile?.role) {
      const roleLower = context.profile.role.toLowerCase();

      // Direct role mention
      if (result.title?.toLowerCase().includes(roleLower) ||
          result.description?.toLowerCase().includes(roleLower)) {
        roleScore += 0.25;
        result.personalizedReasons = result.personalizedReasons || [];
        result.personalizedReasons.push(`Relevant to ${context.profile.role}s`);
      }

      // Track alignment with role
      const roleTrackMap: Record<string, string[]> = {
        'executive': ['Leadership', 'Strategy', 'Executive'],
        'developer': ['Technical', 'Development', 'Engineering'],
        'product': ['Product', 'Innovation', 'Customer Experience'],
        'sales': ['Sales', 'Distribution', 'Business Development'],
        'marketing': ['Marketing', 'Branding', 'Digital'],
        'operations': ['Operations', 'Process', 'Efficiency'],
        'underwriter': ['Underwriting', 'Risk', 'Actuarial'],
        'claims': ['Claims', 'Customer Service', 'Process']
      };

      const relevantTracks = roleTrackMap[roleLower] || [];
      if (relevantTracks.some(track => result.track?.includes(track))) {
        roleScore += 0.15;
      }
    }

    // Experience level matching
    if (context.profile?.experience_level && result.level) {
      const levelMap: Record<string, string[]> = {
        'beginner': ['beginner', 'introductory', '101', 'basics'],
        'intermediate': ['intermediate', 'practitioner'],
        'advanced': ['advanced', 'expert', 'deep dive'],
        'expert': ['expert', 'master', 'advanced']
      };

      const expectedLevels = levelMap[context.profile.experience_level] || [];
      if (expectedLevels.some(level => result.level.toLowerCase().includes(level))) {
        roleScore += 0.15;
        result.personalizedReasons = result.personalizedReasons || [];
        result.personalizedReasons.push(`Matches your ${context.profile.experience_level} level`);
      }
    }

    result.personalizedScore = (result.personalizedScore || 0.5) + roleScore;
    return result;
  });
}

/**
 * Apply historical behavior personalization
 */
function applyHistoricalPersonalization(
  results: EnhancedResult[],
  context: PersonalizationContext
): EnhancedResult[] {
  if (!context.history) {
    return results;
  }

  return results.map(result => {
    let historyScore = 0;

    // Check if already scheduled
    if (context.history!.scheduled_sessions?.includes(result.id)) {
      result.personalizedScore = Math.max((result.personalizedScore || 0.5) - 0.5, 0);
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push('⚠️ Already in your schedule');
      return result;
    }

    // Boost if previously viewed (shows interest)
    if (context.history!.viewed_sessions?.includes(result.id)) {
      historyScore += 0.1;
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push('Previously viewed');
    }

    // Boost if similar to attended sessions
    const similarityBoost = calculateSimilarityToHistory(result, context.history!);
    if (similarityBoost > 0) {
      historyScore += similarityBoost;
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push('Similar to sessions you\'ve shown interest in');
    }

    result.personalizedScore = (result.personalizedScore || 0.5) + historyScore;
    return result;
  });
}

/**
 * Apply time-based personalization
 */
function applyTimePersonalization(
  results: EnhancedResult[],
  context: PersonalizationContext
): EnhancedResult[] {
  if (!context.profile?.preferred_times || context.profile.preferred_times.length === 0) {
    return results;
  }

  return results.map(result => {
    if (!result.startTime) return result;

    const sessionHour = new Date(result.startTime).getHours();
    const timeSlot = getTimeSlot(sessionHour);

    if (context.profile!.preferred_times!.includes(timeSlot)) {
      result.personalizedScore = (result.personalizedScore || 0.5) + 0.1;
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push('At your preferred time');
    }

    return result;
  });
}

/**
 * Apply social/collaborative filtering
 */
async function applySocialPersonalization(
  results: EnhancedResult[],
  context: PersonalizationContext
): Promise<EnhancedResult[]> {
  // This would typically involve finding similar users and their preferences
  // For now, we'll use a simplified approach based on role and company

  if (!context.profile?.role && !context.profile?.company) {
    return results;
  }

  try {
    // Find popular sessions among similar users
    const similarUserSessions = await prisma.agendaSession.groupBy({
      by: ['sessionId'],
      where: {
        agenda: {
          user: {
            preferences: {
              OR: [
                { role: context.profile.role },
                { company: context.profile.company }
              ]
            }
          }
        }
      },
      _count: {
        sessionId: true
      },
      having: {
        sessionId: {
          _count: {
            gt: 2 // At least 3 similar users have this session
          }
        }
      }
    });

    const popularAmongPeers = new Set(similarUserSessions.map(s => s.sessionId));

    return results.map(result => {
      if (popularAmongPeers.has(result.id)) {
        result.personalizedScore = (result.personalizedScore || 0.5) + 0.15;
        result.personalizedReasons = result.personalizedReasons || [];
        result.personalizedReasons.push('Popular among your peers');
      }
      return result;
    });
  } catch (error) {
    console.error('Social personalization error:', error);
    return results;
  }
}

/**
 * Apply negative filtering based on avoided topics
 */
function applyNegativeFiltering(
  results: EnhancedResult[],
  context: PersonalizationContext
): EnhancedResult[] {
  if (!context.profile?.avoided_topics || context.profile.avoided_topics.length === 0) {
    return results;
  }

  return results.map(result => {
    const avoidedFound = context.profile!.avoided_topics!.some(topic =>
      result.title?.toLowerCase().includes(topic.toLowerCase()) ||
      result.description?.toLowerCase().includes(topic.toLowerCase()) ||
      result.tags?.some(tag => tag.toLowerCase().includes(topic.toLowerCase()))
    );

    if (avoidedFound) {
      result.personalizedScore = Math.max((result.personalizedScore || 0.5) - 0.3, 0);
      result.personalizedReasons = result.personalizedReasons || [];
      result.personalizedReasons.push('⚠️ Contains topics you prefer to avoid');
    }

    return result;
  });
}

/**
 * Calculate final composite personalization scores
 */
function calculateCompositeScores(results: EnhancedResult[]): EnhancedResult[] {
  return results.map(result => {
    // Ensure personalized score is within bounds
    result.personalizedScore = Math.min(Math.max(result.personalizedScore || 0.5, 0), 1);

    // Update final score if it exists
    if (result.finalScore !== undefined) {
      // Recalculate with updated personalization score
      result.finalScore = (
        (result.relevanceScore || 0.5) * 0.40 +
        (result.personalizedScore || 0.5) * 0.25 +
        (result.qualityScore || 0.5) * 0.20 +
        (result.recencyScore || 0.5) * 0.10 +
        (result.popularityScore || 0.5) * 0.05
      );
    }

    return result;
  });
}

/**
 * Calculate similarity between a result and user's history
 */
function calculateSimilarityToHistory(
  result: EnhancedResult,
  history: UserHistory
): number {
  // Simple tag-based similarity
  // In production, this could use more sophisticated methods like embedding similarity

  if (!history.viewed_sessions || history.viewed_sessions.length === 0) {
    return 0;
  }

  // This is simplified - in reality, we'd fetch the tags of historical sessions
  // and compare them with the current result
  return 0;
}

/**
 * Get time slot for an hour
 */
function getTimeSlot(hour: number): string {
  if (hour < 9) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'afternoon';
  if (hour < 19) return 'evening';
  return 'late_evening';
}