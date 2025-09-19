import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';
import { checkSessionConflicts, ConflictCheckResult } from '@/lib/services/conflict-detector';
import unifiedAgendaService from '@/lib/services/unified-agenda-service';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'session', 'speaker', or null for all

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        favorites: {
          where: type ? { type } : undefined,
          include: {
            session: type === 'session' || !type ? {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            } : undefined,
            speaker: type === 'speaker' || !type ? true : undefined
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ favorites: user.favorites });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json({ error: 'Failed to fetch favorites' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId, speakerId, type, notes } = await req.json();

    if (!type || !['session', 'speaker'].includes(type)) {
      return NextResponse.json({ error: 'Valid type required (session or speaker)' }, { status: 400 });
    }

    if (type === 'session' && !sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (type === 'speaker' && !speakerId) {
      return NextResponse.json({ error: 'Speaker ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check for conflicts if adding a session favorite
    let conflictCheck: ConflictCheckResult | undefined;
    if (type === 'session' && sessionId) {
      // Fetch the session details
      const sessionToAdd = await prisma.session.findUnique({
        where: { id: sessionId }
      });

      if (sessionToAdd && sessionToAdd.startTime && sessionToAdd.endTime) {
        // Check if user has an active smart agenda
        const activeAgenda = await prisma.personalizedAgenda.findFirst({
          where: {
            userId: user.id,
            isActive: true,
            generatedBy: 'ai_agent'
          }
        });

        if (activeAgenda && activeAgenda.agendaData) {
          // Check for conflicts with the smart agenda
          conflictCheck = await checkSessionConflicts(sessionToAdd, activeAgenda.agendaData);
        }
      }
    }

    // Check if already favorited
    const existing = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        ...(type === 'session' ? { sessionId } : { speakerId })
      }
    });

    if (existing) {
      // Update notes if provided
      if (notes !== undefined) {
        const updated = await prisma.favorite.update({
          where: { id: existing.id },
          data: { notes },
          include: {
            session: type === 'session' ? {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            } : undefined,
            speaker: type === 'speaker' ? true : undefined
          }
        });
        return NextResponse.json({ favorite: updated, updated: true });
      }
      return NextResponse.json({ message: 'Already favorited', favorite: existing }, { status: 200 });
    }

    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        type,
        ...(type === 'session' ? { sessionId } : { speakerId }),
        notes
      },
      include: {
        session: type === 'session' ? {
          include: {
            speakers: {
              include: {
                speaker: true
              }
            }
          }
        } : undefined,
        speaker: type === 'speaker' ? true : undefined
      }
    });

    // Sync with Smart Agenda if it's a session favorite
    if (type === 'session' && sessionId) {
      const agendaSync = await unifiedAgendaService.addFavoriteToAgenda(user.id, sessionId);
      if (!agendaSync.success) {
        console.log('Failed to sync with Smart Agenda:', agendaSync.message);
      }
    }

    // Return the favorite with conflict information if applicable
    const response: any = { favorite };
    if (conflictCheck && conflictCheck.hasConflicts) {
      response.conflicts = conflictCheck;
      response.warning = 'This session conflicts with your Smart Agenda';
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json({ error: 'Failed to add favorite' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('sessionId');
    const speakerId = searchParams.get('speakerId');
    const type = searchParams.get('type');

    if (!type || !['session', 'speaker'].includes(type)) {
      return NextResponse.json({ error: 'Valid type required' }, { status: 400 });
    }

    if (type === 'session' && !sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (type === 'speaker' && !speakerId) {
      return NextResponse.json({ error: 'Speaker ID required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const favorite = await prisma.favorite.findFirst({
      where: {
        userId: user.id,
        ...(type === 'session' ? { sessionId } : { speakerId })
      }
    });

    if (!favorite) {
      return NextResponse.json({ error: 'Favorite not found' }, { status: 404 });
    }

    await prisma.favorite.delete({
      where: {
        id: favorite.id
      }
    });

    // Sync with Smart Agenda if it's a session favorite
    if (type === 'session' && sessionId) {
      const agendaSync = await unifiedAgendaService.removeFavoriteFromAgenda(user.id, sessionId);
      if (!agendaSync.success) {
        console.log('Failed to sync with Smart Agenda:', agendaSync.message);
      }
    }

    return NextResponse.json({ message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}