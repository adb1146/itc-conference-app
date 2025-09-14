import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/db';
import {
  precomputeSessionSummaries,
  precomputeSpeakerSummaries,
  precomputeSessionEmbeddings
} from '@/lib/ai-precompute';

/**
 * Admin endpoint to trigger AI pre-computation
 * This should be run periodically or after data updates
 */

export async function POST(request: NextRequest) {
  try {
    // You might want to add authentication here
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.ADMIN_API_KEY}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { type } = await request.json();

    let result;

    switch (type) {
      case 'sessions':
        result = await precomputeSessionSummaries();
        break;

      case 'speakers':
        result = await precomputeSpeakerSummaries();
        break;

      case 'embeddings':
        result = await precomputeSessionEmbeddings();
        break;

      case 'all':
        const sessionResult = await precomputeSessionSummaries();
        const speakerResult = await precomputeSpeakerSummaries();
        const embeddingResult = await precomputeSessionEmbeddings();

        result = {
          sessions: sessionResult,
          speakers: speakerResult,
          embeddings: embeddingResult,
          total: {
            processed: sessionResult.processed + speakerResult.processed + embeddingResult.processed,
            failed: sessionResult.failed + speakerResult.failed + embeddingResult.failed
          }
        };
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid type. Use: sessions, speakers, embeddings, or all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      result,
      message: 'Pre-computation completed successfully'
    });

  } catch (error) {
    console.error('Pre-computation error:', error);
    return NextResponse.json(
      { error: 'Failed to run pre-computation', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET endpoint to check pre-computation status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const checkType = searchParams.get('check') || 'status';

    if (checkType === 'status') {
      const [
        sessionsWithSummaries,
        sessionsTotal,
        speakersWithSummaries,
        speakersTotal
      ] = await Promise.all([
        prisma.session.count({
          where: {
            NOT: {
              OR: [
                { enrichedSummary: null },
                { enrichedSummary: '' }
              ]
            }
          }
        }),
        prisma.session.count(),
        prisma.speaker.count({
          where: {
            NOT: {
              OR: [
                { profileSummary: null },
                { profileSummary: '' }
              ]
            }
          }
        }),
        prisma.speaker.count()
      ]);

      return NextResponse.json({
        sessions: {
          total: sessionsTotal,
          withSummaries: sessionsWithSummaries,
          percentage: Math.round((sessionsWithSummaries / sessionsTotal) * 100)
        },
        speakers: {
          total: speakersTotal,
          withSummaries: speakersWithSummaries,
          percentage: Math.round((speakersWithSummaries / speakersTotal) * 100)
        },
        lastUpdated: new Date().toISOString()
      });
    }

    return NextResponse.json({ error: 'Invalid check type' }, { status: 400 });

  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check status' },
      { status: 500 }
    );
  }
}