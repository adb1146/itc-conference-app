import { SmartAgenda, ScheduleItem, AgendaOptions } from './types';
import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';

// Session cache - READ-ONLY conference data safe to share across all users
// User-specific data (favorites, preferences) is never cached here
let cachedSessions: any = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Get cached sessions or fetch from DB if cache expired
 */
async function getCachedSessions() {
  const now = Date.now();

  if (!cachedSessions || now - cacheTimestamp > CACHE_DURATION) {
    console.log('[OptimizedAgenda] Refreshing session cache...');
    const startTime = Date.now();

    cachedSessions = await prisma.session.findMany({
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

    cacheTimestamp = now;
    console.log(`[OptimizedAgenda] Cached ${cachedSessions.length} sessions in ${Date.now() - startTime}ms`);
  }

  return cachedSessions;
}

/**
 * Optimized agenda builder with caching and parallel operations
 */
export async function generateOptimizedAgenda(
  userId: string | null,
  userPreferences: any,
  options: Partial<AgendaOptions> = {}
): Promise<{
  success: boolean;
  agenda?: SmartAgenda;
  error?: string;
  performanceMetrics?: {
    totalTime: number;
    cacheHit: boolean;
    sessionsAnalyzed: number;
    vectorSearchTime?: number;
  }
}> {
  const startTime = Date.now();
  let vectorSearchTime = 0;

  try {
    // Start parallel operations
    const parallelPromises: Promise<any>[] = [];

    // 1. Get cached sessions (fast)
    parallelPromises.push(getCachedSessions());

    // 2. Fetch user data if userId provided
    if (userId) {
      parallelPromises.push(
        prisma.user.findUnique({
          where: { id: userId },
          include: {
            favorites: {
              include: {
                session: true,
                speaker: true
              }
            }
          }
        })
      );
    }

    // 3. Start vector search early if we have interests
    let vectorSearchPromise: Promise<any> | null = null;
    if (userPreferences?.interests?.length > 0) {
      const searchQuery = `${userPreferences.role || ''} ${userPreferences.interests.join(' ')}`.trim();
      if (searchQuery) {
        const vectorStart = Date.now();
        vectorSearchPromise = searchSimilarSessions(searchQuery, undefined, 20)
          .then(results => {
            vectorSearchTime = Date.now() - vectorStart;
            return results;
          })
          .catch(error => {
            console.error('[OptimizedAgenda] Vector search failed:', error);
            return [];
          });
        parallelPromises.push(vectorSearchPromise);
      }
    }

    // Wait for all parallel operations
    const results = await Promise.all(parallelPromises);

    const allSessions = results[0];
    const user = userId ? results[1] : null;
    const vectorResults = vectorSearchPromise ? results[results.length - 1] : [];

    // Create a Set of recommended session IDs from vector search
    const recommendedSessionIds = new Set(
      vectorResults.map((r: any) => r.id || r.metadata?.id).filter(Boolean)
    );

    // Get favorited sessions if user exists
    const favoritedSessionIds = new Set(
      user?.favorites
        ?.filter((f: any) => f.type === 'session' && f.sessionId)
        ?.map((f: any) => f.sessionId) || []
    );

    // Score sessions based on multiple factors
    const scoredSessions = allSessions.map((session: any) => {
      let score = 0;

      // Favorited sessions get highest priority
      if (favoritedSessionIds.has(session.id)) {
        score += 1000;
      }

      // Vector search recommendations
      if (recommendedSessionIds.has(session.id)) {
        score += 500;
      }

      // Interest matching (keyword based - fast)
      if (userPreferences?.interests) {
        const sessionText = `${session.title} ${session.description} ${session.tags?.join(' ')}`.toLowerCase();
        userPreferences.interests.forEach((interest: string) => {
          if (sessionText.includes(interest.toLowerCase())) {
            score += 100;
          }
        });
      }

      // Role matching
      if (userPreferences?.role) {
        const sessionText = `${session.title} ${session.description}`.toLowerCase();
        const roleKeywords = getRoleKeywords(userPreferences.role);
        roleKeywords.forEach(keyword => {
          if (sessionText.includes(keyword)) {
            score += 50;
          }
        });
      }

      // Keynotes and special sessions
      if (session.isKeynote || session.title?.toLowerCase().includes('keynote')) {
        score += 200;
      }

      return { ...session, relevanceScore: score };
    });

    // Sort by score and time
    scoredSessions.sort((a: any, b: any) => {
      // First by day
      const dayA = new Date(a.startTime).toDateString();
      const dayB = new Date(b.startTime).toDateString();
      if (dayA !== dayB) {
        return a.startTime - b.startTime;
      }
      // Then by score
      return b.relevanceScore - a.relevanceScore;
    });

    // Group sessions by day
    const sessionsByDay = new Map<string, any[]>();
    scoredSessions.forEach((session: any) => {
      const day = new Date(session.startTime).toDateString();
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, []);
      }
      sessionsByDay.get(day)!.push(session);
    });

    // Build optimized agenda
    const days = [];
    let dayNumber = 1;
    const maxSessionsPerDay = options.maxSessionsPerDay || 8;

    for (const [dateString, daySessions] of sessionsByDay) {
      const schedule: ScheduleItem[] = [];
      const usedTimeSlots = new Set<string>();
      let sessionCount = 0;

      // Add top-scored sessions avoiding conflicts
      for (const session of daySessions) {
        if (sessionCount >= maxSessionsPerDay) break;

        const timeSlot = `${session.startTime}-${session.endTime}`;
        if (!usedTimeSlots.has(timeSlot)) {
          usedTimeSlots.add(timeSlot);
          sessionCount++;

          schedule.push({
            id: `session-${session.id}`,
            time: new Date(session.startTime).toLocaleTimeString('en-US', {
              timeZone: 'America/Los_Angeles',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            endTime: new Date(session.endTime).toLocaleTimeString('en-US', {
              timeZone: 'America/Los_Angeles',
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            type: 'session',
            source: (favoritedSessionIds.has(session.id) ? 'user-favorite' :
                   recommendedSessionIds.has(session.id) ? 'ai-suggested' :
                   'system') as 'ai-suggested' | 'user-favorite' | 'system',
            item: {
              id: session.id,
              title: session.title,
              description: session.description || '',
              location: session.location || '',
              speakers: session.speakers.map((s: any) => ({
                name: s.speaker.name,
                company: s.speaker.company,
                role: s.speaker.role
              })),
              track: session.track
            }
          });
        }
      }

      // Sort schedule by time
      schedule.sort((a, b) => {
        const timeA = new Date(`2025-01-01 ${a.time}`).getTime();
        const timeB = new Date(`2025-01-01 ${b.time}`).getTime();
        return timeA - timeB;
      });

      days.push({
        date: dateString,
        dayNumber: dayNumber,
        schedule,
        stats: {
          totalSessions: schedule.length,
          morningSessionsCount: schedule.filter(s => {
            const hour = parseInt(s.time.split(':')[0]);
            return hour < 12;
          }).length,
          afternoonSessionsCount: schedule.filter(s => {
            const hour = parseInt(s.time.split(':')[0]);
            return hour >= 12;
          }).length
        }
      });

      dayNumber++;
    }

    const agenda: SmartAgenda = {
      userId: userId || 'guest',
      userName: user?.name || 'Guest',
      userRole: userPreferences?.role || user?.role || '',
      userInterests: userPreferences?.interests || user?.interests || [],
      days,
      metrics: {
        totalSessions: days.reduce((sum, day) => sum + day.schedule.length, 0),
        favoritedSessions: Array.from(favoritedSessionIds).length,
        aiSuggestionsAdded: Array.from(recommendedSessionIds).length,
        conflictsResolved: 0
      },
      generatedAt: new Date().toISOString()
    };

    const totalTime = Date.now() - startTime;
    console.log(`[OptimizedAgenda] Generated agenda in ${totalTime}ms (vector: ${vectorSearchTime}ms)`);

    return {
      success: true,
      agenda,
      performanceMetrics: {
        totalTime,
        cacheHit: Date.now() - cacheTimestamp < CACHE_DURATION,
        sessionsAnalyzed: allSessions.length,
        vectorSearchTime
      }
    };

  } catch (error) {
    console.error('[OptimizedAgenda] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate agenda'
    };
  }
}

/**
 * Get relevant keywords for a given role
 */
function getRoleKeywords(role: string): string[] {
  const roleMap: Record<string, string[]> = {
    'underwriter': ['risk', 'underwriting', 'pricing', 'claims', 'actuarial', 'loss'],
    'cto': ['technology', 'digital', 'cloud', 'data', 'ai', 'ml', 'architecture', 'innovation'],
    'ceo': ['strategy', 'leadership', 'growth', 'transformation', 'trends', 'executive'],
    'sales': ['sales', 'distribution', 'customer', 'growth', 'revenue', 'partnership'],
    'product': ['product', 'innovation', 'customer experience', 'design', 'launch'],
    'marketing': ['marketing', 'brand', 'customer', 'digital', 'engagement', 'campaign']
  };

  const normalizedRole = role.toLowerCase();
  for (const [key, keywords] of Object.entries(roleMap)) {
    if (normalizedRole.includes(key)) {
      return keywords;
    }
  }

  return [];
}

// Pre-warm the cache on module load
if (typeof window === 'undefined') {
  getCachedSessions().catch(console.error);
}