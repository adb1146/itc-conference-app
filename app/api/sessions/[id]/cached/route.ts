import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Cached session endpoint with ISR support
 * Returns data with cache headers for edge caching
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // OPTIMIZED: Selective field fetching
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        track: true,
        level: true,
        tags: true,
        sourceUrl: true,
        enrichedSummary: true,
        keyTakeaways: true,
        industryContext: true,
        relatedTopics: true,
        lastEnrichmentSync: true,
        speakers: {
          select: {
            speaker: {
              select: {
                id: true,
                name: true,
                role: true,
                company: true,
                bio: true,
                imageUrl: true,
                linkedinUrl: true,
                expertise: true
              }
            }
          }
        }
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Format response
    const formattedSession = {
      ...session,
      speakers: session.speakers.map(s => s.speaker)
    };

    // Return with cache headers for edge caching
    return NextResponse.json(formattedSession, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache, 2 hour stale
        'CDN-Cache-Control': 'max-age=3600',
        'Surrogate-Control': 'max-age=3600',
        'X-Cache-Tags': `session-${sessionId}`,
      }
    });

  } catch (error) {
    console.error('Error fetching cached session:', error);
    return NextResponse.json(
      { error: 'Failed to fetch session' },
      { status: 500 }
    );
  }
}