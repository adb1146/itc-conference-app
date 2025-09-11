import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET() {
  try {
    const speakers = await prisma.speaker.findMany({
      include: {
        sessions: {
          include: {
            session: {
              select: {
                id: true,
                title: true,
                startTime: true,
                endTime: true,
                track: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json({ 
      speakers,
      count: speakers.length 
    });
  } catch (error) {
    console.error('Error fetching speakers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch speakers' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}