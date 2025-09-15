/**
 * Conference-specific context for AI responses
 */

import conferenceKnowledge from '@/data/conference-knowledge.json';

export function getConferenceContext(): string {
  return `
## ITC Vegas 2025 Conference Information

### Key Details
- **Dates**: October 14-16, 2025 (Pre-conference: October 13)
- **Venue**: Mandalay Bay Resort and Casino, Las Vegas
- **Expected Attendance**: 8,000+ insurance and insurtech professionals
- **Main Themes**: AI/Automation, Digital Distribution, Claims Innovation, Embedded Insurance

### Venue Information
- **Location**: ${conferenceKnowledge.conference.venue.address}
- **WiFi**: Complimentary - Network: ITC2025
- **Registration Desk**: Convention Center Main Entrance
- **Parking**: $15/day self-parking, $25/day valet

### Important Schedule Points
- **Day 1 (Oct 14)**: Opening keynote at 9:00 AM, Welcome reception at 6:00 PM
- **Day 2 (Oct 15)**: Innovation Awards at 7:00 PM
- **Day 3 (Oct 16)**: Closing keynote at 3:00 PM

### Special Events
${conferenceKnowledge.conference.specialEvents.map(event =>
  `- **${event.name}**: ${event.date} at ${event.time} in ${event.location}`
).join('\n')}

### Transportation
- **Airport**: Harry Reid International (LAS) - 10 minutes from venue
- **Shuttles**: Complimentary every 30 minutes
- **Rideshare Pickup**: North Entrance

### Networking Opportunities
- Opening Reception (Oct 14, 6pm) - Bayside Lawn
- Innovation Awards (Oct 15, 7pm) - Ballroom A
- Daily networking breaks at 10:30 AM and 3:30 PM
- Startup Alley open throughout conference

### Tips for Attendees
- Download the ITC Vegas mobile app for real-time updates
- Business casual dress code recommended
- Bring layers - conference rooms can be cold
- Hydrate frequently - Las Vegas is dry
- Book restaurant reservations early

### Contact Information
- Help Desk: help@itcvegas.com
- Emergency: 702-555-0911
- Conference App: Search "ITC Vegas" in app stores
`;
}

export function getVenueNavigationHelp(): string {
  return `
## Venue Navigation Tips

### Main Areas
- **Ballrooms A-F**: Main keynote and large sessions (Level 1)
- **Jasmine/South Pacific**: Track sessions (Level 2)
- **Breakers/Surf/Shoreline**: Breakout rooms (Level 2)
- **Bayside Lawn**: Networking events (Outside, Level 1)
- **Convention Foyer**: Exhibitor hall and Startup Alley (Level 1)

### Quick Routes
- **From Registration to Ballrooms**: Straight ahead, 2-minute walk
- **To Breakout Rooms**: Take escalators near registration to Level 2
- **To Networking Areas**: Follow signs to Bayside exit
- **Restrooms**: Located at every ballroom entrance
- **Quiet Spaces**: Business center on Level 2

### Food & Beverage
- **Conference Meals**: Ballroom Foyer
- **Coffee Stations**: Every floor, refilled every 2 hours
- **Restaurants**: Multiple options in casino (reservations recommended)
- **Bars**: Conference bar in Convention Foyer, plus casino bars
`;
}

export function getNetworkingTips(): string {
  return `
## Networking Best Practices at ITC Vegas

### Key Networking Zones
1. **Startup Alley**: Meet innovative startups (Convention Foyer)
2. **Executive Lounge**: C-suite networking (Jasmine Room, by invitation)
3. **Coffee Breaks**: Informal networking (10:30 AM & 3:30 PM daily)
4. **Evening Events**: Opening Reception, Innovation Awards

### Networking Tips
- Use the mobile app's "Connect" feature to find attendees
- Wear your badge visibly - it has NFC for quick contact exchange
- Join track-specific meetups announced in the app
- Visit Startup Alley during breaks for demos
- Book 1:1 meetings through the app's scheduler

### Industry Meetups
- **Carriers Breakfast**: Day 2, 7:30 AM, Breakers Room
- **Insurtech Founders**: Day 1, 5:00 PM, Surf Room
- **Women in Insurance**: Day 2, 12:30 PM, Shoreline Room
- **Young Professionals**: Day 1, 5:30 PM, Bayside Lawn
`;
}

export function getDiningRecommendations(): string {
  return `
## Dining at Mandalay Bay

### Conference Included Meals
- **Breakfast**: 7:30-9:00 AM, Ballroom Foyer (Continental)
- **Lunch**: 12:00-1:30 PM, Ballroom Foyer (Buffet)
- **Coffee/Snacks**: Available all day at stations

### Recommended Restaurants (Book Early!)
- **Aureole**: Fine dining, wine tower spectacular
- **StripSteak**: Premium steakhouse
- **Border Grill**: Mexican, great for groups
- **Libertine Social**: Gastropub, craft cocktails
- **Citizens**: Casual, open late
- **Raffles Cafe**: 24-hour dining

### Quick Bites
- **Starbucks**: Lobby level, opens 6 AM
- **Food Court**: Casino level, various options
- **Hussong's Cantina**: Quick Mexican, good margaritas

### Nearby Options (5-10 min walk)
- **Luxor Food Court**: Budget-friendly variety
- **Excalibur**: Multiple casual dining options
- **Town Square** (10 min Uber): Many restaurants and bars
`;
}