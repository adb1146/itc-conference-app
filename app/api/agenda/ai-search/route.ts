import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hybridSearch } from '@/lib/vector-db';

const prisma = new PrismaClient();

// Extract key concepts from query
function extractQueryConcepts(query: string): {
  keywords: string[];
  timeContext?: 'morning' | 'afternoon' | 'evening';
  dayContext?: string;
  intentType?: 'when' | 'where' | 'what' | 'who';
} {
  const lowerQuery = query.toLowerCase();
  const keywords: string[] = [];
  let timeContext: 'morning' | 'afternoon' | 'evening' | undefined;
  let intentType: 'when' | 'where' | 'what' | 'who' | undefined;

  // Detect intent type
  if (lowerQuery.includes('when') || lowerQuery.includes('what time')) {
    intentType = 'when';
  } else if (lowerQuery.includes('where')) {
    intentType = 'where';
  } else if (lowerQuery.includes('who')) {
    intentType = 'who';
  } else {
    intentType = 'what';
  }

  // Time context detection
  if (lowerQuery.includes('morning') || lowerQuery.includes('breakfast')) {
    timeContext = 'morning';
  } else if (lowerQuery.includes('afternoon') || lowerQuery.includes('lunch')) {
    timeContext = 'afternoon';
  } else if (lowerQuery.includes('evening') || lowerQuery.includes('dinner') || lowerQuery.includes('party')) {
    timeContext = 'evening';
  }

  // Extract meaningful keywords
  const importantTerms = [
    'ai', 'artificial intelligence', 'machine learning', 'ml',
    'insurtech', 'insurance', 'tech', 'technology',
    'keynote', 'workshop', 'panel', 'summit', 'masterclass',
    'expo', 'exhibition', 'floor',
    'breakfast', 'lunch', 'dinner', 'party', 'reception', 'networking',
    'registration', 'badge', 'pickup',
    'golf', 'tournament',
    'wiise', 'latam', 'brokers', 'agents',
    'blockchain', 'crypto', 'web3',
    'claims', 'underwriting', 'risk', 'compliance',
    'startup', 'innovation', 'digital', 'transformation',
    'customer', 'experience', 'cx', 'ux',
    'data', 'analytics', 'big data',
    'cloud', 'saas', 'platform',
    'cyber', 'security', 'fraud',
    'automation', 'rpa', 'process'
  ];

  // Find matching important terms
  for (const term of importantTerms) {
    if (lowerQuery.includes(term)) {
      keywords.push(term);
    }
  }

  // Also extract non-common words from query
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are',
                             'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does',
                             'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
                             'shall', 'can', 'need', 'dare', 'ought', 'used', 'i', 'you', 'he',
                             'she', 'it', 'we', 'they', 'what', 'when', 'where', 'who', 'how',
                             'about', 'for', 'with', 'without', 'to', 'from', 'of', 'in']);

  const words = lowerQuery.split(/\s+/);
  for (const word of words) {
    const cleaned = word.replace(/[^a-z0-9]/g, '');
    if (cleaned.length > 2 && !stopWords.has(cleaned) && !keywords.includes(cleaned)) {
      keywords.push(cleaned);
    }
  }

  return { keywords, timeContext, intentType };
}

export async function POST(request: Request) {
  try {
    const { query, selectedDay } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ sessions: [] });
    }

    // Extract query concepts for better understanding
    const { keywords, timeContext, intentType } = extractQueryConcepts(query);

    // Use hybrid search which combines vector and keyword search
    let searchResults: any[] = [];

    try {
      // Use the hybrid search for better results
      searchResults = await hybridSearch(
        query,           // Full query for semantic understanding
        keywords,        // Extracted keywords for boosting
        [],             // No user interests for now
        100             // Get more results initially for better ranking
      );
    } catch (error) {
      console.log('Hybrid search not available, using fallback');

      // Fallback to database search
      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            { tags: { hasSome: keywords } }
          ]
        },
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      searchResults = sessions.map(s => ({
        id: s.id,
        title: s.title,
        description: s.description,
        score: 1.0,
        ...s
      }));
    }

    // Apply time context filtering if present
    if (timeContext && searchResults.length > 0) {
      const timeFiltered = searchResults.filter(session => {
        const hour = new Date(session.startTime).getUTCHours();
        if (timeContext === 'morning') return hour >= 7 && hour < 12;
        if (timeContext === 'afternoon') return hour >= 12 && hour < 17;
        if (timeContext === 'evening') return hour >= 17;
        return true;
      });

      if (timeFiltered.length > 0) {
        searchResults = timeFiltered;
      }
    }

    // Get session IDs from search results
    const allSessionIds = searchResults.map(r => r.id);

    // If no results from vector search, try specialized searches
    if (allSessionIds.length === 0 && keywords.length > 0) {
      const fallbackSessions = await prisma.session.findMany({
        where: {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { description: { contains: query, mode: 'insensitive' } },
            ...keywords.map(keyword => ({
              title: { contains: keyword, mode: 'insensitive' as const }
            })),
            ...keywords.map(keyword => ({
              description: { contains: keyword, mode: 'insensitive' as const }
            }))
          ]
        },
        select: { id: true }
      });

      allSessionIds.push(...fallbackSessions.map(s => s.id));
    }

    // Fetch full session data
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: allSessionIds }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    // Create a map for easy lookup
    const sessionMap = new Map(sessions.map(s => [s.id, s]));

    // Sort by relevance score if available, otherwise maintain search order
    const sortedSessions = allSessionIds
      .map(id => sessionMap.get(id))
      .filter(Boolean)
      .sort((a: any, b: any) => {
        // First, check if we have scores from vector search
        const scoreA = searchResults.find(r => r.id === a.id)?.score || 0;
        const scoreB = searchResults.find(r => r.id === b.id)?.score || 0;

        if (scoreA !== scoreB) {
          return scoreB - scoreA; // Higher score first
        }

        // Then sort by time
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      });

    // Add search metadata for better UX
    const searchMetadata = {
      query,
      keywords,
      timeContext,
      intentType,
      suggestedFilters: [] as string[]
    };

    // Suggest filters based on results
    if (sortedSessions.length > 0) {
      const tracks = [...new Set(sortedSessions.map(s => s.track).filter(Boolean))];
      if (tracks.length > 1 && tracks.length < 5) {
        searchMetadata.suggestedFilters = tracks;
      }
    }

    // Format the response
    return NextResponse.json({
      sessions: sortedSessions,
      sessionIds: sortedSessions.map(s => s.id),
      count: sortedSessions.length,
      searchMetadata
    });

  } catch (error) {
    console.error('AI search error:', error);
    return NextResponse.json(
      { error: 'Search failed', sessions: [] },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'AI Search endpoint is running',
    usage: 'POST with { query: string, selectedDay?: string }'
  });
}