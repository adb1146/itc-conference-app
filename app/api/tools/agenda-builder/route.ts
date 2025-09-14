import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import { generateFastAgenda } from '@/lib/tools/schedule/fast-agenda-builder';
import { AgendaOptions } from '@/lib/tools/schedule/types';
import prisma from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          requiresAuth: true,
          message: 'Please sign in to generate a personalized agenda'
        },
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await req.json();
    const options: Partial<AgendaOptions> = body.options || {};

    // Generate smart agenda using fast algorithm
    const result = await generateFastAgenda(user.id, options);

    if (!result.success) {
      return NextResponse.json(
        {
          error: result.error || 'Failed to generate agenda'
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agenda: result.agenda,
      message: 'Agenda generated successfully'
    });

  } catch (error) {
    console.error('Error in agenda builder API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(getAuthOptions());

    if (!session?.user?.email) {
      return NextResponse.json(
        {
          error: 'Authentication required',
          requiresAuth: true,
          message: 'Please sign in to view your agenda'
        },
        { status: 401 }
      );
    }

    // Get user from database
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
            },
            speaker: true
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user's favorites and profile for agenda generation
    return NextResponse.json({
      favorites: user.favorites,
      profile: {
        interests: user.interests,
        goals: user.goals,
        role: user.role,
        organizationType: user.organizationType
      },
      stats: {
        totalFavorites: user.favorites.length,
        sessionFavorites: user.favorites.filter(f => f.type === 'session').length,
        speakerFavorites: user.favorites.filter(f => f.type === 'speaker').length
      }
    });

  } catch (error) {
    console.error('Error fetching agenda data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}