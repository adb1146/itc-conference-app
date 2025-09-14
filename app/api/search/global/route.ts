import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { searchLocalSessions } from '@/lib/local-vector-db';

export async function POST(request: Request) {
  try {
    const { query, limit = 10 } = await request.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const lowerQuery = query.toLowerCase();

    console.log('[Global Search] Searching for:', query);

    // Initialize session results
    let sessionResults: any[] = [];

    try {
      // Try vector search first
      sessionResults = await searchLocalSessions(query, [], limit * 3);
      console.log('[Global Search] Vector search found', sessionResults.length, 'results');
    } catch (error) {
      console.error('[Global Search] Vector search failed:', error);
    }

    // If vector search doesn't find enough results or fails, do a database search as fallback
    try {
      if (sessionResults.length < 5) {
        console.log('[Global Search] Using database search for sessions');
        const dbSessions = await prisma.session.findMany({
          where: {
            OR: [
              { title: { contains: query, mode: 'insensitive' } },
              { description: { contains: query, mode: 'insensitive' } },
              { track: { contains: query, mode: 'insensitive' } },
              { location: { contains: query, mode: 'insensitive' } },
              { tags: { has: query } }
            ]
          },
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          },
          take: limit * 2
        });

        // Merge with vector results, avoiding duplicates
        const vectorIds = new Set(sessionResults.map(s => s.id));
        const additionalSessions = dbSessions
          .filter(s => !vectorIds.has(s.id))
          .map(s => ({
            ...s,
            similarity: calculateRelevance(s.title, s.description, s.track, '', lowerQuery) / 20 // Normalize score
          }));

        sessionResults = [...sessionResults, ...additionalSessions];
      }
    } catch (error) {
      console.error('[Global Search] Database session search failed:', error);
    }

    // Search speakers
    let speakers: any[] = [];
    try {
      speakers = await prisma.speaker.findMany({
        where: {
          OR: [
            { name: { contains: query, mode: 'insensitive' } },
            { company: { contains: query, mode: 'insensitive' } },
            { role: { contains: query, mode: 'insensitive' } },
            { bio: { contains: query, mode: 'insensitive' } }
          ]
        },
        take: limit
      });
    } catch (error) {
      console.error('[Global Search] Speaker search failed:', error);
    }

    console.log('[Global Search] Found', sessionResults.length, 'sessions from all sources');
    console.log('[Global Search] Found', speakers.length, 'speakers');

    // Combine and format results
    const results = [
      ...sessionResults.map(session => ({
        type: 'session',
        id: session.id,
        title: session.title,
        description: session.description,
        url: `/agenda/session/${session.id}`,
        metadata: {
          time: session.startTime,
          track: session.track,
          location: session.location,
          speakers: session.speakers?.map((s: any) => s.speaker?.name || s.name).filter(Boolean)
        },
        score: session.similarity || calculateRelevance(session.title, session.description, session.track, '', lowerQuery) / 20
      })),
      ...speakers.map(speaker => ({
        type: 'speaker',
        id: speaker.id,
        title: speaker.name,
        description: `${speaker.role || ''} ${speaker.company ? `at ${speaker.company}` : ''}`.trim(),
        url: `/speakers/${speaker.id}`,
        metadata: {
          company: speaker.company,
          role: speaker.role
        },
        score: calculateRelevance(speaker.name, speaker.role, speaker.company, speaker.bio, lowerQuery)
      }))
    ];

    // Sort by score and limit results
    results.sort((a, b) => b.score - a.score);
    const topResults = results.slice(0, Math.max(limit * 2, 20)); // Return more results for variety

    console.log('[Global Search] Returning', topResults.length, 'total results');

    return NextResponse.json({
      results: topResults,
      query,
      totalResults: results.length
    });

  } catch (error) {
    console.error('Global search error:', error);
    return NextResponse.json(
      { error: 'Failed to perform search' },
      { status: 500 }
    );
  }
}

function calculateRelevance(
  title: string | null,
  subtitle: string | null,
  extra1: string | null,
  extra2: string | null,
  query: string
): number {
  let score = 0;

  if (title?.toLowerCase().includes(query)) score += 10;
  if (subtitle?.toLowerCase().includes(query)) score += 5;
  if (extra1?.toLowerCase().includes(query)) score += 3;
  if (extra2?.toLowerCase().includes(query)) score += 2;

  // Exact match bonus
  if (title?.toLowerCase() === query) score += 10;

  // Partial word match bonus
  const words = query.split(' ');
  words.forEach(word => {
    if (word.length > 2) {
      if (title?.toLowerCase().includes(word.toLowerCase())) score += 2;
      if (subtitle?.toLowerCase().includes(word.toLowerCase())) score += 1;
    }
  });

  return score;
}