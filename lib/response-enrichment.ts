/**
 * Response Enrichment System
 * Adds valuable context and information to search results
 */

import prisma from '@/lib/db';
import { EnhancedResult, ResultEnrichments, SessionAvailability, LocationDetails } from './result-enhancer';
import { searchSimilarSessions } from './vector-db';

// Cache for expensive enrichments
const speakerCache = new Map<string, any>();
const locationCache = new Map<string, LocationDetails>();
const relatedSessionsCache = new Map<string, any[]>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CachedData<T> {
  data: T;
  timestamp: number;
}

/**
 * Main enrichment function
 */
export async function enrichResults(
  results: EnhancedResult[],
  options?: {
    includeSpeakerDetails?: boolean;
    includeRelatedSessions?: boolean;
    includeAvailability?: boolean;
    includeLocationDetails?: boolean;
    includeDietaryInfo?: boolean;
    maxEnrichments?: number;
  }
): Promise<EnhancedResult[]> {
  const defaults = {
    includeSpeakerDetails: true,
    includeRelatedSessions: true,
    includeAvailability: true,
    includeLocationDetails: true,
    includeDietaryInfo: true,
    maxEnrichments: 10 // Limit enrichments for performance
  };

  const settings = { ...defaults, ...options };

  // Only enrich top results for performance
  const resultsToEnrich = results.slice(0, settings.maxEnrichments);
  const remainingResults = results.slice(settings.maxEnrichments);

  // Parallel enrichment for better performance
  const enrichmentPromises = resultsToEnrich.map(result =>
    enrichSingleResult(result, settings)
  );

  const enrichedResults = await Promise.all(enrichmentPromises);

  return [...enrichedResults, ...remainingResults];
}

/**
 * Enrich a single result with additional data
 */
async function enrichSingleResult(
  result: EnhancedResult,
  settings: any
): Promise<EnhancedResult> {
  const enrichments: ResultEnrichments = {};

  try {
    // Parallel fetching of enrichments
    const enrichmentTasks: Promise<void>[] = [];

    // Speaker details
    if (settings.includeSpeakerDetails && (result.speaker_name || result.speakers)) {
      enrichmentTasks.push(
        getSpeakerDetails(result).then(details => {
          enrichments.speaker_details = details;
        })
      );
    }

    // Related sessions
    if (settings.includeRelatedSessions) {
      enrichmentTasks.push(
        findRelatedSessions(result.id, 3).then(related => {
          enrichments.related_sessions = related;
        })
      );
    }

    // Session availability
    if (settings.includeAvailability) {
      enrichmentTasks.push(
        getSessionAvailability(result.id).then(availability => {
          enrichments.availability = availability;
        })
      );
    }

    // Location details
    if (settings.includeLocationDetails && result.location) {
      enrichmentTasks.push(
        getLocationDetails(result.location).then(details => {
          enrichments.location_details = details;
          enrichments.walking_time_from_main = calculateWalkingTime(result.location);
        })
      );
    }

    // Dietary information for meals
    if (settings.includeDietaryInfo && isMealSession(result)) {
      enrichmentTasks.push(
        getDietaryOptions(result).then(dietary => {
          enrichments.dietary_info = dietary;
        })
      );
    }

    // Wait for all enrichments to complete
    await Promise.all(enrichmentTasks);

    // Add timing information
    enrichments.status = getSessionStatus(result.startTime, result.endTime);
    enrichments.time_until_start = getTimeUntilStart(result.startTime);

  } catch (error) {
    console.error('Error enriching result:', error);
  }

  return {
    ...result,
    enrichments
  };
}

/**
 * Get detailed speaker information
 */
async function getSpeakerDetails(result: EnhancedResult): Promise<any> {
  try {
    // Check if we have speaker ID(s)
    const speakerIds = [];

    if (result.speakers && Array.isArray(result.speakers)) {
      speakerIds.push(...result.speakers.map(s => s.speaker?.id || s.id).filter(Boolean));
    }

    if (speakerIds.length === 0 && result.speaker_name) {
      // Try to find speaker by name
      const speaker = await prisma.speaker.findFirst({
        where: {
          name: {
            contains: result.speaker_name,
            mode: 'insensitive'
          }
        }
      });

      if (speaker) speakerIds.push(speaker.id);
    }

    if (speakerIds.length === 0) return null;

    // Check cache for all speakers
    const uncachedIds = [];
    const cachedSpeakers = [];

    for (const id of speakerIds) {
      const cached = getCachedData(speakerCache, id);
      if (cached) {
        cachedSpeakers.push(cached);
      } else {
        uncachedIds.push(id);
      }
    }

    // Fetch uncached speakers
    let fetchedSpeakers = [];
    if (uncachedIds.length > 0) {
      fetchedSpeakers = await prisma.speaker.findMany({
        where: {
          id: { in: uncachedIds }
        },
        include: {
          sessions: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  startTime: true
                }
              }
            },
            take: 5 // Limit related sessions
          }
        }
      });

      // Cache the fetched speakers
      fetchedSpeakers.forEach(speaker => {
        setCachedData(speakerCache, speaker.id, speaker);
      });
    }

    const allSpeakers = [...cachedSpeakers, ...fetchedSpeakers];

    // Format speaker details
    return allSpeakers.map(speaker => ({
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      company: speaker.company,
      bio: speaker.bio,
      linkedin: speaker.linkedin,
      twitter: speaker.twitter,
      imageUrl: speaker.imageUrl,
      expertise: extractExpertise(speaker.bio),
      otherSessions: speaker.sessions?.map(ss => ({
        id: ss.session.id,
        title: ss.session.title,
        time: ss.session.startTime
      }))
    }));
  } catch (error) {
    console.error('Error fetching speaker details:', error);
    return null;
  }
}

/**
 * Find related sessions using vector similarity or tags
 */
async function findRelatedSessions(
  sessionId: string,
  limit: number = 3
): Promise<any[]> {
  try {
    // Check cache
    const cached = getCachedData(relatedSessionsCache, sessionId);
    if (cached) return cached;

    // Get the session details first
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        title: true,
        tags: true,
        track: true
      }
    });

    if (!session) return [];

    // Try vector similarity search if available
    try {
      const similarSessions = await searchSimilarSessions(
        session.title,
        {
          id: { $ne: sessionId } // Exclude current session
        },
        limit + 1 // Get extra in case we need to filter
      );

      if (similarSessions && similarSessions.length > 0) {
        const related = similarSessions
          .filter(s => s.id !== sessionId)
          .slice(0, limit)
          .map(s => ({
            id: s.id,
            title: s.metadata?.title || s.title,
            similarity_score: s.score,
            track: s.metadata?.track,
            startTime: s.metadata?.startTime
          }));

        setCachedData(relatedSessionsCache, sessionId, related);
        return related;
      }
    } catch (vectorError) {
      // Vector search failed, fall back to tag-based
    }

    // Fallback: Find sessions with similar tags
    const relatedSessions = await prisma.session.findMany({
      where: {
        AND: [
          { id: { not: sessionId } },
          {
            OR: [
              { tags: { hasSome: session.tags } },
              { track: session.track }
            ]
          }
        ]
      },
      select: {
        id: true,
        title: true,
        track: true,
        tags: true,
        startTime: true
      },
      take: limit
    });

    const related = relatedSessions.map(s => ({
      id: s.id,
      title: s.title,
      track: s.track,
      startTime: s.startTime,
      common_tags: s.tags.filter(tag => session.tags.includes(tag))
    }));

    setCachedData(relatedSessionsCache, sessionId, related);
    return related;

  } catch (error) {
    console.error('Error finding related sessions:', error);
    return [];
  }
}

/**
 * Get session availability information
 */
async function getSessionAvailability(sessionId: string): Promise<SessionAvailability> {
  try {
    // Get registration count
    const registrationCount = await prisma.agendaSession.count({
      where: { sessionId }
    });

    // Get session capacity (if stored)
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        capacity: true,
        location: true
      }
    });

    // Estimate capacity based on location if not explicitly set
    const capacity = session?.capacity || estimateCapacity(session?.location);
    const spotsRemaining = Math.max(0, capacity - registrationCount);

    return {
      total_capacity: capacity,
      spots_remaining: spotsRemaining,
      is_full: spotsRemaining === 0,
      waitlist_available: spotsRemaining === 0 && capacity > 50 // Waitlist for large sessions
    };
  } catch (error) {
    console.error('Error getting session availability:', error);
    return {
      total_capacity: 100,
      spots_remaining: 100,
      is_full: false,
      waitlist_available: false
    };
  }
}

/**
 * Get detailed location information
 */
async function getLocationDetails(location: string): Promise<LocationDetails> {
  // Check cache
  const cached = getCachedData(locationCache, location);
  if (cached) return cached;

  // Parse location string
  const details = parseLocation(location);

  // Add walking directions based on location
  details.walking_directions = getWalkingDirections(details);
  details.nearest_restroom = getNearestFacility(details, 'restroom');
  details.nearest_exit = getNearestFacility(details, 'exit');

  setCachedData(locationCache, location, details);
  return details;
}

/**
 * Parse location string into structured data
 */
function parseLocation(location: string): LocationDetails {
  // Example: "Mandalay Bay Ballroom F | Level 2"
  const parts = location.split(/[|,]/);
  const building = 'Mandalay Bay'; // Default for this conference

  let floor = 'Main Level';
  let room = location;

  if (parts.length > 1) {
    room = parts[0].trim();
    floor = parts[1].trim();
  }

  // Extract floor level if present
  const floorMatch = location.match(/Level\s+(\d+|[A-Z])/i);
  if (floorMatch) {
    floor = `Level ${floorMatch[1]}`;
  }

  return {
    building,
    floor,
    room,
    walking_directions: '',
    nearest_restroom: '',
    nearest_exit: ''
  };
}

/**
 * Get walking directions to a location
 */
function getWalkingDirections(location: LocationDetails): string {
  const directions: Record<string, string> = {
    'Level 2': 'Take escalators near main entrance up one level',
    'Level 3': 'Take elevators near registration to Level 3',
    'Ballroom': 'From main entrance, proceed straight to ballroom corridor',
    'Shoreline': 'Located on Level 2, accessible via escalators',
    'Oceanside': 'Ground level, west wing past the casino floor'
  };

  for (const [key, direction] of Object.entries(directions)) {
    if (location.room.includes(key) || location.floor.includes(key)) {
      return direction;
    }
  }

  return 'Check conference map or ask staff for directions';
}

/**
 * Get nearest facility information
 */
function getNearestFacility(location: LocationDetails, facilityType: 'restroom' | 'exit'): string {
  // Simplified mapping - in production this would be more detailed
  const facilities: Record<string, Record<string, string>> = {
    restroom: {
      'Ballroom': 'Restrooms located outside ballroom entrance',
      'Level 2': 'Restrooms near escalators and elevators',
      'Shoreline': 'Restrooms adjacent to Shoreline entrance'
    },
    exit: {
      'Ballroom': 'Main exit through lobby or emergency exits at rear',
      'Level 2': 'Exit via escalators to main level',
      'Shoreline': 'Exit directly to pool area or main corridor'
    }
  };

  const facilityMap = facilities[facilityType];

  for (const [key, info] of Object.entries(facilityMap)) {
    if (location.room.includes(key) || location.floor.includes(key)) {
      return info;
    }
  }

  return `Nearest ${facilityType} marked on venue maps`;
}

/**
 * Calculate walking time from main areas
 */
function calculateWalkingTime(location: string | null): number {
  if (!location) return 5;

  const walkingTimes: Record<string, number> = {
    'Ballroom A': 2,
    'Ballroom B': 2,
    'Ballroom C': 3,
    'Ballroom D': 3,
    'Ballroom E': 4,
    'Ballroom F': 4,
    'Shoreline': 5,
    'Oceanside': 7,
    'Level 3': 6,
    'South Convention': 10,
    'North Convention': 8
  };

  for (const [key, time] of Object.entries(walkingTimes)) {
    if (location.includes(key)) {
      return time;
    }
  }

  return 5; // Default 5 minutes
}

/**
 * Get dietary options for meal sessions
 */
async function getDietaryOptions(result: EnhancedResult): Promise<string[]> {
  const dietary: string[] = [];
  const description = (result.description || '').toLowerCase();
  const title = (result.title || '').toLowerCase();
  const combined = title + ' ' + description;

  // Check for dietary keywords
  const dietaryKeywords: Record<string, string> = {
    'vegetarian': 'Vegetarian options available',
    'vegan': 'Vegan options available',
    'gluten': 'Gluten-free options available',
    'halal': 'Halal options available',
    'kosher': 'Kosher options available',
    'dairy-free': 'Dairy-free options available',
    'nut-free': 'Nut-free options available'
  };

  for (const [keyword, option] of Object.entries(dietaryKeywords)) {
    if (combined.includes(keyword)) {
      dietary.push(option);
    }
  }

  // Default options for meal sessions
  if (dietary.length === 0 && isMealSession(result)) {
    dietary.push('Standard dietary accommodations available');
    dietary.push('Contact catering for special requirements');
  }

  return dietary;
}

/**
 * Get session status
 */
function getSessionStatus(
  startTime?: Date | string | null,
  endTime?: Date | string | null
): 'upcoming' | 'live' | 'completed' {
  if (!startTime) return 'upcoming';

  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : new Date(start.getTime() + 60 * 60 * 1000);

  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'live';
  return 'completed';
}

/**
 * Get time until session starts
 */
function getTimeUntilStart(startTime?: Date | string | null): string {
  if (!startTime) return '';

  const now = new Date();
  const start = new Date(startTime);
  const diff = start.getTime() - now.getTime();

  if (diff < 0) return 'Started';

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `In ${days} day${days > 1 ? 's' : ''}`;
  if (hours > 0) return `In ${hours} hour${hours > 1 ? 's' : ''}`;
  if (minutes > 0) return `In ${minutes} minute${minutes > 1 ? 's' : ''}`;
  return 'Starting now';
}

/**
 * Check if session is a meal session
 */
function isMealSession(result: EnhancedResult): boolean {
  const combined = `${result.title} ${result.description}`.toLowerCase();
  const mealKeywords = ['breakfast', 'lunch', 'dinner', 'meal', 'food', 'reception', 'coffee'];
  return mealKeywords.some(keyword => combined.includes(keyword));
}

/**
 * Extract expertise from bio
 */
function extractExpertise(bio?: string | null): string[] {
  if (!bio) return [];

  const expertiseKeywords = [
    'AI', 'machine learning', 'blockchain', 'cybersecurity', 'cloud',
    'digital transformation', 'insurtech', 'data analytics', 'automation',
    'underwriting', 'claims', 'risk management', 'actuarial', 'distribution',
    'customer experience', 'innovation', 'strategy', 'leadership'
  ];

  const found: string[] = [];
  const bioLower = bio.toLowerCase();

  expertiseKeywords.forEach(keyword => {
    if (bioLower.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });

  return found;
}

/**
 * Estimate capacity based on location
 */
function estimateCapacity(location?: string | null): number {
  if (!location) return 100;

  const capacityMap: Record<string, number> = {
    'Ballroom': 500,
    'Theater': 300,
    'Workshop': 50,
    'Roundtable': 30,
    'Panel': 200,
    'Keynote': 1000,
    'Breakout': 75,
    'Lab': 40
  };

  for (const [key, capacity] of Object.entries(capacityMap)) {
    if (location.includes(key)) {
      return capacity;
    }
  }

  return 100; // Default capacity
}

/**
 * Get cached data with TTL check
 */
function getCachedData<T>(cache: Map<string, CachedData<T>>, key: string): T | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

/**
 * Set cached data with timestamp
 */
function setCachedData<T>(cache: Map<string, CachedData<T>>, key: string, data: T): void {
  cache.set(key, {
    data,
    timestamp: Date.now()
  });
}