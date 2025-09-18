/**
 * Enhanced Session Search with Fallback
 * Ensures sessions can be found via multiple methods
 */

import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';

export interface SessionSearchResult {
  sessions: any[];
  searchMethod: 'vector' | 'database' | 'combined';
  totalFound: number;
}

/**
 * Search for sessions using multiple strategies
 */
export async function enhancedSessionSearch(
  query: string,
  limit: number = 10
): Promise<SessionSearchResult> {
  const results: any[] = [];
  let searchMethod: 'vector' | 'database' | 'combined' = 'vector';

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

      // Database search with multiple strategies
      const dbResults = await prisma.session.findMany({
        where: {
          OR: [
            // Exact title match (case insensitive)
            { title: { contains: query, mode: 'insensitive' } },
            // Match any of the search terms
            ...searchTerms.map(term => ({
              title: { contains: term, mode: 'insensitive' as const }
            })),
            // Description search
            { description: { contains: query, mode: 'insensitive' } },
            ...searchTerms.map(term => ({
              description: { contains: term, mode: 'insensitive' as const }
            })),
            // Speaker search
            {
              speakers: {
                some: {
                  speaker: {
                    name: { contains: query, mode: 'insensitive' }
                  }
                }
              }
            },
            // Track search
            { track: { contains: query, mode: 'insensitive' } },
            // Location search
            { location: { contains: query, mode: 'insensitive' } }
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
    totalFound: results.length
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
    'how', 'session', 'tell', 'me', 'show', 'find', 'search', 'look'
  ]);

  const words = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')  // Remove punctuation
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.has(word));

  // Also extract any quoted phrases
  const quotedPhrases = query.match(/"[^"]+"/g) || [];
  const phrases = quotedPhrases.map(p => p.replace(/"/g, ''));

  return [...new Set([...words, ...phrases])];
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