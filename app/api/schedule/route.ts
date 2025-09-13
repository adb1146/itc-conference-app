import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';

// GET user's schedule
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        favorites: {
          include: {
            session: {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const schedule = user.favorites.map(fav => ({
      sessionId: fav.sessionId,
      addedAt: fav.createdAt,
      session: {
        id: fav.session.id,
        title: fav.session.title,
        startTime: fav.session.startTime,
        endTime: fav.session.endTime,
        location: fav.session.location,
        track: fav.session.track,
        speakers: fav.session.speakers.map(ss => ({
          name: ss.speaker.name,
          role: ss.speaker.role,
          company: ss.speaker.company
        }))
      }
    }));

    return NextResponse.json({ schedule });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
      { status: 500 }
    );
  }
}

// POST - Add session to schedule
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ 
        error: 'Please sign in to add sessions to your schedule',
        requiresAuth: true 
      }, { status: 401 });
    }

    const { sessionId } = await request.json();

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if session exists
    const sessionExists = await prisma.session.findUnique({
      where: { id: sessionId }
    });

    if (!sessionExists) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Check if already in schedule
    const existingFavorite = await prisma.favorite.findUnique({
      where: {
        sessionId_userId: {
          sessionId: sessionId,
          userId: user.id
        }
      }
    });

    if (existingFavorite) {
      return NextResponse.json({ 
        message: 'Session already in your schedule',
        alreadyAdded: true 
      });
    }

    // Add to schedule
    const favorite = await prisma.favorite.create({
      data: {
        userId: user.id,
        sessionId: sessionId
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Session added to your schedule',
      favorite 
    });
  } catch (error) {
    console.error('Error adding to schedule:', error);
    return NextResponse.json(
      { error: 'Failed to add session to schedule' },
      { status: 500 }
    );
  }
}

// DELETE - Remove from schedule
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    await prisma.favorite.delete({
      where: {
        sessionId_userId: {
          sessionId: sessionId,
          userId: user.id
        }
      }
    });

    return NextResponse.json({ 
      success: true,
      message: 'Session removed from your schedule' 
    });
  } catch (error) {
    console.error('Error removing from schedule:', error);
    return NextResponse.json(
      { error: 'Failed to remove session from schedule' },
      { status: 500 }
    );
  }
}