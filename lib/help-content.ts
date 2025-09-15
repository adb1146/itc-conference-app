// Help content for educating users about app capabilities

export function getHelpContent(): string {
  return `I'm your **AI Conference Concierge** for ITC Vegas 2025! I can help you with:

## 🔍 **Search & Discovery**
• **Find sessions** - "Show me AI sessions on Tuesday"
• **Search speakers** - "Who's speaking about blockchain?"
• **Discover topics** - "What's trending in insurtech?"
• **Browse by track** - "Show me the Innovation Theater schedule"

## 📅 **Agenda Building**
• **Create personalized schedules** - "Build my Day 1 agenda"
• **Save sessions** - "Add this to my favorites"
• **Export calendar** - "Export my schedule to calendar"
• **Get reminders** - "Remind me about morning sessions"

## 🤝 **Networking**
• **Find connections** - "Who should I meet?"
• **Discover events** - "What parties are happening tonight?"
• **Industry meetups** - "Find fintech networking events"
• **Company connections** - "Who's here from State Farm?"

## 📍 **Navigation & Logistics**
• **Venue help** - "Where is the Expo Floor?"
• **Time-based** - "What's happening right now?"
• **Food & breaks** - "Where can I get coffee?"
• **Practical needs** - "Where can I charge my phone?"

## 💡 **Smart Features**
• **Personalized recommendations** based on your interests
• **Real-time updates** about schedule changes
• **Intelligent search** using AI to understand your needs
• **Context-aware suggestions** that adapt to your conversation

## 🎯 **Quick Examples**
Try asking:
• "I'm interested in AI and underwriting"
• "Find breakfast sessions with networking"
• "Who are the must-see speakers?"
• "Build me an agenda focused on innovation"
• "What's the dress code for tonight's party?"

**Pro tip:** The more specific you are, the better I can help! Tell me about your role, interests, and goals.`;
}

export function getQuickHelpResponse(): string {
  return `I can help you:
• 🔍 **Search** sessions, speakers, and topics
• 📅 **Build** your personalized agenda
• 🤝 **Find** networking opportunities
• 📍 **Navigate** the venue and events
• 💡 **Get** smart recommendations

Just ask me anything about ITC Vegas 2025! For example:
• "What sessions are about AI?"
• "Build my Day 1 schedule"
• "Who should I meet?"

Want the full guide? Just say **"Show me everything you can do"**`;
}

export function getFeatureHighlight(featureName: string): string {
  const features: Record<string, string> = {
    search: `**🔍 Smart Search Features:**
• Natural language search - just ask in plain English
• Search by topic, speaker, company, or track
• Time-based search - "morning sessions", "Tuesday talks"
• Multi-criteria search - "AI sessions with networking"`,

    agenda: `**📅 Agenda Builder Features:**
• Personalized schedule based on your interests
• Conflict detection and resolution
• One-click save to favorites
• Export to calendar (Google, Outlook, Apple)
• Share your agenda with colleagues`,

    networking: `**🤝 Networking Features:**
• Find attendees with similar interests
• Discover industry-specific meetups
• Party and event recommendations
• Company connection finder
• Smart introductions based on your goals`,

    navigation: `**📍 Navigation Features:**
• Interactive venue maps
• Real-time "what's happening now"
• Find amenities (food, charging, restrooms)
• Session room directions
• Traffic flow and crowd indicators`
  };

  return features[featureName] || getQuickHelpResponse();
}

// Educational tips for different user stages
export function getProgressiveTips(interactionCount: number): string[] {
  if (interactionCount === 0) {
    return [
      "💡 I understand natural language - just ask me anything!",
      "💡 Tell me your interests for personalized recommendations",
      "💡 I can search across 500+ sessions and speakers"
    ];
  } else if (interactionCount < 3) {
    return [
      "💡 Try: 'Build my agenda' for a personalized schedule",
      "💡 I can find networking events based on your industry",
      "💡 Ask about specific companies or speakers"
    ];
  } else if (interactionCount < 6) {
    return [
      "💡 You can save sessions by saying 'Add to favorites'",
      "💡 Export your agenda to your calendar app",
      "💡 I can help you find people to meet"
    ];
  } else {
    return [
      "💡 Try voice commands on mobile for hands-free help",
      "💡 Share your agenda with colleagues via email",
      "💡 Set reminders for must-attend sessions"
    ];
  }
}