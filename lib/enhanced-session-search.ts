/**
 * Enhanced Session Search with Fallback
 * Ensures sessions can be found via multiple methods
 */

import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';
import { detectMealQuery, identifyMealSessions } from '@/lib/meal-session-detector';

export interface SessionSearchResult {
  sessions: any[];
  searchMethod: 'vector' | 'database' | 'combined' | 'meal-specific';
  totalFound: number;
  isMealQuery?: boolean;
}

/**
 * Search for sessions using multiple strategies
 */
export async function enhancedSessionSearch(
  query: string,
  limit: number = 10
): Promise<SessionSearchResult> {
  const results: any[] = [];
  let searchMethod: 'vector' | 'database' | 'combined' | 'meal-specific' = 'vector';

  // Check if this is a meal-related query
  const mealDetection = detectMealQuery(query);

  // Strategy 0: Handle meal queries specifically
  if (mealDetection.isMealQuery && mealDetection.queryType !== 'external-dining') {
    console.log('[Search] Detected meal query:', mealDetection);
    searchMethod = 'meal-specific';

    // Fetch meal sessions
    const mealSessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: 'Breakfast', mode: 'insensitive' } },
          { title: { contains: 'Lunch', mode: 'insensitive' } },
          { title: { contains: 'Dinner', mode: 'insensitive' } },
          { title: { contains: 'Reception', mode: 'insensitive' } },
          { location: { contains: 'Lunch Seminar', mode: 'insensitive' } }
        ]
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Identify and filter meal sessions
    const identifiedMealSessions = identifyMealSessions(mealSessions);

    // Filter by meal type if specific
    let filteredSessions = mealSessions;
    if (mealDetection.mealType && mealDetection.mealType !== 'general') {
      filteredSessions = mealSessions.filter(session => {
        const titleLower = session.title.toLowerCase();
        switch (mealDetection.mealType) {
          case 'breakfast':
            return titleLower.includes('breakfast');
          case 'lunch':
            return titleLower.includes('lunch');
          case 'dinner':
            return titleLower.includes('dinner') || titleLower.includes('gala');
          default:
            return true;
        }
      });
    }

    // Filter by time context if specified
    if (mealDetection.timeContext === 'today') {
      const today = new Date();
      const todayDate = today.getDate();
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.startTime).getDate();
        return sessionDate === todayDate;
      });
    } else if (mealDetection.timeContext === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowDate = tomorrow.getDate();
      filteredSessions = filteredSessions.filter(session => {
        const sessionDate = new Date(session.startTime).getDate();
        return sessionDate === tomorrowDate;
      });
    }

    if (filteredSessions.length > 0) {
      console.log(`[Search] Found ${filteredSessions.length} meal sessions`);
      return {
        sessions: filteredSessions.slice(0, limit),
        searchMethod,
        totalFound: filteredSessions.length,
        isMealQuery: true
      };
    }
    // If no meal sessions found, continue with regular search
  }

  try {
    // Strategy 1: Try vector search first
    console.log('[Search] Attempting vector search for:', query);
    const vectorResults = await searchSimilarSessions(query, undefined, limit);

    if (vectorResults && vectorResults.length > 0) {
      console.log(`[Search] Vector search found ${vectorResults.length} results`);
      results.push(...vectorResults);
    }

    // Strategy 2: If vector search yields few results, also try database search
    if (results.length < 3) {
      console.log('[Search] Vector results insufficient, trying database search');
      searchMethod = results.length > 0 ? 'combined' : 'database';

      // Extract key terms from query
      const searchTerms = extractSearchTerms(query);
      console.log('[Search] Extracted search terms:', searchTerms);

      // First, try to find exact or near-exact title matches with important terms
      if (searchTerms.length > 0) {
        const importantTerms = searchTerms.filter(term =>
          !['carriers', 'only', 'summit'].includes(term.toLowerCase())
        );

        // Search specifically for sessions containing the most important terms
        const primarySearch = await prisma.session.findMany({
          where: {
            AND: importantTerms.slice(0, 2).map(term => ({
              OR: [
                { title: { contains: term, mode: 'insensitive' as const } },
                { description: { contains: term, mode: 'insensitive' as const } }
              ]
            }))
          },
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          },
          take: limit
        });

        if (primarySearch.length > 0) {
          console.log(`[Search] Found ${primarySearch.length} sessions with primary terms`);
          const existingIds = new Set(results.map((r: any) => r.id));
          const newResults = primarySearch.filter(r => !existingIds.has(r.id));
          results.push(...newResults);
        }
      }

      // If still not enough results, do broader search
      if (results.length < 3) {
        // Database search with multiple strategies
        const dbResults = await prisma.session.findMany({
          where: {
            OR: [
              // Match any of the important search terms in title
              ...searchTerms.slice(0, 3).map(term => ({
                title: { contains: term, mode: 'insensitive' as const }
              })),
              // Speaker search for names
              ...searchTerms.filter(term => term.includes(' ')).map(name => ({
                speakers: {
                  some: {
                    speaker: {
                      name: { contains: name, mode: 'insensitive' as const }
                    }
                  }
                }
              }))
            ]
          },
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          },
          take: limit
        });

        console.log(`[Search] Database search found ${dbResults.length} results`);

        // Add database results that aren't already in vector results
        const existingIds = new Set(results.map((r: any) => r.id));
        const newResults = dbResults.filter(r => !existingIds.has(r.id));
        results.push(...newResults);
      }
    }

    // Strategy 3: If still no results, try fuzzy matching
    if (results.length === 0) {
      console.log('[Search] No results found, trying fuzzy match');

      // Get all sessions and do client-side fuzzy matching
      const allSessions = await prisma.session.findMany({
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      // Simple fuzzy match - find sessions with similar words
      const queryWords = query.toLowerCase().split(/\s+/);
      const fuzzyMatches = allSessions.filter(session => {
        const sessionText = `${session.title} ${session.description || ''} ${session.track || ''}`.toLowerCase();

        // Count how many query words appear in session text
        const matchCount = queryWords.filter(word =>
          word.length > 2 && sessionText.includes(word)
        ).length;

        // Return sessions that match at least half the query words
        return matchCount >= Math.ceil(queryWords.length / 2);
      });

      console.log(`[Search] Fuzzy match found ${fuzzyMatches.length} results`);
      results.push(...fuzzyMatches.slice(0, limit));
      searchMethod = 'database';
    }

  } catch (error) {
    console.error('[Search] Error during search:', error);

    // Fallback to basic database search on error
    try {
      const fallbackResults = await prisma.session.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } }
          ]
        },
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        },
        take: limit
      });

      results.push(...fallbackResults);
      searchMethod = 'database';
    } catch (dbError) {
      console.error('[Search] Database fallback also failed:', dbError);
    }
  }

  return {
    sessions: results.slice(0, limit),
    searchMethod,
    totalFound: results.length,
    isMealQuery: mealDetection.isMealQuery
  };
}

/**
 * Extract meaningful search terms from a query
 */
function extractSearchTerms(query: string): string[] {
  // Remove common words and extract key terms
  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'up', 'about', 'into', 'through', 'during',
    'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
    'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might',
    'can', 'must', 'shall', 'what', 'who', 'which', 'when', 'where', 'why',
    'how', 'session', 'tell', 'me', 'show', 'find', 'search', 'look',
    'itc', 'vegas', '2025', 'conference' // Add common conference terms
  ]);

  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Also extract any quoted phrases
  const quotedPhrases = query.match(/"[^"]+"/g) || [];
  const phrases = quotedPhrases.map(p => p.replace(/"/g, ''));

  // Look for important session-specific terms
  const importantTerms = [];
  const lowerQuery = query.toLowerCase();

  // Company and product names should be prioritized
  if (lowerQuery.includes('clearspeed')) importantTerms.push('clearspeed');
  if (lowerQuery.includes('datos')) importantTerms.push('datos');
  if (lowerQuery.includes('trust faster')) importantTerms.push('trust faster');

  // Speaker names (extract capitalized words that might be names)
  const namePattern = /\b[A-Z][a-z]+ [A-Z][a-z]+\b/g;
  const names = query.match(namePattern) || [];

  return [...new Set([...importantTerms, ...names, ...words, ...phrases])];
}

/**
 * Get a specific session by ID or title
 */
export async function getSessionDetails(identifier: string) {
  // Try by ID first
  let session = await prisma.session.findUnique({
    where: { id: identifier },
    include: {
      speakers: {
        include: {
          speaker: true
        }
      }
    }
  });

  // If not found by ID, try exact title match
  if (!session) {
    session = await prisma.session.findFirst({
      where: {
        title: { equals: identifier, mode: 'insensitive' }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
  }

  // If still not found, try partial title match
  if (!session) {
    session = await prisma.session.findFirst({
      where: {
        title: { contains: identifier, mode: 'insensitive' }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
  }

  return session;
}