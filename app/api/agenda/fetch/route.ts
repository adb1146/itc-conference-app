import { NextRequest, NextResponse } from 'next/server';
import AgendaFetcherService from '@/lib/services/agenda-fetcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url, test } = body;

    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'YOUR_ACTUAL_API_KEY_HERE') {
      return NextResponse.json(
        { 
          error: 'Anthropic API key not configured',
          message: 'Please add your ANTHROPIC_API_KEY to the .env.local file'
        },
        { status: 500 }
      );
    }

    const fetcher = new AgendaFetcherService();

    if (test) {
      console.log('Running Web Fetch test...');
      const result = await fetcher.testWebFetch();
      return NextResponse.json({ 
        success: true, 
        message: 'Web Fetch test completed',
        result 
      });
    }

    if (!url) {
      return NextResponse.json(
        { error: 'URL is required' },
        { status: 400 }
      );
    }

    console.log('Fetching agenda from URL:', url);
    const agendaData = await fetcher.fetchConferenceAgenda(url);

    return NextResponse.json({
      success: true,
      message: `Fetched ${agendaData.sessions?.length || 0} sessions`,
      data: agendaData
    });

  } catch (error: any) {
    console.error('Error in agenda fetch API:', error);
    
    const errorMessage = error.message || 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      status: error.status,
      type: error.constructor.name,
    };
    
    if (errorMessage.includes('401') || errorMessage.includes('Invalid API')) {
      return NextResponse.json(
        { 
          error: 'Invalid API key',
          details: 'Please check your ANTHROPIC_API_KEY in .env.local',
          debug: errorDetails
        },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch agenda',
        details: errorMessage,
        debug: errorDetails
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const hasApiKey = !!process.env.ANTHROPIC_API_KEY && 
                    process.env.ANTHROPIC_API_KEY !== 'YOUR_ACTUAL_API_KEY_HERE';
  
  return NextResponse.json({
    status: hasApiKey ? 'ready' : 'not configured',
    message: hasApiKey 
      ? 'Web Fetch service is ready. POST to this endpoint with a URL to fetch agenda.'
      : 'Please configure your ANTHROPIC_API_KEY in .env.local',
    testEndpoint: '/api/agenda/fetch (POST with {test: true})',
    fetchEndpoint: '/api/agenda/fetch (POST with {url: "conference-url"})',
  });
}