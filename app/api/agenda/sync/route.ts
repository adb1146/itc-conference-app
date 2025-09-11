import { NextRequest, NextResponse } from 'next/server';
import AgendaFetcherService from '@/lib/services/agenda-fetcher';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    // Default to the ITC Vegas 2025 agenda URL
    const body = await request.json().catch(() => ({}));
    const url = body.url || 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda';

    console.log('Syncing agenda from:', url);

    const fetcher = new AgendaFetcherService();
    const agendaData = await fetcher.fetchConferenceAgenda(url);

    // Store sessions in database
    if (agendaData.sessions && agendaData.sessions.length > 0) {
      let savedCount = 0;
      let errorCount = 0;
      
      for (const session of agendaData.sessions) {
        try {
          // First try to find existing session by title
          const existingSession = await prisma.session.findUnique({
            where: { title: session.title || `Session ${savedCount + 1}` }
          });

          let savedSession;
          if (existingSession) {
            // Update existing session
            savedSession = await prisma.session.update({
              where: { id: existingSession.id },
              data: {
                description: session.description || '',
                startTime: session.startTime ? new Date(session.startTime) : new Date('2025-10-15T09:00:00'),
                endTime: session.endTime ? new Date(session.endTime) : new Date('2025-10-15T10:00:00'),
                location: session.location || 'TBD',
                track: session.track || null,
                level: session.level || null,
                tags: session.tags || [],
                sourceUrl: url,
                lastUpdated: new Date()
              }
            });
          } else {
            // Create new session
            savedSession = await prisma.session.create({
              data: {
                title: session.title || `Session ${savedCount + 1}`,
                description: session.description || '',
                startTime: session.startTime ? new Date(session.startTime) : new Date('2025-10-15T09:00:00'),
                endTime: session.endTime ? new Date(session.endTime) : new Date('2025-10-15T10:00:00'),
                location: session.location || 'TBD',
                track: session.track || null,
                level: session.level || null,
                tags: session.tags || [],
                sourceUrl: url,
              }
            });
          }

          // Save speakers if provided
          if (session.speakers && Array.isArray(session.speakers)) {
            for (const speaker of session.speakers) {
              if (speaker.name) {
                // First check if speaker exists
                const existingSpeaker = await prisma.speaker.findUnique({
                  where: { name: speaker.name }
                });

                // Create or update speaker with enhanced data
                const savedSpeaker = await prisma.speaker.upsert({
                  where: { 
                    name: speaker.name 
                  },
                  update: {
                    bio: speaker.bio || existingSpeaker?.bio || null,
                    company: speaker.company || existingSpeaker?.company || null,
                    role: speaker.title || speaker.role || existingSpeaker?.role || null,
                    imageUrl: speaker.imageUrl || existingSpeaker?.imageUrl || null,
                  },
                  create: {
                    name: speaker.name,
                    bio: speaker.bio || null,
                    company: speaker.company || null,
                    role: speaker.title || speaker.role || null,
                    imageUrl: speaker.imageUrl || null,
                  },
                });

                // Check if link already exists before creating
                const existingLink = await prisma.sessionSpeaker.findUnique({
                  where: {
                    sessionId_speakerId: {
                      sessionId: savedSession.id,
                      speakerId: savedSpeaker.id
                    }
                  }
                });

                if (!existingLink) {
                  // Link speaker to session
                  await prisma.sessionSpeaker.create({
                    data: {
                      sessionId: savedSession.id,
                      speakerId: savedSpeaker.id
                    }
                  });
                }
              }
            }
          }
          
          savedCount++;
        } catch (error: any) {
          console.error(`Error saving session "${session.title}":`, error.message);
          errorCount++;
        }
      }

      // Get database stats
      const totalSessions = await prisma.session.count();
      const totalSpeakers = await prisma.speaker.count();

      return NextResponse.json({
        success: true,
        message: `Successfully synced ${savedCount} of ${agendaData.sessions.length} sessions`,
        stats: {
          fetched: agendaData.sessions.length,
          saved: savedCount,
          errors: errorCount,
          totalInDatabase: totalSessions,
          totalSpeakers: totalSpeakers,
          url: url
        },
        data: {
          conferenceTitle: agendaData.conferenceTitle,
          dates: agendaData.dates,
          totalSessions: agendaData.totalSessions
        }
      });
    }

    return NextResponse.json({
      success: false,
      message: 'No sessions found to sync',
      url: url
    });

  } catch (error: any) {
    console.error('Error syncing agenda:', error);
    return NextResponse.json(
      { 
        error: 'Failed to sync agenda',
        details: error.message
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const sessionCount = await prisma.session.count();
    const speakerCount = await prisma.speaker.count();
    const lastSession = await prisma.session.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      status: 'ready',
      message: 'Sync endpoint ready. POST to sync agenda from ITC Vegas 2025.',
      database: {
        connected: true,
        sessions: sessionCount,
        speakers: speakerCount,
        lastSync: lastSession?.createdAt || null
      }
    });
  } catch (error: any) {
    return NextResponse.json({
      status: 'ready',
      message: 'Sync endpoint ready. Database not connected.',
      database: {
        connected: false,
        error: error.message
      }
    });
  }
}