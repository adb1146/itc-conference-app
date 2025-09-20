/**
 * Result Enhancement and Reranking System
 * Improves search result quality through intelligent scoring and filtering
 */

import { Session } from '@prisma/client';

export interface EnhancedResult extends Partial<Session> {
  id: string;
  title: string;
  description?: string | null;
  vectorScore?: number;
  relevanceScore?: number;
  personalizedScore?: number;
  recencyScore?: number;
  popularityScore?: number;
  qualityScore?: number;
  finalScore?: number;
  personalizedReasons?: string[];
  enrichments?: ResultEnrichments;
  speaker_name?: string;
  speaker_company?: string;
  tags?: string[];
  track?: string | null;
  location?: string | null;
  startTime?: Date | string | null;
  endTime?: Date | string | null;
  meal_type?: string;
  rating?: number;
  expected_attendance?: number;
  registration_count?: number;
}

export interface ResultEnrichments {
  speaker_details?: any;
  related_sessions?: any[];
  availability?: SessionAvailability;
  location_details?: LocationDetails;
  walking_time_from_main?: number;
  status?: 'upcoming' | 'live' | 'completed';
  time_until_start?: string;
  dietary_info?: string[];
}

export interface SessionAvailability {
  total_capacity: number;
  spots_remaining: number;
  is_full: boolean;
  waitlist_available: boolean;
}

export interface LocationDetails {
  building: string;
  floor: string;
  room: string;
  walking_directions: string;
  nearest_restroom: string;
  nearest_exit: string;
}

export interface UserContext {
  id?: string;
  interests?: string[];
  role?: string;
  experience_level?: string;
  scheduled_sessions?: string[];
  attended_sessions?: string[];
  preferred_times?: string[];
  preferred_tracks?: string[];
  company?: string;
  industry?: string;
}

/**
 * Main reranking function that applies multiple scoring algorithms
 */
export async function rerankResults(
  rawResults: any[],
  query: string,
  userContext?: UserContext
): Promise<EnhancedResult[]> {
  if (!rawResults || rawResults.length === 0) {
    return [];
  }

  // Calculate all scores for each result
  const scoredResults = rawResults.map(result => ({
    ...result,
    relevanceScore: calculateRelevanceScore(result, query),
    personalizedScore: userContext ? calculatePersonalizationScore(result, userContext) : 0.5,
    recencyScore: calculateRecencyScore(result),
    popularityScore: calculatePopularityScore(result),
    qualityScore: calculateQualityScore(result)
  }));

  // Calculate final weighted score
  const rerankedResults = scoredResults.map(result => {
    // Weights: relevance 40%, personalization 25%, quality 20%, recency 10%, popularity 5%
    const finalScore = (
      (result.relevanceScore * 0.40) +
      (result.personalizedScore * 0.25) +
      (result.qualityScore * 0.20) +
      (result.recencyScore * 0.10) +
      (result.popularityScore * 0.05)
    );

    return {
      ...result,
      finalScore
    };
  });

  // Sort by final score and filter low-quality results
  return rerankedResults
    .sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0))
    .filter(result => result.qualityScore > 0.3) // Filter out very low quality
    .slice(0, 20); // Limit to top 20 results
}

/**
 * Calculate relevance score based on query matching
 */
export function calculateRelevanceScore(result: any, query: string): number {
  let score = result.vectorScore || result.score || 0.5; // Base vector similarity

  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
  const titleLower = (result.title || '').toLowerCase();
  const descLower = (result.description || '').toLowerCase();

  // Boost exact phrase matches
  if (titleLower.includes(queryLower)) {
    score += 0.3;
  } else if (descLower.includes(queryLower)) {
    score += 0.15;
  }

  // Boost individual keyword matches
  queryWords.forEach(word => {
    if (titleLower.includes(word)) score += 0.1;
    if (descLower.includes(word)) score += 0.05;
    if (result.tags?.some((tag: string) => tag.toLowerCase().includes(word))) score += 0.05;
  });

  // Special boosting for specific query types
  if (queryLower.includes('keynote') && result.tags?.includes('keynote')) {
    score += 0.25;
  }

  if (queryLower.includes('lunch') && (result.meal_type === 'lunch' || titleLower.includes('lunch'))) {
    score += 0.2;
  }

  if (queryLower.includes('networking') && (result.tags?.includes('networking') || titleLower.includes('network'))) {
    score += 0.15;
  }

  // Track-based boosting
  if (result.track && queryWords.some(word => result.track.toLowerCase().includes(word))) {
    score += 0.1;
  }

  // Speaker name matching
  const speakerName = (result.speaker_name || '').toLowerCase();
  if (speakerName && queryWords.some(word => speakerName.includes(word))) {
    score += 0.2;
  }

  return Math.min(score, 1.0);
}

/**
 * Calculate personalization score based on user context
 */
export function calculatePersonalizationScore(result: any, userContext: UserContext): number {
  if (!userContext) return 0.5;

  let score = 0.5; // Base score
  const reasons: string[] = [];

  // Interest matching
  if (userContext.interests && userContext.interests.length > 0) {
    const matchingInterests = userContext.interests.filter(interest =>
      result.tags?.some((tag: string) => tag.toLowerCase().includes(interest.toLowerCase())) ||
      result.description?.toLowerCase().includes(interest.toLowerCase()) ||
      result.title?.toLowerCase().includes(interest.toLowerCase())
    );

    if (matchingInterests.length > 0) {
      score += 0.3 * (matchingInterests.length / userContext.interests.length);
      reasons.push(`Matches your interests: ${matchingInterests.join(', ')}`);
    }
  }

  // Role relevance
  if (userContext.role) {
    const roleLower = userContext.role.toLowerCase();
    if (result.track?.toLowerCase().includes(roleLower) ||
        result.tags?.some((tag: string) => tag.toLowerCase().includes(roleLower))) {
      score += 0.2;
      reasons.push('Relevant to your role');
    }
  }

  // Avoid scheduling conflicts
  if (userContext.scheduled_sessions?.includes(result.id)) {
    score -= 0.5;
    reasons.push('Already in your schedule');
  }

  // Track preferences
  if (userContext.preferred_tracks && result.track) {
    if (userContext.preferred_tracks.includes(result.track)) {
      score += 0.15;
      reasons.push('From your preferred track');
    }
  }

  // Time preferences
  if (userContext.preferred_times && result.startTime) {
    const sessionHour = new Date(result.startTime).getHours();
    const timeSlot = getTimeSlot(sessionHour);
    if (userContext.preferred_times.includes(timeSlot)) {
      score += 0.1;
      reasons.push('At your preferred time');
    }
  }

  // Industry matching
  if (userContext.industry && result.tags?.some((tag: string) =>
      tag.toLowerCase().includes(userContext.industry.toLowerCase()))) {
    score += 0.1;
    reasons.push('Relevant to your industry');
  }

  // Store reasons for display
  if (reasons.length > 0) {
    result.personalizedReasons = reasons;
  }

  return Math.min(Math.max(score, 0), 1.0);
}

/**
 * Calculate recency score based on session timing
 */
export function calculateRecencyScore(result: any): number {
  if (!result.startTime) return 0.5;

  const now = new Date();
  const sessionTime = new Date(result.startTime);
  const hoursUntilSession = (sessionTime.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Sessions already passed
  if (hoursUntilSession < 0) {
    return 0.1;
  }

  // Sessions happening now or very soon (within 2 hours)
  if (hoursUntilSession <= 2) {
    return 1.0;
  }

  // Sessions today (within 24 hours)
  if (hoursUntilSession <= 24) {
    return 0.9;
  }

  // Sessions tomorrow
  if (hoursUntilSession <= 48) {
    return 0.7;
  }

  // Sessions this week
  if (hoursUntilSession <= 168) {
    return 0.5;
  }

  // Far future sessions
  return 0.3;
}

/**
 * Calculate popularity score based on engagement metrics
 */
export function calculatePopularityScore(result: any): number {
  let score = 0.5; // Base score

  // Registration count
  if (result.registration_count) {
    if (result.registration_count > 200) score += 0.2;
    else if (result.registration_count > 100) score += 0.15;
    else if (result.registration_count > 50) score += 0.1;
  }

  // Expected attendance
  if (result.expected_attendance) {
    if (result.expected_attendance > 100) score += 0.15;
    else if (result.expected_attendance > 50) score += 0.1;
  }

  // Session rating
  if (result.rating) {
    if (result.rating >= 4.5) score += 0.2;
    else if (result.rating >= 4.0) score += 0.1;
  }

  // Keynote or special sessions
  if (result.tags?.includes('keynote')) score += 0.15;
  if (result.tags?.includes('featured')) score += 0.1;
  if (result.tags?.includes('sponsored')) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Calculate quality score based on content completeness
 */
export function calculateQualityScore(result: any): number {
  let score = 0.3; // Base score

  // Content completeness
  if (result.description && result.description.length > 100) score += 0.15;
  if (result.description && result.description.length > 300) score += 0.1;

  // Speaker information
  if (result.speaker_name) score += 0.1;
  if (result.speaker_company) score += 0.05;
  if (result.speakers?.length > 1) score += 0.05; // Panel discussions

  // Location and timing
  if (result.location) score += 0.05;
  if (result.startTime && result.endTime) score += 0.05;

  // Tags and categorization
  if (result.tags && result.tags.length > 0) score += 0.05;
  if (result.tags && result.tags.length > 3) score += 0.05;
  if (result.track) score += 0.05;

  // Session level/difficulty
  if (result.level) score += 0.05;

  // Special content indicators
  if (result.has_video) score += 0.05;
  if (result.has_slides) score += 0.05;
  if (result.has_demo) score += 0.05;

  return Math.min(score, 1.0);
}

/**
 * Get time slot for a given hour
 */
function getTimeSlot(hour: number): string {
  if (hour < 9) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 14) return 'lunch';
  if (hour < 17) return 'afternoon';
  if (hour < 19) return 'evening';
  return 'late_evening';
}

/**
 * Filter results by minimum quality threshold
 */
export function filterLowQualityResults(
  results: EnhancedResult[],
  minQualityScore: number = 0.4
): EnhancedResult[] {
  return results.filter(r => (r.qualityScore || 0) >= minQualityScore);
}

/**
 * Deduplicate results based on similarity
 */
export function deduplicateResults(results: EnhancedResult[]): EnhancedResult[] {
  const seen = new Set<string>();
  const deduped: EnhancedResult[] = [];

  for (const result of results) {
    // Create a unique key based on title similarity
    const key = result.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 30);

    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(result);
    }
  }

  return deduped;
}

/**
 * Apply diversity boosting to avoid too similar results
 */
export function applyDiversityBoosting(results: EnhancedResult[]): EnhancedResult[] {
  const boosted = [...results];
  const trackCounts = new Map<string, number>();
  const speakerCounts = new Map<string, number>();

  // Penalize duplicate tracks and speakers
  boosted.forEach((result, index) => {
    if (result.track) {
      const trackCount = trackCounts.get(result.track) || 0;
      if (trackCount > 1) {
        result.finalScore = (result.finalScore || 0) * (1 - 0.1 * trackCount);
      }
      trackCounts.set(result.track, trackCount + 1);
    }

    if (result.speaker_name) {
      const speakerCount = speakerCounts.get(result.speaker_name) || 0;
      if (speakerCount > 1) {
        result.finalScore = (result.finalScore || 0) * (1 - 0.15 * speakerCount);
      }
      speakerCounts.set(result.speaker_name, speakerCount + 1);
    }
  });

  // Re-sort after diversity adjustments
  return boosted.sort((a, b) => (b.finalScore || 0) - (a.finalScore || 0));
}