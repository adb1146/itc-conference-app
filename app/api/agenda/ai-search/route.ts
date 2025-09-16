import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { searchSimilarSessions } from '@/lib/vector-db';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { query, selectedDay } = await request.json();

    if (!query || !query.trim()) {
      return NextResponse.json({ sessions: [] });
    }

    // First, try vector search if available
    let matchedSessionIds: string[] = [];

    try {
      // Use vector search for semantic matching
      const vectorResults = await searchSimilarSessions(query, {}, 50);
      matchedSessionIds = vectorResults.map(r => r.id);
    } catch (error) {
      console.log('Vector search not available, falling back to keyword search');
    }

    // Also do keyword search for direct matches
    const keywordSessions = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { tags: { hasSome: query.toLowerCase().split(' ') } }
        ]
      },
      select: { id: true }
    });

    const keywordIds = keywordSessions.map(s => s.id);

    // Combine results, prioritizing vector search matches
    const allSessionIds = [...new Set([...matchedSessionIds, ...keywordIds])];

    // Handle specific queries
    const lowerQuery = query.toLowerCase();

    // Special handling for time-based queries
    if (lowerQuery.includes('when') || lowerQuery.includes('what time')) {
      // Extract what they're asking about
      const searchTerms = [];

      if (lowerQuery.includes('expo') || lowerQuery.includes('floor')) {
        searchTerms.push('expo floor');
      }
      if (lowerQuery.includes('breakfast')) {
        searchTerms.push('breakfast');
      }
      if (lowerQuery.includes('lunch')) {
        searchTerms.push('lunch');
      }
      if (lowerQuery.includes('party') || lowerQuery.includes('closing')) {
        searchTerms.push('closing party');
      }
      if (lowerQuery.includes('registration') || lowerQuery.includes('badge')) {
        searchTerms.push('badge pickup');
      }
      if (lowerQuery.includes('keynote')) {
        searchTerms.push('keynote');
      }

      // Search for these specific terms
      if (searchTerms.length > 0) {
        const specificSessions = await prisma.session.findMany({
          where: {
            OR: searchTerms.map(term => ({
              title: { contains: term, mode: 'insensitive' as const }
            }))
          },
          select: { id: true }
        });

        const specificIds = specificSessions.map(s => s.id);
        // Add these to the beginning of results for priority
        allSessionIds.unshift(...specificIds.filter(id => !allSessionIds.includes(id)));
      }
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
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Sort by relevance (maintain order from search)
    const sortedSessions = allSessionIds
      .map(id => sessions.find(s => s.id === id))
      .filter(Boolean);

    // Format the response
    return NextResponse.json({
      sessions: sortedSessions,
      sessionIds: allSessionIds,
      count: sortedSessions.length,
      query
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