import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function getNetworkingEvents(specificDay?: string) {
  try {
    // Keywords that indicate networking events
    const networkingKeywords = [
      'party', 'parties', 'happy hour', 'networking', 'mixer',
      'reception', 'cocktail', 'wine', 'whiskey', 'tasting',
      'lunch', 'breakfast', 'coffee', 'margarita', 'bourbon',
      'kickoff', 'closing', 'meet & greet', 'showcase'
    ];

    // Fetch all sessions
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' },
      include: {
        speakers: {
          include: { speaker: true }
        }
      }
    });

    // Filter for networking events
    const networkingEvents = sessions.filter(session => {
      const title = session.title.toLowerCase();
      const desc = (session.description || '').toLowerCase();
      const tags = (session.tags || []).map(t => t.toLowerCase());

      return networkingKeywords.some(keyword =>
        title.includes(keyword) ||
        desc.includes(keyword) ||
        tags.includes('networking') ||
        tags.includes('meal')
      );
    });

    // Group by day
    const eventsByDay: Record<string, any[]> = {
      'Monday, Oct 13': [],
      'Tuesday, Oct 14': [],
      'Wednesday, Oct 15': [],
      'Thursday, Oct 16': []
    };

    networkingEvents.forEach(event => {
      const date = new Date(event.startTime);
      const dayKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });

      // Map to conference days
      if (dayKey.includes('Oct 13')) {
        eventsByDay['Monday, Oct 13'].push(event);
      } else if (dayKey.includes('Oct 14')) {
        eventsByDay['Tuesday, Oct 14'].push(event);
      } else if (dayKey.includes('Oct 15')) {
        eventsByDay['Wednesday, Oct 15'].push(event);
      } else if (dayKey.includes('Oct 16')) {
        eventsByDay['Thursday, Oct 16'].push(event);
      }
    });

    // Check if looking for specific day
    const requestedDay = specificDay?.toLowerCase();
    let dayFilter: string | null = null;

    if (requestedDay) {
      if (requestedDay.includes('monday') || requestedDay.includes('13')) {
        dayFilter = 'Monday, Oct 13';
      } else if (requestedDay.includes('tuesday') || requestedDay.includes('14')) {
        dayFilter = 'Tuesday, Oct 14';
      } else if (requestedDay.includes('wednesday') || requestedDay.includes('15')) {
        dayFilter = 'Wednesday, Oct 15';
      } else if (requestedDay.includes('thursday') || requestedDay.includes('16')) {
        dayFilter = 'Thursday, Oct 16';
      }
    }

    // Format response
    let response = "";

    // If specific day requested, only show that day
    if (dayFilter) {
      const dayEvents = eventsByDay[dayFilter] || [];

      if (dayEvents.length === 0) {
        response = `No networking events found for ${dayFilter}. Check the agenda for other sessions that day.`;
      } else {
        response = `**🎉 ${dayFilter} Networking Events & Parties**\n\n`;
        response += `Found **${dayEvents.length} networking opportunities** on ${dayFilter}:\n\n`;

        // List all events for that day
        dayEvents.forEach(event => {
          const time = new Date(event.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          response += `• **${time}**: ${event.title}\n`;
          if (event.location && event.location !== 'TBD') {
            response += `  📍 ${event.location}\n`;
          }
          if (event.track) {
            response += `  🏷️ Track: ${event.track}\n`;
          }
          response += '\n';
        });
      }
    } else {
      // Show all days
      response = "**🎉 ITC Vegas 2025 Networking Events & Parties**\n\n";

      // Highlight major events
      const majorEvents = [
        {
          name: 'ITC Vegas Official Kickoff Party',
          day: 'Tuesday, Oct 14',
          time: '5:00 PM',
          location: 'House of Blues (Mandalay Bay Casino)'
        },
        {
          name: 'ITC Vegas Official Closing Party featuring the Goo Goo Dolls!',
          day: 'Thursday, Oct 16',
          time: '9:00 PM',
          location: 'Oceanside Ballroom CD'
        }
      ];

      response += "**🌟 Major Parties:**\n";
      majorEvents.forEach(event => {
        const session = networkingEvents.find(s => s.title.includes(event.name));
        if (session) {
          response += `• **${event.name}**\n`;
          response += `  📅 ${event.day} at ${event.time}\n`;
          response += `  📍 ${event.location}\n\n`;
        }
      });

      // List events by day
      Object.entries(eventsByDay).forEach(([day, events]) => {
        if (events.length > 0) {
          response += `**${day}** (${events.length} networking opportunities):\n`;

        // Show up to 5 events per day
        events.slice(0, 5).forEach(event => {
          const time = new Date(event.startTime).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          response += `• **${time}**: ${event.title}\n`;
          if (event.location && event.location !== 'TBD') {
            response += `  📍 ${event.location}\n`;
          }
        });

        if (events.length > 5) {
          response += `  *...and ${events.length - 5} more networking opportunities*\n`;
        }
        response += '\n';
      }
    });

    // Add tips
    response += "**💡 Networking Tips:**\n";
    response += "• Download the [official ITC Vegas 2025 app](https://apps.apple.com/us/app/itc-vegas-2025/id1637886092) to schedule 1:1 meetings\n";
    response += "• Business cards are still important - bring plenty\n";
    response += "• Happy hours and coffee breaks are prime networking times\n";
    response += "• The Expo Floor is open all day for casual networking\n";

    return response;
  } catch (error) {
    console.error('Error fetching networking events:', error);
    return "I'm having trouble accessing the event schedule right now. Please try again or check the agenda page.";
  }
}