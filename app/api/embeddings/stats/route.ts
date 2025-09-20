import { NextResponse } from 'next/server';
import prisma from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Get total sessions count
    const total = await prisma.session.count();

    // Get sessions with embeddings
    const withEmbeddings = await prisma.session.count({
      where: {
        embedding: { isEmpty: false }
      }
    });

    // Get meal sessions count
    const mealSessions = await prisma.session.count({
      where: {
        OR: [
          { title: { contains: 'lunch', mode: 'insensitive' } },
          { title: { contains: 'breakfast', mode: 'insensitive' } },
          { title: { contains: 'dinner', mode: 'insensitive' } },
          { title: { contains: 'meal', mode: 'insensitive' } },
          { title: { contains: 'coffee', mode: 'insensitive' } },
          { title: { contains: 'reception', mode: 'insensitive' } }
        ]
      }
    });

    // Get last updated session
    const lastUpdatedSession = await prisma.session.findFirst({
      where: {
        embedding: { isEmpty: false }
      },
      orderBy: {
        lastUpdated: 'desc'
      },
      select: {
        lastUpdated: true
      }
    });

    const stats = {
      total,
      withEmbeddings,
      withoutEmbeddings: total - withEmbeddings,
      coverage: total > 0 ? ((withEmbeddings / total) * 100).toFixed(2) + '%' : '0%',
      mealSessions,
      lastEmbeddingUpdate: lastUpdatedSession?.lastUpdated || null,
      timestamp: new Date().toISOString(),
      status: withEmbeddings === 0 ? 'no_embeddings' :
              withEmbeddings < total * 0.5 ? 'partial' :
              withEmbeddings < total * 0.95 ? 'good' : 'complete'
    };

    return NextResponse.json(stats, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      }
    });
  } catch (error) {
    console.error('[API] Stats check failed:', error);
    return NextResponse.json(
      {
        error: 'Stats check failed',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}