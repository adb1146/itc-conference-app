import { NextRequest, NextResponse } from 'next/server';
import EnhancedAgendaFetcherService from '@/lib/services/enhanced-agenda-fetcher';
import { PrismaClient } from '@prisma/client';
import { requireAdmin } from '@/lib/auth-guards';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Endpoint disabled in production' }, { status: 403 });
    }

    const adminCheck = await requireAdmin();
    if (adminCheck instanceof NextResponse) {
      return adminCheck;
    }

    const body = await request.json().catch(() => ({}));
    const url = body.url || 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda';

    console.log('Enhanced sync from:', url);

    const fetcher = new EnhancedAgendaFetcherService();
    const agendaData = await fetcher.fetchDetailedAgenda(url);

    if (agendaData.sessions && agendaData.sessions.length > 0) {
      let savedSessions = 0;
      let savedSpeakers = 0;
      let sessionSpeakerLinks = 0;
      
      for (const session of agendaData.sessions) {
        try {
          // Check if session exists
          const existingSession = await prisma.session.findUnique({
            where: { title: session.title }
          });

          let savedSession;
          if (existingSession) {
            // Update existing session
            savedSession = await prisma.session.update({
              where: { id: existingSession.id },
              data: {
                description: session.description || existingSession.description,
                startTime: session.startTime ? new Date(session.startTime) : existingSession.startTime,
                endTime: session.endTime ? new Date(session.endTime) : existingSession.endTime,
                location: session.location || existingSession.location,
                track: session.track || existingSession.track,
                lastUpdated: new Date()
              }
            });
          } else {
            // Create new session
            savedSession = await prisma.session.create({
              data: {
                title: session.title,
                description: session.description || '',
                startTime: session.startTime ? new Date(session.startTime) : new Date('2025-10-15T09:00:00'),
                endTime: session.endTime ? new Date(session.endTime) : new Date('2025-10-15T10:00:00'),
                location: session.location || 'TBD',
                track: session.track || null,
                tags: session.tags || [],
                sourceUrl: url,
              }
            });
            savedSessions++;
          }

          // Process speakers
          if (session.speakers && Array.isArray(session.speakers)) {
            for (const speaker of session.speakers) {
              if (speaker.name) {
                // Check if speaker exists
                const existingSpeaker = await prisma.speaker.findUnique({
                  where: { name: speaker.name }
                });

                let savedSpeaker;
                if (existingSpeaker) {
                  // Update speaker with new info if available
                  savedSpeaker = await prisma.speaker.update({
                    where: { id: existingSpeaker.id },
                    data: {
                      role: speaker.title || existingSpeaker.role,
                      company: speaker.company || existingSpeaker.company,
                      bio: speaker.bio || existingSpeaker.bio,
                      imageUrl: speaker.imageUrl || existingSpeaker.imageUrl,
                    }
                  });
                } else {
                  // Create new speaker
                  savedSpeaker = await prisma.speaker.create({
                    data: {
                      name: speaker.name,
                      role: speaker.title || null,
                      company: speaker.company || null,
                      bio: speaker.bio || null,
                      imageUrl: speaker.imageUrl || null,
                    }
                  });
                  savedSpeakers++;
                }

                // Link speaker to session
                const existingLink = await prisma.sessionSpeaker.findUnique({
                  where: {
                    sessionId_speakerId: {
                      sessionId: savedSession.id,
                      speakerId: savedSpeaker.id
                    }
                  }
                });

                if (!existingLink) {
                  await prisma.sessionSpeaker.create({
                    data: {
                      sessionId: savedSession.id,
                      speakerId: savedSpeaker.id
                    }
                  });
                  sessionSpeakerLinks++;
                }
              }
            }
          }
        } catch (error: any) {
          console.error(`Error processing session "${session.title}":`, error.message);
        }
      }

      // Get final counts
      const totalSessions = await prisma.session.count();
      const totalSpeakers = await prisma.speaker.count();
      const totalLinks = await prisma.sessionSpeaker.count();

      return NextResponse.json({
        success: true,
        message: `Enhanced sync complete`,
        stats: {
          newSessions: savedSessions,
          newSpeakers: savedSpeakers,
          newLinks: sessionSpeakerLinks,
          totalSessions,
          totalSpeakers,
          totalSessionSpeakerLinks: totalLinks
        },
        data: {
          conferenceTitle: agendaData.conferenceTitle,
          dates: agendaData.dates,
          processedSessions: agendaData.sessions.length
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No sessions found to sync',
      url
    });

  } catch (error: any) {
    console.error('Enhanced sync error:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync agenda',
        details: error.message
      },
      { status: 500 }
    );
  }
}
