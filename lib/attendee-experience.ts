/**
 * Attendee Experience Module
 * Provides practical, contextual information for conference attendees
 */

import conferenceKnowledge from '@/data/conference-knowledge.json';
import partiesEvents from '@/data/parties-events.json';

export interface AttendeeNeed {
  intent: string;
  response: string;
  suggestions?: string[];
}

/**
 * Get context-aware responses for common attendee needs
 */
export function getAttendeeNeedResponse(intent: string, timeContext?: Date): AttendeeNeed {
  const hour = timeContext ? timeContext.getHours() : new Date().getHours();

  // Practical need responses based on intent
  const needResponses: Record<string, AttendeeNeed> = {
    tired: {
      intent: 'tired',
      response: `I understand conferences can be exhausting! Here are some recharge options:

**Quiet Spaces:**
- Business Center (Level 2) - 24/7 access with comfortable seating
- Breakers Room - Usually quiet between sessions
- Pool area - Peaceful outdoor space

**Coffee Spots:**
- Starbucks in lobby (opens 6 AM)
- Conference coffee stations (refreshed every 2 hours)
- Raffles Cafe - 24-hour option

Take a 15-minute break - you'll feel much better!`,
      suggestions: [
        "Where's the nearest coffee?",
        "Any quiet spaces for calls?",
        "When's the next break?"
      ]
    },

    hungry: {
      intent: 'hungry',
      response: hour < 9 ?
        `**Breakfast Options:**
- Conference breakfast: 7:30-9:00 AM in Ballroom Foyer (included)
- Starbucks: Lobby level (pastries & sandwiches)
- Raffles Cafe: 24-hour dining

The conference breakfast has a great spread - worth checking out!` :
        hour < 14 ?
        `**Lunch Options:**
- Conference lunch: 12:00-1:30 PM in Ballroom Foyer (included)
- Citizens: Quick casual dining
- Border Grill: Great for groups
- Food Court: Casino level for quick bites

Conference lunch is buffet-style with good variety!` :
        `**Dinner Options:**
- StripSteak: Premium steakhouse (reserve ahead)
- Border Grill: Mexican, good for groups
- Libertine Social: Gastropub with craft cocktails
- Citizens: Casual, open late
- Nearby: Luxor Food Court (5-min walk)

Pro tip: Happy hours at sponsor booths 5-6:30 PM!`,
      suggestions: [
        "What's included with registration?",
        "Any group dinners tonight?",
        "Where are the happy hours?"
      ]
    },

    lost: {
      intent: 'lost',
      response: `Let me help you navigate! **Main Areas:**

**Level 1:**
- Registration: Main entrance
- Ballrooms A-F: Straight from registration
- Expo Floor: Convention Center Main Hall
- Bayside Lawn: Follow signs to beach exit

**Level 2:**
- Jasmine/South Pacific: Main session rooms
- Breakers/Surf/Shoreline: Breakout rooms
- Business Center: Quiet space

**Quick tip:** Follow the ITC Vegas signs - they're everywhere! The app also has an interactive map.`,
      suggestions: [
        "Where's the main stage?",
        "How do I get to Expo Floor?",
        "Where's registration?"
      ]
    },

    networking: {
      intent: 'networking',
      response: `**Best Networking Opportunities Right Now:**

${hour < 10 ?
  `- Morning Coffee: Convention Foyer (until 9 AM)
- Breakfast meetups: Check the app for industry groups
- Early Expo Floor: Less crowded, vendors more available` :
  hour < 17 ?
  `- Lunch networking: Ballroom Foyer (12-1:30 PM)
- Expo Floor: Peak activity time
- Startup Alley: Great for innovation discussions
- Coffee breaks: 10:30 AM & 3:30 PM at all levels` :
  `- Happy Hours: 5-6:30 PM at sponsor booths
- Evening meetups: Check app for tonight's events
- ${hour >= 18 ? "Opening party starts at 6 PM!" : "Dinner groups forming now"}`}

**Pro tips:**
- Use the app to schedule 1:1 meetings
- Business cards still matter - have them ready
- Best conversations happen in coffee lines!`,
      suggestions: [
        "Who should I meet?",
        "Any meetups for my industry?",
        "How do I schedule 1:1s?"
      ]
    },

    overwhelmed: {
      intent: 'overwhelmed',
      response: `I get it - ITC Vegas is huge! Let's make it manageable:

**Start Small:**
1. Pick 2-3 must-see sessions today
2. Visit 5 vendor booths that interest you
3. Set a goal of 3 quality conversations

**Take Breaks:**
- Quiet spaces: Business Center (Level 2)
- Outdoor break: Bayside Lawn or Pool area
- Skip a session if you need to recharge

**Remember:**
- You can't see everything - and that's okay
- Quality > Quantity for networking
- The app has session recordings available later

You've got this! Focus on what matters most to you.`,
      suggestions: [
        "What are today's must-see sessions?",
        "Where can I take a break?",
        "Help me prioritize"
      ]
    },

    bored: {
      intent: 'bored',
      response: `Let's find something exciting for you!

**Happening Now:**
${hour < 17 ?
  `- Startup Alley: See cutting-edge demos
- Expo Floor: 600+ vendors with interactive displays
- Innovation Theater: Quick 15-min talks` :
  `- Happy hours starting at sponsor booths
- Networking games in Convention Foyer
- ${partiesEvents.parties.opening.date === new Date().toISOString().split('T')[0] ?
    "Opening party starts at 6 PM!" : "Check tonight's special events"}`}

**Interactive Experiences:**
- VR demos at tech pavilion
- Live product launches throughout the day
- Gamification challenges in the app

**Hidden Gems:**
- Rooftop sessions (if weather permits)
- Startup pitch practice rooms
- Executive roundtables (check eligibility)`,
      suggestions: [
        "What's the coolest tech demo?",
        "Any parties tonight?",
        "Where's the fun stuff?"
      ]
    }
  };

  return needResponses[intent] || {
    intent: 'general',
    response: "I'm here to help! What do you need assistance with?",
    suggestions: [
      "What's happening now?",
      "Where should I go?",
      "Help me network"
    ]
  };
}

/**
 * Get time-aware activity suggestions
 */
export function getTimeAwareActivities(date: Date = new Date()): string[] {
  const hour = date.getHours();
  const day = date.toISOString().split('T')[0];

  if (hour < 9) {
    return [
      "Grab breakfast in Ballroom Foyer",
      "Check out early Expo Floor (less crowded)",
      "Join morning coffee networking",
      "Review today's agenda"
    ];
  } else if (hour < 12) {
    return [
      "Attend morning keynotes",
      "Visit Startup Alley",
      "Schedule afternoon 1:1 meetings",
      "Explore Expo Floor"
    ];
  } else if (hour < 14) {
    return [
      "Network over lunch",
      "Quick Expo Floor visits",
      "Recharge in quiet space",
      "Catch up on emails"
    ];
  } else if (hour < 17) {
    return [
      "Attend breakout sessions",
      "Demo meetings at vendor booths",
      "Afternoon coffee break networking",
      "Visit Innovation Theater"
    ];
  } else if (hour < 19) {
    return [
      "Happy hour at sponsor booths",
      "Evening meetups",
      "Dinner planning",
      day === partiesEvents.parties.opening.date ? "Head to opening party!" : "Evening networking"
    ];
  } else {
    return [
      "Conference parties",
      "Dinner with new connections",
      "Plan tomorrow's schedule",
      "Rest up for tomorrow"
    ];
  }
}

/**
 * Get practical tips based on conference day
 */
export function getDaySpecificTips(dayNumber: number): string[] {
  switch(dayNumber) {
    case 1:
      return [
        "Pick up your badge early to avoid lines",
        "Don't miss the opening keynote at 9 AM",
        "Opening party at 6 PM - don't miss it!",
        "Download the app and set up your profile",
        "Scope out the Expo Floor layout"
      ];
    case 2:
      return [
        "Busiest day - arrive early for popular sessions",
        "Startup Pitch Competition at 3 PM",
        "Multiple happy hours - pace yourself",
        "Best day for vendor meetings",
        "Schedule follow-ups for Day 3"
      ];
    case 3:
      return [
        "Closing keynote at 3 PM is a must-see",
        "Last chance for vendor demos",
        "Closing party starts at 7 PM",
        "Exchange contact info before people leave",
        "Book late flight - party goes until midnight"
      ];
    default:
      return [
        "Check today's special events",
        "Review your schedule",
        "Stay hydrated",
        "Take breaks when needed"
      ];
  }
}

/**
 * Get response for practical questions
 */
export function getPracticalInfo(topic: string): string {
  const info: Record<string, string> = {
    wifi: `**WiFi Information:**
- Network: ITC2025
- Password: Posted at registration
- Backup: Mandalay Bay guest WiFi (paid)
- Best signal: Main ballrooms and Expo Floor`,

    parking: `**Parking Options:**
- Self-parking: $15/day
- Valet: $25/day
- Rideshare pickup: North Entrance
- Tip: Arrive before 8 AM for closer spots`,

    charging: `**Charging Stations:**
- Every ballroom entrance
- Business Center (Level 2)
- Expo Floor info desks
- Bring a portable charger - outlets are competitive!`,

    dress: `**Dress Code Guide:**
- Sessions: Business casual
- Opening party: Business casual, comfortable shoes
- Closing party: Cocktail attire or festive business casual
- Expo Floor: Comfortable shoes essential (15,000+ steps!)
- Las Vegas tip: Layers - venues are cold, outside is warm`,

    app: `**Mobile App Tips:**
- Download: Search "ITC Vegas" in app stores
- Features: Schedule builder, 1:1 meeting scheduler, attendee networking
- Pro tip: Enable notifications for session changes
- QR code scanner for quick contact exchange`,

    registration: `**Registration Info:**
- Location: Convention Center Main Entrance
- Day 1: 7:00 AM - 6:00 PM
- Day 2: 7:30 AM - 5:00 PM
- Day 3: 8:00 AM - 3:00 PM
- Bring ID and confirmation email`,

    meals: `**Included Meals:**
- Breakfast: 7:30-9:00 AM (Continental)
- Lunch: 12:00-1:30 PM (Buffet)
- Coffee/Snacks: All day at stations
- Happy Hours: 5-6:30 PM at sponsor booths
- Parties include food and drinks`
  };

  return info[topic] || "I don't have specific information about that, but check with the registration desk!";
}

/**
 * Get navigation help
 */
export function getNavigationHelp(from: string, to: string): string {
  const routes: Record<string, string> = {
    'registration-to-ballroom': 'From Registration: Walk straight ahead, ballrooms are past the escalators (2-min walk)',
    'registration-to-expo': 'From Registration: Turn right, follow signs to Convention Center Main Hall (3-min walk)',
    'ballroom-to-expo': 'From Ballrooms: Exit to main corridor, turn left to Convention Center (2-min walk)',
    'anywhere-to-breakfast': 'Breakfast is in Ballroom Foyer - follow the coffee smell!',
    'anywhere-to-party': 'Evening parties: Follow the music! Usually Bayside Lawn or Beach area',
  };

  const key = `${from.toLowerCase()}-to-${to.toLowerCase()}`;
  return routes[key] || `From ${from} to ${to}: Follow the ITC Vegas signs or check the app's interactive map!`;
}