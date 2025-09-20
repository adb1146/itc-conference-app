/**
 * Mock API Route Handler
 * Provides fallback responses when API credits are exhausted
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();
    const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

    // Provide helpful mock responses based on common queries
    let response = '';

    if (lastMessage.includes('lunch') || lastMessage.includes('dinner') || lastMessage.includes('breakfast')) {
      response = `I'm currently operating in limited mode due to API limitations.

For conference meals, please check:
- **Sponsored Lunches**: Available each day in the main hall
- **WIISE Networking Lunch**: Special lunch event for women in InsureTech
- **Welcome Reception**: Evening networking with light refreshments

Visit the Agenda page to see the full schedule of meal events.`;
    } else if (lastMessage.includes('session') || lastMessage.includes('talk') || lastMessage.includes('presentation')) {
      response = `I'm currently operating in limited mode due to API limitations.

To explore sessions:
1. Visit the **Agenda** page for the complete conference schedule
2. Use the **Search** feature to find specific topics
3. Check the **Speakers** page to see presenter details

You can also use the filters on the Agenda page to find sessions by track, time, or location.`;
    } else if (lastMessage.includes('help') || lastMessage.includes('what can')) {
      response = `I'm currently operating in limited mode due to API limitations.

You can still:
- **Browse the Agenda**: View all conference sessions and events
- **Search Sessions**: Find talks by keyword, speaker, or topic
- **Manage Favorites**: Save sessions you're interested in
- **View Speakers**: See the full list of presenters
- **Explore Locations**: Find venue information

Please use the navigation menu to access these features directly.`;
    } else {
      response = `I'm currently operating in limited mode due to API limitations.

While I can't provide detailed responses right now, you can:
- Browse the **Agenda** for session information
- Use **Search** to find specific content
- Check **Speakers** for presenter details
- View **Locations** for venue information

Please explore these sections using the navigation menu for the information you need.`;
    }

    // Return a properly formatted response
    return NextResponse.json({
      content: response,
      role: 'assistant'
    });

  } catch (error) {
    console.error('Mock route error:', error);
    return NextResponse.json(
      {
        error: 'Service temporarily unavailable. Please try again later.',
        details: 'The chat service is experiencing technical difficulties.'
      },
      { status: 503 }
    );
  }
}