import { NextRequest, NextResponse } from 'next/server';
import { generateICS, createSessionCalendarEvent } from '@/lib/calendar/ics-generator';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;

    // Get session details from query parameters
    const title = searchParams.get('title');
    const date = searchParams.get('date');
    const time = searchParams.get('time');
    const location = searchParams.get('location');
    const description = searchParams.get('description');
    const speakersParam = searchParams.get('speakers');

    // Validate required fields
    if (!title || !date || !time) {
      return NextResponse.json(
        { error: 'Missing required fields: title, date, and time are required' },
        { status: 400 }
      );
    }

    // Parse speakers if provided
    const speakers = speakersParam ? speakersParam.split(',').map(s => s.trim()) : undefined;

    // Create calendar event
    const calendarEvent = createSessionCalendarEvent(
      title,
      date,
      time,
      location || undefined,
      description || undefined,
      speakers
    );

    // Generate ICS content
    const icsContent = generateICS(calendarEvent);

    // Create filename (sanitize the title)
    const filename = `itc-vegas-${title.toLowerCase().replace(/[^a-z0-9]/g, '-').substring(0, 30)}.ics`;

    // Return ICS file with proper headers
    return new NextResponse(icsContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error generating calendar event:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate calendar event' },
      { status: 500 }
    );
  }
}