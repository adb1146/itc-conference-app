import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';

/**
 * Cached speaker endpoint with ISR support
 * Returns data with cache headers for edge caching
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: speakerId } = await params;

    // OPTIMIZED: Selective field fetching
    const speaker = await prisma.speaker.findUnique({
      where: { id: speakerId },
      select: {
        id: true,
        name: true,
        role: true,
        company: true,
        bio: true,
        imageUrl: true,
        linkedinUrl: true,
        twitterUrl: true,
        websiteUrl: true,
        profileSummary: true,
        companyProfile: true,
        expertise: true,
        achievements: true,
        lastProfileSync: true,
        sessions: {
          select: {
            session: {
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
                speakers: {
                  select: {
                    speaker: {
                      select: {
                        id: true,
                        name: true,
                        role: true,
                        company: true
                      }
                    }
                  },
                  where: {
                    NOT: {
                      speakerId: speakerId
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!speaker) {
      return NextResponse.json({ error: 'Speaker not found' }, { status: 404 });
    }

    // Format response
    const formattedSpeaker = {
      ...speaker,
      sessions: speaker.sessions.map(ss => ({
        ...ss.session,
        coSpeakers: ss.session.speakers.map(s => s.speaker)
      }))
    };

    // Return with cache headers for edge caching
    return NextResponse.json(formattedSpeaker, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200', // 1 hour cache, 2 hour stale
        'CDN-Cache-Control': 'max-age=3600',
        'Surrogate-Control': 'max-age=3600',
        'X-Cache-Tags': `speaker-${speakerId}`,
      }
    });

  } catch (error) {
    console.error('Error fetching cached speaker:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speaker' },
      { status: 500 }
    );
  }
}