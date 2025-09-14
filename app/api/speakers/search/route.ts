import { NextResponse } from 'next/server';
import prisma from '@/lib/db';
import { searchLocalSessions } from '@/lib/local-vector-db';

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || query.length < 2) {
      return NextResponse.json({ speakers: [] });
    }

    // First, do a quick database search for direct matches
    const directMatches = await prisma.speaker.findMany({
      where: {
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { company: { contains: query, mode: 'insensitive' } },
          { role: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } },
          { expertise: { has: query } }
        ]
      },
      include: {
        sessions: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                tags: true
              }
            }
          }
        }
      },
      take: 20
    });

    // Search for sessions that match the query and get their speakers
    const sessionResults = await searchLocalSessions(query, [], 10);

    // Get unique speaker IDs from session results
    const speakerIdsFromSessions = new Set<string>();

    // Fetch full session data with speakers
    if (sessionResults.length > 0) {
      const sessionIds = sessionResults.map(s => s.id);
      const sessionsWithSpeakers = await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        include: {
          speakers: {
            include: {
              speaker: true
            }
          }
        }
      });

      sessionsWithSpeakers.forEach(session => {
        session.speakers.forEach(ss => {
          speakerIdsFromSessions.add(ss.speaker.id);
        });
      });
    }

    // Fetch vector-matched speakers
    const vectorSpeakers = speakerIdsFromSessions.size > 0
      ? await prisma.speaker.findMany({
          where: {
            id: { in: Array.from(speakerIdsFromSessions) },
            // Exclude speakers already in direct matches
            NOT: {
              id: { in: directMatches.map(s => s.id) }
            }
          },
          include: {
            sessions: {
              include: {
                session: {
                  select: {
                    id: true,
                    title: true,
                    tags: true
                  }
                }
              }
            }
          }
        })
      : [];

    // Combine results: direct matches first, then vector matches
    const allSpeakers = [...directMatches, ...vectorSpeakers];

    // Calculate relevance scores
    const speakersWithScores = allSpeakers.map(speaker => {
      let score = 0;
      const lowerQuery = query.toLowerCase();

      // Name match (highest priority)
      if (speaker.name.toLowerCase().includes(lowerQuery)) score += 10;

      // Role/Company match
      if (speaker.role?.toLowerCase().includes(lowerQuery)) score += 5;
      if (speaker.company?.toLowerCase().includes(lowerQuery)) score += 5;

      // Bio match
      if (speaker.bio?.toLowerCase().includes(lowerQuery)) score += 3;

      // Expertise match
      if (speaker.expertise?.some(e => e.toLowerCase().includes(lowerQuery))) score += 4;

      // Session relevance
      const sessionTitles = speaker.sessions?.map(s => s.session.title.toLowerCase()).join(' ') || '';
      const sessionTags = speaker.sessions?.flatMap(s => s.session.tags).join(' ').toLowerCase() || '';

      if (sessionTitles.includes(lowerQuery)) score += 2;
      if (sessionTags.includes(lowerQuery)) score += 2;

      return { ...speaker, score };
    });

    // Sort by score and return top results
    speakersWithScores.sort((a, b) => b.score - a.score);

    return NextResponse.json({
      speakers: speakersWithScores.slice(0, 15).map(({ score, ...speaker }) => speaker)
    });

  } catch (error) {
    console.error('Speaker search error:', error);
    return NextResponse.json(
      { error: 'Failed to search speakers' },
      { status: 500 }
    );
  }
}