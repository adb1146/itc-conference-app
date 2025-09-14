import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { responseCache } from '@/lib/response-cache';

/**
 * Ultra-fast session search endpoint
 * Returns minimal data for instant results
 */

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.toLowerCase() || '';
    const track = searchParams.get('track');
    const tag = searchParams.get('tag');
    const day = searchParams.get('day');
    const speakerId = searchParams.get('speakerId');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Generate cache key
    const cacheKey = `sessions:${query}:${track}:${tag}:${day}:${speakerId}:${limit}`;
    const cached = responseCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(JSON.parse(cached.response));
    }

    // Build where clause
    const where: any = {};

    if (query) {
      where.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } }
      ];
    }

    if (track) {
      where.track = { contains: track, mode: 'insensitive' };
    }

    if (tag) {
      where.tags = { has: tag };
    }

    if (day) {
      const dayNum = parseInt(day);
      const baseDate = new Date('2025-10-14'); // Day before conference
      const startOfDay = new Date(baseDate);
      startOfDay.setDate(baseDate.getDate() + dayNum);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(startOfDay);
      endOfDay.setHours(23, 59, 59, 999);

      where.startTime = {
        gte: startOfDay,
        lte: endOfDay
      };
    }

    if (speakerId) {
      where.speakers = {
        some: {
          speakerId: speakerId
        }
      };
    }

    // OPTIMIZED: Only fetch essential fields
    const sessions = await prisma.session.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        track: true,
        tags: true,
        speakers: {
          select: {
            speaker: {
              select: {
                id: true,
                name: true,
                company: true
              }
            }
          },
          take: 3 // Limit speakers per session
        }
      },
      take: limit,
      orderBy: { startTime: 'asc' }
    });

    // Format response with minimal processing
    const formattedSessions = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description.substring(0, 200) + '...',
      startTime: session.startTime,
      endTime: session.endTime,
      location: session.location,
      track: session.track,
      tags: session.tags.slice(0, 3), // Limit tags
      speakers: session.speakers.map(s => ({
        id: s.speaker.id,
        name: s.speaker.name,
        company: s.speaker.company
      }))
    }));

    // Cache the result
    const response = { sessions: formattedSessions, count: formattedSessions.length };
    responseCache.set(cacheKey, JSON.stringify(response));

    return NextResponse.json(response);

  } catch (error) {
    console.error('Quick session search error:', error);
    return NextResponse.json(
      { error: 'Failed to search sessions' },
      { status: 500 }
    );
  }
}