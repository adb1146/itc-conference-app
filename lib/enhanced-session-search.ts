/**
 * Enhanced Session Search with Fallback and Post-Query Enhancement Pipeline
 * Ensures sessions can be found via multiple methods with intelligent reranking and personalization
 */

import prisma from '@/lib/db';
import { searchSimilarSessions, searchMealSessions } from '@/lib/vector-db';
import { rerankResults, filterLowQualityResults, deduplicateResults, applyDiversityBoosting, UserContext } from '@/lib/result-enhancer';
import { personalizeResults } from '@/lib/personalization';
import { enrichResults } from '@/lib/response-enrichment';
import { optimizeResponseFormat, classifyQueryType } from '@/lib/response-formatter';

export interface SessionSearchResult {
  sessions: any[];
  searchMethod: 'vector' | 'database' | 'combined' | 'meal';
  totalFound: number;
  isRecommendationQuery?: boolean;
  isMealQuery?: boolean;
  agendaBuilderOffer?: string;
  formattedResponse?: string;
  queryType?: string;
  performance?: {
    searchTime: number;
    enhancementTime: number;
    totalTime: number;
  };
}

/**
 * Check if query is asking for recommendations
 */
function isRecommendationQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const recommendationPatterns = [
    'what should i attend',
    'what sessions should',
    'recommend sessions',
    'suggest sessions',
    'which sessions should',
    'what talks',
    'sessions for me',
    'best sessions',
    'must-see sessions',
    'top sessions'
  ];

  return recommendationPatterns.some(pattern => lowerQuery.includes(pattern));
}

/**
 * Check if query is about meals
 */
function isMealQuery(query: string): boolean {
  const lowerQuery = query.toLowerCase();
  const mealPatterns = [
    'lunch', 'breakfast', 'dinner', 'meal', 'food', 'dining',
    'eat', 'catered', 'snack', 'reception', 'coffee break'
  ];

  // Check if query contains meal words
  const hasMealWords = mealPatterns.some(pattern => lowerQuery.includes(pattern));

  // Exclude if it's explicitly asking for restaurants
  const isRestaurantQuery = lowerQuery.includes('restaurant') ||
                           lowerQuery.includes('steakhouse') ||
                           lowerQuery.includes('bar');

  return hasMealWords && !isRestaurantQuery;
}

/**
 * Search for sessions using multiple strategies with post-query enhancement
 */
export async function enhancedSessionSearch(
  query: string,
  limit: number = 10,
  options?: {
    userId?: string;
    userContext?: UserContext;
    includeEnrichments?: boolean;
    includeFormatting?: boolean;
    applyPersonalization?: boolean;
  }
): Promise<SessionSearchResult> {
  const startTime = Date.now();
  const results: any[] = [];
  let searchMethod: 'vector' | 'database' | 'combined' | 'meal' = 'vector';

  // Check if this is a recommendation query
  const isRecommendation = isRecommendationQuery(query);
  let agendaBuilderOffer: string | undefined;

  // Check if this is a meal query
  const isMeal = isMealQuery(query);

  try {
    // Strategy 0: If this is a meal query, use specialized meal search
    if (isMeal) {
      console.log('[Search] Detected meal query, using specialized meal search');
      const mealResults = await searchMealSessions(query, limit * 2);

      if (mealResults && mealResults.length > 0) {
        console.log(`[Search] Meal search found ${mealResults.length} results`);
        searchMethod = 'meal';
        results.push(...mealResults);
      } else {
        // Fallback to regular search if meal search fails
        console.log('[Search] Meal search returned no results, falling back to regular search');
      }
    }

    // Only proceed with other strategies if not a meal query or meal search failed
    if (!isMeal || results.length === 0) {
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
    }

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

  // Add agenda builder offer for recommendation queries
  if (isRecommendation && results.length > 0) {
    agendaBuilderOffer = '\n\n💡 **Want a personalized agenda?**\nI can create a complete conference schedule tailored to your interests. Just say "Build my agenda" to get started with our Smart Agenda Builder!';
  }

  const searchTime = Date.now() - startTime;
  const enhancementStart = Date.now();

  // Apply post-query enhancement pipeline if we have results
  let enhancedResults = results;
  let formattedResponse: string | undefined;

  if (results.length > 0 && options) {
    try {
      // 1. Deduplicate results
      enhancedResults = deduplicateResults(results);

      // 2. Rerank results based on relevance and quality
      enhancedResults = await rerankResults(
        enhancedResults,
        query,
        options.userContext
      );

      // 3. Apply personalization if user context available
      if (options.applyPersonalization !== false && options.userId) {
        enhancedResults = await personalizeResults(
          enhancedResults,
          options.userId,
          { profile: options.userContext }
        );
      }

      // 4. Filter low quality results
      enhancedResults = filterLowQualityResults(enhancedResults, 0.3);

      // 5. Apply diversity boosting to avoid too similar results
      enhancedResults = applyDiversityBoosting(enhancedResults);

      // 6. Enrich results with additional data
      if (options.includeEnrichments !== false) {
        enhancedResults = await enrichResults(enhancedResults, {
          maxEnrichments: 10
        });
      }

      // 7. Format response if requested
      if (options.includeFormatting !== false) {
        const queryType = classifyQueryType(query);
        formattedResponse = await optimizeResponseFormat(
          enhancedResults.slice(0, limit),
          query,
          queryType,
          {
            includePersonalization: options.applyPersonalization !== false,
            includeEnrichments: options.includeEnrichments !== false
          }
        );
      }
    } catch (enhancementError) {
      console.error('[Search] Enhancement pipeline error:', enhancementError);
      // Continue with unenhanced results
      enhancedResults = results;
    }
  }

  const enhancementTime = Date.now() - enhancementStart;
  const totalTime = Date.now() - startTime;

  console.log(`[Search] Performance - Search: ${searchTime}ms, Enhancement: ${enhancementTime}ms, Total: ${totalTime}ms`);

  return {
    sessions: enhancedResults.slice(0, limit),
    searchMethod,
    totalFound: enhancedResults.length,
    isRecommendationQuery: isRecommendation,
    isMealQuery: isMeal,
    agendaBuilderOffer,
    formattedResponse,
    queryType: classifyQueryType(query),
    performance: {
      searchTime,
      enhancementTime,
      totalTime
    }
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