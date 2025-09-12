import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(getAuthOptions());
    
    if (!session || !session.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const favorites = await prisma.favorite.findMany({
      where: { userId: user.id },
      include: {
        session: {
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            location: true,
            track: true,
            tags: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(favorites);
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch favorites' },
      { status: 500 }
    );
  }
}