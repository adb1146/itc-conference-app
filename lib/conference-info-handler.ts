// Conference Information Handler - Provides rich, detailed responses about ITC Vegas 2025

import partiesEvents from '@/data/parties-events.json';
import conferenceKnowledge from '@/data/conference-knowledge.json';

interface DetailedResponse {
  content: string;
  quickActions?: string[];
  relatedTopics?: string[];
  tips?: string[];
}

export function getPartyInformation(query: string): DetailedResponse {
  const queryLower = query.toLowerCase();
  const currentDate = new Date();
  const hour = currentDate.getHours();

  // Check what specific party info they're asking about
  const isTonight = queryLower.includes('tonight') || queryLower.includes('today');
  const isTomorrow = queryLower.includes('tomorrow');
  const isOpening = queryLower.includes('opening');
  const isClosing = queryLower.includes('closing');

  let content = `## 🎉 **ITC Vegas 2025 Party & Events Guide**\n\n`;

  // Main parties
  content += `### 🌟 **Main Conference Parties**\n\n`;

  // Opening Party
  content += `#### **Opening Reception** - Tuesday, October 14\n`;
  content += `📍 **Location:** [Mandalay Bay Beach & Convention Foyer](/locations?location=Mandalay%20Bay%20Beach)\n`;
  content += `🕐 **Time:** 6:00 PM - 10:00 PM\n`;
  content += `👔 **Dress Code:** Business casual (comfortable shoes recommended)\n`;
  content += `🍸 **Included:** Open bar, heavy appetizers, live entertainment\n\n`;
  content += `**Pro Tips:**\n`;
  content += `• Arrive by 6:30 PM for opening remarks\n`;
  content += `• Best networking 6-8 PM before crowds\n`;
  content += `• Food stations close at 9 PM\n`;
  content += `• Find quiet zones if you need a break from music\n\n`;

  // Closing Party
  content += `#### **Closing Party** - Thursday, October 16\n`;
  content += `📍 **Location:** [Mandalay Bay Events Center](/locations?location=Mandalay%20Bay%20Events%20Center)\n`;
  content += `🕐 **Time:** 7:00 PM - Midnight\n`;
  content += `👗 **Dress Code:** Cocktail attire or festive business casual\n`;
  content += `🏆 **Special:** Awards ceremony at 8 PM\n`;
  content += `🍸 **Included:** Premium open bar, dinner stations, live band & DJ\n\n`;
  content += `**Insider Info:**\n`;
  content += `• Book late flights - this is legendary!\n`;
  content += `• Multiple bars to avoid lines\n`;
  content += `• VIP section for sponsors on second level\n`;
  content += `• After-party location announced at 11 PM\n\n`;

  // Daily Happy Hours
  content += `### 🍻 **Daily Happy Hours & Networking**\n\n`;
  content += `#### **Morning Coffee Networking**\n`;
  content += `📍 [Convention Foyer](/locations?location=Convention%20Foyer) | 7:30-9:00 AM Daily\n`;
  content += `Perfect for early birds - casual networking before sessions\n\n`;

  content += `#### **Sponsor Happy Hours**\n`;
  content += `📍 Various [Sponsor Booths](/expo) | 5:00-6:30 PM (Oct 14-15)\n`;
  content += `Free drinks at sponsor booths - great for targeted networking!\n\n`;

  // Special Events
  content += `### 🎯 **Special Interest Events**\n\n`;

  content += `• **Insurtech Founders Mixer** - Oct 14, 5:00 PM @ [Surf Room](/locations?location=Surf%20Room)\n`;
  content += `• **International Reception** - Oct 15, 6:00 PM @ [Reef Room](/locations?location=Reef%20Room)\n`;
  content += `• **Women in Insurance** - Oct 15, 5:30 PM @ [Breakers Room](/locations?location=Breakers%20Room)\n`;
  content += `• **Carriers Breakfast** - Oct 15, 7:30 AM @ [Breakers Room](/locations?location=Breakers%20Room)\n\n`;

  // Time-specific recommendations
  if (hour >= 16 && hour < 19) {
    content += `### 🔥 **Happening Right Now / Soon:**\n`;
    content += `Based on the current time, check out:\n`;
    content += `• Happy hours starting at 5 PM at sponsor booths\n`;
    content += `• Pre-dinner networking in the Convention Foyer\n\n`;
  }

  // Add practical tips
  content += `### 💡 **Party Survival Tips:**\n`;
  content += `• Download the ITC app for real-time updates\n`;
  content += `• Bring business cards - you'll need 100+\n`;
  content += `• Comfortable shoes are essential\n`;
  content += `• Hydrate between drinks\n`;
  content += `• Use ride-sharing for off-site events\n`;
  content += `• Follow #ITCVegas for spontaneous meetups\n\n`;

  // Add action buttons context
  content += `### 🎬 **Quick Actions:**\n`;
  content += `• [View Full Events Calendar](/agenda?type=events)\n`;
  content += `• [Add to My Schedule](/agenda/intelligent)\n`;
  content += `• [Find People to Meet](/speakers)\n`;
  content += `• [Venue Maps & Directions](/locations)\n`;

  return {
    content,
    quickActions: [
      "Add opening party to my calendar",
      "Find tonight's networking events",
      "Who's hosting happy hours?",
      "Show me the VIP events"
    ],
    relatedTopics: [
      "networking opportunities",
      "dress codes",
      "venue locations",
      "transportation options"
    ],
    tips: [
      "RSVP for special events in the app",
      "Join the WhatsApp group for impromptu meetups",
      "Check sponsor booths for exclusive invites"
    ]
  };
}

export function getVenueInformation(): DetailedResponse {
  let content = `## 📍 **ITC Vegas 2025 Venue Guide**\n\n`;

  content += `### 🏨 **Main Venue: Mandalay Bay Resort**\n`;
  content += `3950 S Las Vegas Blvd, Las Vegas, NV 89119\n\n`;

  content += `### 🗺️ **Key Locations:**\n\n`;

  content += `#### **Conference Spaces:**\n`;
  content += `• **Main Keynote Stage** - [Mandalay Bay Ballroom D](/locations?room=Ballroom-D)\n`;
  content += `• **Innovation Theater** - [Oceanside Ballroom](/locations?room=Oceanside)\n`;
  content += `• **Expo Floor** - [Bayside Exhibit Hall](/locations?room=Bayside)\n`;
  content += `• **Breakout Rooms** - [Reef, Surf, Breakers](/locations?floor=2)\n\n`;

  content += `#### **Amenities:**\n`;
  content += `• **Registration** - [South Convention Lobby](/locations?area=registration)\n`;
  content += `• **Charging Stations** - Located in all ballroom foyers\n`;
  content += `• **Quiet Zones** - 3rd floor lounges\n`;
  content += `• **Business Center** - Near South Convention entrance\n\n`;

  content += `#### **Food & Beverage:**\n`;
  content += `• **Conference Breakfast** - Convention Foyer (7:30-9:00 AM)\n`;
  content += `• **Lunch Service** - Ballroom Foyer (12:00-1:30 PM)\n`;
  content += `• **Coffee Stations** - All major session areas\n`;
  content += `• **Restaurant Options** - [View dining guide](/dining)\n\n`;

  content += `### 🚶 **Navigation Tips:**\n`;
  content += `• Convention center is 10-min walk from hotel towers\n`;
  content += `• Free tram to Luxor and Excalibur\n`;
  content += `• Golf carts available for accessibility needs\n`;
  content += `• Download venue map in the ITC app\n\n`;

  content += `### 🚗 **Transportation:**\n`;
  content += `• **Airport Shuttle:** Runs every 30 mins\n`;
  content += `• **Taxi/Uber Pickup:** South entrance\n`;
  content += `• **Parking:** Self-park free for attendees\n`;
  content += `• **Monorail:** 5-min walk to station\n`;

  return {
    content,
    quickActions: [
      "Show me the venue map",
      "Where's the Expo Floor?",
      "Find charging stations",
      "Navigate to Main Stage"
    ]
  };
}

export function getSpeakerHighlights(): DetailedResponse {
  let content = `## 🎤 **ITC Vegas 2025 Speaker Highlights**\n\n`;

  content += `### ⭐ **Keynote Speakers:**\n\n`;

  // Add actual keynote speakers if available
  content += `• **Opening Keynote** - Industry Vision 2030\n`;
  content += `  Tuesday, Oct 14 @ 9:00 AM | [Main Stage](/agenda?type=keynote)\n\n`;

  content += `• **Day 2 Keynote** - AI Revolution in Insurance\n`;
  content += `  Wednesday, Oct 15 @ 9:00 AM | [Main Stage](/agenda?type=keynote)\n\n`;

  content += `• **Closing Keynote** - Future of Insurtech\n`;
  content += `  Thursday, Oct 16 @ 9:00 AM | [Main Stage](/agenda?type=keynote)\n\n`;

  content += `### 🏆 **Featured Speakers by Track:**\n\n`;

  content += `#### **Innovation & Technology:**\n`;
  content += `• [Browse 50+ tech leaders](/speakers?track=innovation)\n`;
  content += `• Topics: AI, Blockchain, IoT, Telematics\n\n`;

  content += `#### **Executive Leadership:**\n`;
  content += `• [View C-Suite speakers](/speakers?level=executive)\n`;
  content += `• Strategic insights from 100+ insurance CEOs\n\n`;

  content += `#### **Investment & Growth:**\n`;
  content += `• [Meet top VCs](/speakers?type=investor)\n`;
  content += `• $50B+ in represented investment capital\n\n`;

  content += `### 📊 **By The Numbers:**\n`;
  content += `• **500+** Total speakers\n`;
  content += `• **40+** Countries represented\n`;
  content += `• **200+** Insurance carriers\n`;
  content += `• **150+** Insurtech startups\n`;
  content += `• **14** Content stages\n\n`;

  content += `### 🎯 **Don't Miss:**\n`;
  content += `• **Startup Pitch Finals** - Oct 15 @ 3 PM\n`;
  content += `• **CEO Panel** - Oct 14 @ 2 PM\n`;
  content += `• **Women Leaders Forum** - Oct 15 @ 11 AM\n`;
  content += `• **Innovation Awards** - Oct 16 @ 8 PM\n`;

  return {
    content,
    quickActions: [
      "Show me AI speakers",
      "Find speakers from my company",
      "View keynote schedule",
      "Browse by expertise"
    ]
  };
}

export function getNetworkingGuide(): DetailedResponse {
  let content = `## 🤝 **ITC Vegas 2025 Networking Guide**\n\n`;

  content += `### 📱 **Networking Tools:**\n`;
  content += `• **ITC Mobile App** - Message attendees directly\n`;
  content += `• **AI Matchmaking** - Get personalized introductions\n`;
  content += `• **Meeting Scheduler** - Book 1:1s in advance\n`;
  content += `• **LinkedIn Scanner** - Quick profile exchange\n\n`;

  content += `### 🎯 **Structured Networking:**\n\n`;

  content += `#### **Speed Networking Sessions:**\n`;
  content += `• Tue & Wed @ 3:30 PM - [Ocean Ballroom](/locations?room=Ocean)\n`;
  content += `• 5-minute rotations, 12 connections guaranteed\n`;
  content += `• [Register in advance](/networking/speed)\n\n`;

  content += `#### **Industry Meetups:**\n`;
  content += `• **Brokers & Agents** - Tue @ 7:30 AM\n`;
  content += `• **Carriers** - Wed @ 7:30 AM\n`;
  content += `• **Startups** - Tue @ 5:00 PM\n`;
  content += `• **International** - Wed @ 6:00 PM\n\n`;

  content += `#### **Topic Tables (Lunch):**\n`;
  content += `Join themed discussions during lunch:\n`;
  content += `• AI & Automation\n`;
  content += `• Claims Innovation\n`;
  content += `• Distribution Models\n`;
  content += `• Embedded Insurance\n`;
  content += `• [View all 20+ topics](/networking/topics)\n\n`;

  content += `### 💡 **Networking Strategies:**\n\n`;

  content += `**For First-Timers:**\n`;
  content += `• Start with morning coffee networking (less crowded)\n`;
  content += `• Join topic tables at lunch\n`;
  content += `• Attend your industry meetup\n`;
  content += `• Use the buddy system\n\n`;

  content += `**For Veterans:**\n`;
  content += `• Host a breakfast meetup\n`;
  content += `• Volunteer as a mentor\n`;
  content += `• Join VIP receptions\n`;
  content += `• Create spontaneous gatherings\n\n`;

  content += `### 📊 **Networking Hotspots:**\n`;
  content += `• **Expo Floor** - Continuous networking\n`;
  content += `• **Coffee Stations** - Natural conversation starters\n`;
  content += `• **Charging Stations** - Captive audience\n`;
  content += `• **Hotel Lobby Bar** - After-hours hub\n`;

  return {
    content,
    quickActions: [
      "Find people like me",
      "Schedule a meeting",
      "Join speed networking",
      "View industry meetups"
    ],
    tips: [
      "Wear your badge at all times",
      "Bring 150+ business cards",
      "Use the app's 'Near Me' feature",
      "Follow up within 48 hours"
    ]
  };
}

export function getPracticalGuide(): DetailedResponse {
  const currentHour = new Date().getHours();

  let content = `## 🎯 **ITC Vegas 2025 Practical Guide**\n\n`;

  content += `### 📱 **Essential Info:**\n`;
  content += `• **WiFi:** ITCVEGAS2025 (Password: innovate2025)\n`;
  content += `• **App:** Download 'ITC Vegas' from App Store/Play Store\n`;
  content += `• **Help Desk:** South Convention Lobby\n`;
  content += `• **Emergency:** Text 'HELP' to 89119\n\n`;

  content += `### 🍽️ **Food & Dining:**\n\n`;

  content += `**Included with Registration:**\n`;
  content += `• Breakfast: 7:30-9:00 AM (Convention Foyer)\n`;
  content += `• Lunch: 12:00-1:30 PM (Ballroom Foyer)\n`;
  content += `• Coffee/Snacks: Throughout the day\n`;
  content += `• Happy Hours: 5:00-6:30 PM (Sponsor booths)\n\n`;

  content += `**Nearby Restaurant Options:**\n`;
  content += `• **Quick Bites:** Starbucks, Food Court (Level 1)\n`;
  content += `• **Casual Dining:** [View options](/dining?type=casual)\n`;
  content += `• **Fine Dining:** [Reservations recommended](/dining?type=fine)\n`;
  content += `• **Room Service:** Until 2 AM\n\n`;

  content += `### 🔋 **Staying Powered:**\n`;
  content += `• Charging stations in all ballroom foyers\n`;
  content += `• Power banks available at Help Desk ($20 deposit)\n`;
  content += `• Quiet charging zones on 3rd floor\n`;
  content += `• Bring multi-port chargers to share\n\n`;

  content += `### 🏨 **Hotel Tips:**\n`;
  content += `• Check-in: Use mobile key to skip lines\n`;
  content += `• Elevators: Use convention center banks\n`;
  content += `• Room issues: Text concierge via app\n`;
  content += `• Late checkout: Available for $75\n\n`;

  content += `### 💰 **Budget Tips:**\n`;
  content += `• Free breakfast & lunch included\n`;
  content += `• Happy hours at sponsor booths (free)\n`;
  content += `• Split Ubers with new connections\n`;
  content += `• Hotel restaurants are pricey - venture out\n`;
  content += `• Water stations throughout venue\n\n`;

  content += `### 🚶 **Comfort Tips:**\n`;
  content += `• Wear comfortable shoes (10,000+ steps/day)\n`;
  content += `• Dress in layers (A/C is strong)\n`;
  content += `• Take breaks in quiet zones\n`;
  content += `• Stay hydrated (Vegas is dry)\n`;
  content += `• Use hand sanitizer frequently\n`;

  // Time-specific advice
  if (currentHour < 9) {
    content += `\n### ⏰ **This Morning:**\n`;
    content += `• Breakfast until 9 AM in Convention Foyer\n`;
    content += `• Best time for expo floor (less crowded)\n`;
    content += `• Coffee networking happening now\n`;
  } else if (currentHour >= 16) {
    content += `\n### 🌆 **This Evening:**\n`;
    content += `• Happy hours starting at 5 PM\n`;
    content += `• Make dinner reservations now\n`;
    content += `• Check evening event schedule\n`;
  }

  return {
    content,
    quickActions: [
      "Where can I charge my phone?",
      "Find quiet spaces",
      "View dining options",
      "Get WiFi password"
    ]
  };
}

export function getWeatherInformation(): DetailedResponse {
  let content = `## ☀️ **Las Vegas Weather - October 2025**\n\n`;

  content += `### 🌡️ **Typical October Weather:**\n`;
  content += `• **High:** 79°F (26°C)\n`;
  content += `• **Low:** 57°F (14°C)\n`;
  content += `• **Rainfall:** Less than 0.5 inches (very dry)\n`;
  content += `• **Humidity:** 30-40% (desert climate)\n`;
  content += `• **Sunrise:** ~6:30 AM\n`;
  content += `• **Sunset:** ~6:00 PM\n\n`;

  content += `### 👔 **What to Wear:**\n`;
  content += `• **Daytime:** Light business casual, sunglasses essential\n`;
  content += `• **Evening:** Bring a light jacket or sweater\n`;
  content += `• **Indoor:** Convention center A/C is strong - layer up!\n`;
  content += `• **Footwear:** Comfortable shoes for 10,000+ steps/day\n\n`;

  content += `### 💡 **Weather Tips:**\n`;
  content += `• October is one of the best months in Vegas - perfect conference weather!\n`;
  content += `• Minimal rain chance (less than 5%)\n`;
  content += `• Dry air - bring lip balm and moisturizer\n`;
  content += `• Stay hydrated - desert climate is dehydrating\n`;
  content += `• Sunscreen still needed for outdoor events\n\n`;

  content += `### 🏨 **Indoor/Outdoor Considerations:**\n`;
  content += `• Conference venues are heavily air-conditioned\n`;
  content += `• Outdoor parties will be pleasant (70-75°F)\n`;
  content += `• Pool areas open and comfortable\n`;
  content += `• Perfect weather for the golf tournament\n\n`;

  content += `### 📱 **Real-Time Weather:**\n`;
  content += `For current conditions during the conference:\n`;
  content += `• Check the ITC Vegas app\n`;
  content += `• Weather.com: [Las Vegas forecast](https://weather.com/weather/today/l/Las+Vegas+NV)\n`;
  content += `• Any outdoor events will be updated in real-time`;

  return {
    content,
    quickActions: [
      "What should I pack?",
      "Will the outdoor events be comfortable?",
      "Is it pool weather?",
      "Do I need an umbrella?"
    ],
    tips: [
      "Pack layers for indoor/outdoor temperature changes",
      "Bring sunglasses and sunscreen",
      "Stay hydrated throughout the day"
    ]
  };
}

// Main handler for conference information queries
export function getConferenceInfoResponse(query: string): DetailedResponse | null {
  const queryLower = query.toLowerCase();

  // Check for weather queries first
  if (queryLower.includes('weather') || queryLower.includes('temperature') ||
      queryLower.includes('rain') || queryLower.includes('hot') ||
      queryLower.includes('cold') || queryLower.includes('climate')) {
    return getWeatherInformation();
  }

  // Route to appropriate handler based on query
  if (queryLower.includes('party') || queryLower.includes('parties') ||
      queryLower.includes('reception') || queryLower.includes('social') ||
      queryLower.includes('happy hour') || queryLower.includes('networking event')) {
    return getPartyInformation(query);
  }

  if (queryLower.includes('venue') || queryLower.includes('location') ||
      queryLower.includes('where is') || queryLower.includes('mandalay')) {
    return getVenueInformation();
  }

  if (queryLower.includes('speaker') || queryLower.includes('keynote') ||
      queryLower.includes('who is speaking')) {
    return getSpeakerHighlights();
  }

  if (queryLower.includes('network') || queryLower.includes('meet') ||
      queryLower.includes('connect')) {
    return getNetworkingGuide();
  }

  if (queryLower.includes('food') || queryLower.includes('lunch') ||
      queryLower.includes('breakfast') || queryLower.includes('coffee') ||
      queryLower.includes('wifi') || queryLower.includes('charge') ||
      queryLower.includes('practical') || queryLower.includes('tips')) {
    return getPracticalGuide();
  }

  // For general conference questions, provide overview
  if (queryLower.includes('conference') || queryLower.includes('itc vegas') ||
      queryLower.includes('event')) {
    return {
      content: `## 🎯 **ITC Vegas 2025 Overview**\n\n` +
               `📅 **Dates:** October 14-16, 2025\n` +
               `📍 **Venue:** Mandalay Bay Resort, Las Vegas\n` +
               `👥 **Expected:** 9,000+ attendees\n` +
               `🎤 **Speakers:** 500+ industry leaders\n` +
               `🏢 **Companies:** 2,000+ organizations\n\n` +
               `### Quick Links:\n` +
               `• [Conference Agenda](/agenda)\n` +
               `• [Speaker Directory](/speakers)\n` +
               `• [Networking Events](/networking)\n` +
               `• [Venue Information](/locations)\n` +
               `• [Party Schedule](/events)\n\n` +
               `What specific information would you like to know?`,
      quickActions: [
        "Show me the parties",
        "View keynote speakers",
        "Find networking events",
        "Get practical tips"
      ]
    };
  }

  return null;
}