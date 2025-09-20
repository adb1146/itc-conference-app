import { NextResponse } from 'next/server';
import { embeddingMonitor } from '@/lib/embedding-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const health = await embeddingMonitor.getHealthStatus();

    // Add CORS headers for monitoring tools
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    };

    return NextResponse.json(health, {
      status: health.status === 'healthy' ? 200 :
              health.status === 'degraded' ? 206 : 503,
      headers
    });
  } catch (error) {
    console.error('[API] Health check failed:', error);
    return NextResponse.json(
      {
        error: 'Health check failed',
        status: 'error',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}