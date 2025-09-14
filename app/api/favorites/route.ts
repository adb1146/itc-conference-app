import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';

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

    return NextResponse.json({ favorite });
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

    return NextResponse.json({ message: 'Favorite removed' });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json({ error: 'Failed to remove favorite' }, { status: 500 });
  }
}