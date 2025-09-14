import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { responseCache } from '@/lib/response-cache';

/**
 * Ultra-fast speaker search endpoint
 * Returns minimal data for instant results
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const track = searchParams.get('track');
    const company = searchParams.get('company');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Check cache first
    const cacheKey = `speakers:${query}:${track}:${company}:${limit}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached.response));
    }

    // Build where clause
    const where: any = {};

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { company: { contains: query, mode: 'insensitive' } },
        { role: { contains: query, mode: 'insensitive' } },
        { bio: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (company) {
      where.company = { contains: company, mode: 'insensitive' };
    }

    // OPTIMIZED: Only fetch essential fields
    const speakers = await prisma.speaker.findMany({
      where,
      select: {
        id: true,
        name: true,
        role: true,
        company: true,
        imageUrl: true,
        expertise: true,
        sessions: {
          select: {
            session: {
              select: {
                id: true,
                title: true,
                track: true,
                startTime: true
              }
            }
          },
          ...(track ? {
            where: {
              session: {
                track: { contains: track, mode: 'insensitive' }
              }
            }
          } : {})
        }
      },
      take: limit,
      orderBy: { name: 'asc' }
    });

    // Format response
    const formattedSpeakers = speakers.map(speaker => ({
      id: speaker.id,
      name: speaker.name,
      role: speaker.role,
      company: speaker.company,
      imageUrl: speaker.imageUrl,
      expertise: speaker.expertise,
      sessionCount: speaker.sessions.length,
      tracks: [...new Set(speaker.sessions.map(s => s.session.track).filter(Boolean))],
      sessions: speaker.sessions.slice(0, 3).map(s => ({
        id: s.session.id,
        title: s.session.title,
        startTime: s.session.startTime
      }))
    }));

    // Cache the result
    const response = { speakers: formattedSpeakers, count: formattedSpeakers.length };
    responseCache.set(cacheKey, JSON.stringify(response));

    return NextResponse.json(response);

  } catch (error) {
    console.error('Quick speaker search error:', error);
    return NextResponse.json(
      { error: 'Failed to search speakers' },
      { status: 500 }
    );
  }
}