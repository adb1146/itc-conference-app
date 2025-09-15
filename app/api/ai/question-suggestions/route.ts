import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';
import { classifyUserIntent, type IntentClassification } from '@/lib/ai-intent-classifier';
import { getTimeAwareActivities } from '@/lib/attendee-experience';
import partiesEvents from '@/data/parties-events.json';

interface QuestionCategory {
  type: 'role' | 'interest' | 'time' | 'general' | 'trending';
  template: string;
  priority: number;
}

// Educational templates to help users discover features
const EDUCATIONAL_TEMPLATES = [
  "What can you help me with?",
  "Show me what you can do",
  "How do I save sessions?",
  "How do I build an agenda?",
  "Can you help me find networking events?",
  "How do I export my schedule?",
  "What are your best features?",
  "Give me tips for using this app"
];

// Feature discovery tips
const FEATURE_TIPS = [
  "💡 Try: 'Find AI sessions on Tuesday'",
  "🎯 Ask: 'Who should I meet?'",
  "📅 Say: 'Build my Day 1 schedule'",
  "🔍 Try: 'Search for blockchain speakers'",
  "🤝 Ask: 'Find networking events tonight'",
  "⭐ Say: 'Save this session for later'",
  "📱 Try: 'Export my agenda to calendar'",
  "🎪 Ask: 'What parties are happening?'"
];

const QUESTION_TEMPLATES: QuestionCategory[] = [
  // Educational/Help questions - highest priority for new users
  { type: 'general', template: 'What can you help me with?', priority: 12 },
  { type: 'general', template: 'Show me what you can do', priority: 11 },

  // General high-value questions - prioritize informational queries
  { type: 'general', template: 'What are the must-attend sessions this year?', priority: 10 },
  { type: 'general', template: 'Who are the keynote speakers?', priority: 9 },
  { type: 'general', template: 'What new topics are being covered this year?', priority: 8 },
  { type: 'general', template: 'Build me a personalized agenda for the conference', priority: 7 },

  // Role-based templates
  { type: 'role', template: "I'm a {role}, what sessions should I attend?", priority: 9 },
  { type: 'role', template: "What would a {role} be most interested in?", priority: 8 },
  { type: 'role', template: "Show me networking opportunities for {role}s", priority: 7 },

  // Interest-based templates
  { type: 'interest', template: "What sessions cover {interest}?", priority: 9 },
  { type: 'interest', template: "Who's speaking about {interest}?", priority: 8 },
  { type: 'interest', template: "Find the latest trends in {interest}", priority: 7 },

  // Time-aware templates
  { type: 'time', template: "What's happening {timeframe}?", priority: 8 },
  { type: 'time', template: "Show me {day} highlights", priority: 7 },
  { type: 'time', template: "What sessions are starting soon?", priority: 9 },

  // Trending/popular
  { type: 'trending', template: "What's trending in {topic}?", priority: 7 },
  { type: 'trending', template: "Most popular sessions about {topic}", priority: 6 },
];

const ROLES = [
  'broker', 'underwriter', 'claims manager', 'executive',
  'product manager', 'data scientist', 'startup founder', 'investor'
];

const INTERESTS = [
  'AI and automation', 'claims technology', 'cybersecurity',
  'embedded insurance', 'digital distribution', 'customer experience',
  'underwriting innovation', 'data analytics'
];

const TOPICS = [
  'artificial intelligence', 'blockchain', 'IoT', 'telematics',
  'parametric insurance', 'climate risk', 'insurtech partnerships'
];

function getTimeBasedQuestions(): string[] {
  const now = new Date();
  const hour = now.getHours();
  const day = now.toISOString().split('T')[0];
  const questions: string[] = [];

  // Time of day based with more context
  if (hour < 8) {
    questions.push("Where can I get breakfast?");
    questions.push("What's the first keynote today?");
    questions.push("When does registration open?");
  } else if (hour < 12) {
    questions.push("What's happening this morning?");
    questions.push("Where's the best coffee nearby?");
    questions.push("Any sessions starting soon?");
  } else if (hour < 14) {
    questions.push("Where's lunch being served?");
    questions.push("What afternoon sessions should I attend?");
    questions.push("Any lunch networking events?");
  } else if (hour < 17) {
    questions.push("What's happening this afternoon?");
    questions.push("Where are the happy hours today?");
    questions.push("Any demos at the Expo Floor?");
  } else if (hour < 19) {
    questions.push("What parties are tonight?");
    questions.push("Where can I get dinner?");
    questions.push("Any evening meetups happening?");
  } else {
    questions.push("What's on tomorrow's agenda?");
    questions.push("How late is the party tonight?");
    questions.push("What time does breakfast start tomorrow?");
  }

  // Check for specific party days
  if (day === partiesEvents.parties.opening.date) {
    questions.unshift("What time is the opening party?");
    questions.unshift("What should I wear to the opening party?");
  } else if (day === partiesEvents.parties.closing.date) {
    questions.unshift("When are the awards at the closing party?");
    questions.unshift("Should I book a late flight tomorrow?");
  }

  // Add practical questions based on time
  if (hour >= 14 && hour < 18) {
    questions.push("I'm tired, where can I recharge?");
  }

  if (hour >= 11 && hour < 14) {
    questions.push("I'm hungry, what are my options?");
  }

  return questions;
}

async function getTrendingTopics(): Promise<string[]> {
  try {
    // Get popular sessions based on view count or favorites
    const popularSessions = await prisma.session.findMany({
      take: 10,
      orderBy: [
        { favorites: { _count: 'desc' } }
      ],
      select: {
        title: true,
        tags: true,
        track: true
      }
    });

    // Extract trending topics from popular sessions
    const topicsSet = new Set<string>();
    popularSessions.forEach(session => {
      // Add track
      if (session.track) {
        topicsSet.add(session.track.toLowerCase());
      }
      // Add tags
      if (session.tags && Array.isArray(session.tags)) {
        session.tags.forEach((tag: string) => {
          if (tag && tag.length > 3) {
            topicsSet.add(tag.toLowerCase());
          }
        });
      }
    });

    return Array.from(topicsSet).slice(0, 5);
  } catch (error) {
    console.error('Error getting trending topics:', error);
    return TOPICS.slice(0, 3);
  }
}

function extractTopicsFromMessage(message: string): {
  sessions: string[];
  speakers: string[];
  topics: string[];
  tracks: string[];
  companies: string[];
} {
  const extracted = {
    sessions: [] as string[],
    speakers: [] as string[],
    topics: [] as string[],
    tracks: [] as string[],
    companies: [] as string[]
  };

  // Extract session titles - look for common patterns
  // Pattern 1: Text in quotes
  const quotedMatches = message.match(/["']([^"']+)["']/g);
  if (quotedMatches) {
    quotedMatches.forEach(match => {
      const cleaned = match.replace(/["']/g, '').trim();
      if (cleaned.length > 15 && cleaned.length < 150) {
        extracted.sessions.push(cleaned);
      }
    });
  }

  // Pattern 2: After "session:" or "titled"
  const sessionPatterns = /(?:session:|titled|called|named|\btitle:\s*)([^,\.\n]+)/gi;
  const sessionMatches = message.match(sessionPatterns);
  if (sessionMatches) {
    sessionMatches.forEach(match => {
      const cleaned = match.replace(/^(session:|titled|called|named|title:\s*)/i, '').trim();
      if (cleaned.length > 10 && cleaned.length < 150) {
        extracted.sessions.push(cleaned);
      }
    });
  }

  // Pattern 3: Look for sessions after specific keywords like "Breakfast", "Lunch", "Panel", "Keynote", "Workshop"
  const eventPattern = /\b(Breakfast|Lunch|Panel|Keynote|Workshop|Summit|Forum|Session)\b[^\.,;\n]{10,100}/gi;
  const eventMatches = message.match(eventPattern);
  if (eventMatches) {
    eventMatches.forEach(match => {
      if (!extracted.sessions.includes(match.trim())) {
        extracted.sessions.push(match.trim());
      }
    });
  }

  // Extract speaker names (typically capitalized names)
  const speakerPattern = /(?:speaker|keynote|presented by|featuring|with|hosted by|moderated by|from)\s+([A-Z][a-z]+ [A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/gi;
  const speakerMatches = message.match(speakerPattern);
  if (speakerMatches) {
    speakerMatches.forEach(match => {
      const name = match.replace(/^(speaker|keynote|presented by|featuring|with|hosted by|moderated by|from)\s+/i, '').trim();
      if (!['The', 'This', 'That', 'These', 'Those', 'For', 'And', 'With'].includes(name.split(' ')[0])) {
        extracted.speakers.push(name);
      }
    });
  }

  // Extract common insurance/tech topics
  const topicKeywords = [
    'AI', 'artificial intelligence', 'machine learning', 'automation',
    'claims', 'underwriting', 'distribution', 'customer experience',
    'embedded insurance', 'parametric', 'climate', 'cyber', 'blockchain',
    'data analytics', 'digital transformation', 'insurtech', 'innovation'
  ];

  topicKeywords.forEach(topic => {
    if (message.toLowerCase().includes(topic.toLowerCase())) {
      extracted.topics.push(topic);
    }
  });

  // Extract track names
  const trackPattern = /(?:track|stage|theater):\s*([^,\.]+)/gi;
  const trackMatches = message.match(trackPattern);
  if (trackMatches) {
    trackMatches.forEach(match => {
      const track = match.replace(/^(track|stage|theater):\s*/i, '').trim();
      extracted.tracks.push(track);
    });
  }

  // Extract company names (typically after "from" or "at" or "Sponsored by")
  const companyPattern = /(?:from|at|with|by|sponsored by|presented by)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+)*(?:\s+(?:Insurance|Re|Tech|AI|Analytics|Capital|Ventures|Partners|Group|Holdings|Labs|Solutions|Xcelerator|Life))?)/gi;
  const companyMatches = message.match(companyPattern);
  if (companyMatches) {
    companyMatches.forEach(match => {
      const company = match.replace(/^(from|at|with|by|sponsored by|presented by)\s+/i, '').trim();
      if (company.length > 3 && !['The', 'This', 'That', 'These', 'Those'].includes(company)) {
        extracted.companies.push(company);
      }
    });
  }

  // Also look for MetLife specifically since it's mentioned in the example
  if (message.includes('MetLife')) {
    if (!extracted.companies.includes('MetLife') && !extracted.companies.includes('MetLife Xcelerator')) {
      const metlifeMatch = message.match(/MetLife\s+\w+/i);
      if (metlifeMatch) {
        extracted.companies.push(metlifeMatch[0]);
      } else {
        extracted.companies.push('MetLife');
      }
    }
  }

  return extracted;
}

function generateContextualFollowUps(extractedTopics: ReturnType<typeof extractTopicsFromMessage>): string[] {
  const followUps: string[] = [];

  // Generate follow-ups based on sessions mentioned
  if (extractedTopics.sessions.length > 0) {
    const session = extractedTopics.sessions[0];
    // Shorten session title if needed for display
    const shortSession = session.length > 40 ? session.substring(0, 40) + '...' : session;
    followUps.push(`Who are the speakers for this session?`);
    followUps.push(`What other sessions are happening at the same time?`);
    followUps.push(`Find similar breakfast or networking events`);
    followUps.push(`Add "${shortSession}" to my agenda`);
  }

  // Generate follow-ups based on speakers
  if (extractedTopics.speakers.length > 0) {
    const speaker = extractedTopics.speakers[0];
    followUps.push(`What else is ${speaker} speaking about?`);
    followUps.push(`Tell me about ${speaker}'s background`);
    followUps.push(`Find other speakers from the same company`);
  }

  // Generate follow-ups based on topics
  if (extractedTopics.topics.length > 0) {
    const topic = extractedTopics.topics[0];
    followUps.push(`Show me more ${topic} sessions`);
    followUps.push(`Who are the ${topic} experts at the conference?`);
    followUps.push(`What's the latest in ${topic}?`);
    if (extractedTopics.topics.length > 1) {
      followUps.push(`How does ${topic} relate to ${extractedTopics.topics[1]}?`);
    }
  }

  // Generate follow-ups based on tracks
  if (extractedTopics.tracks.length > 0) {
    const track = extractedTopics.tracks[0];
    followUps.push(`What else is happening in the ${track}?`);
    followUps.push(`Show me the ${track} schedule`);
  }

  // Generate follow-ups based on companies
  if (extractedTopics.companies.length > 0) {
    const company = extractedTopics.companies[0];
    followUps.push(`Who else from ${company} is speaking?`);
    followUps.push(`What other sessions is ${company} sponsoring?`);
    followUps.push(`Tell me about ${company}'s innovation initiatives`);
  }

  // Add action-oriented follow-ups only if we have sessions
  if (extractedTopics.sessions.length > 0) {
    followUps.push(`Save this session for later`);
    followUps.push(`What's happening after this session?`);
    followUps.push(`Show me the full Day 1 breakfast schedule`);
  } else if (extractedTopics.topics.length > 0) {
    // If no sessions but we have topics, offer topic-based actions
    followUps.push(`Show me all ${extractedTopics.topics[0]} sessions`);
    followUps.push(`Build an agenda focused on ${extractedTopics.topics[0]}`);
  }

  return followUps;
}

// Helper function to determine if user needs educational content
function shouldShowEducationalContent(conversationContext?: any): boolean {
  const messageCount = conversationContext?.messageCount || 0;
  const hasAskedForHelp = conversationContext?.lastMessage?.toLowerCase().includes('help') ||
                          conversationContext?.lastMessage?.toLowerCase().includes('what can') ||
                          conversationContext?.lastMessage?.toLowerCase().includes('how do');

  // Show educational content for new users or when they ask for help
  return messageCount < 3 || hasAskedForHelp;
}

// Helper function to get interaction-based tips
function getInteractionBasedTips(messageCount: number): string[] {
  if (messageCount === 0) {
    return [
      "What can you help me with?",
      "Show me the keynote speakers",
      "What's happening today?"
    ];
  } else if (messageCount < 3) {
    return [
      "How do I build an agenda?",
      "Find sessions about AI",
      "Show me networking events"
    ];
  } else if (messageCount < 6) {
    return [
      "Save interesting sessions for later",
      "Export my schedule",
      "Who should I meet?"
    ];
  }
  return [];
}

async function generateDynamicQuestions(
  userProfile?: any,
  conversationContext?: any
): Promise<string[]> {
  const questions: string[] = [];
  const selectedTemplates = [...QUESTION_TEMPLATES].sort((a, b) => b.priority - a.priority);
  const messageCount = conversationContext?.messageCount || 0;

  // EDUCATIONAL CONTENT FOR NEW USERS OR HELP REQUESTS
  if (shouldShowEducationalContent(conversationContext)) {
    // Always include "What can you help me with?" as first option
    questions.push("What can you help me with?");

    // Add interaction-based tips
    const tips = getInteractionBasedTips(messageCount);
    if (tips.length > 0) {
      questions.push(...tips.slice(1, 3)); // Add 2 more educational questions
    }
  }

  // PRIORITIZE CONTEXTUAL SUGGESTIONS
  if (conversationContext?.lastAssistantMessage && !shouldShowEducationalContent(conversationContext)) {
    // Extract topics from the last assistant message
    const extractedTopics = extractTopicsFromMessage(conversationContext.lastAssistantMessage);

    // Log for debugging
    console.log('Extracted topics from assistant message:', extractedTopics);

    // Generate contextual follow-up questions
    const contextualQuestions = generateContextualFollowUps(extractedTopics);

    // Add contextual questions (but leave room for educational content)
    if (contextualQuestions.length > 0) {
      const contextualCount = questions.length > 0 ? 3 : 4;
      questions.push(...contextualQuestions.slice(0, contextualCount));
    }
  }

  // Get trending topics
  const trendingTopics = await getTrendingTopics();

  // Generate personalized questions if user is authenticated
  if (userProfile) {
    const userRole = userProfile.role || ROLES[Math.floor(Math.random() * ROLES.length)];
    const userInterests = userProfile.interests || [];

    // Add role-based questions
    if (userRole) {
      questions.push(`I'm a ${userRole}, what sessions should I attend?`);
      questions.push(`Best networking events for ${userRole}s?`);
    }

    // Add interest-based questions
    if (userInterests.length > 0) {
      const interest = userInterests[0];
      questions.push(`What's new in ${interest}?`);
      questions.push(`Who are the ${interest} experts speaking?`);
    }
  }

  // Add feature discovery tip occasionally (every 5th interaction)
  if (messageCount > 0 && messageCount % 5 === 0 && questions.length < 5) {
    const randomTip = FEATURE_TIPS[Math.floor(Math.random() * FEATURE_TIPS.length)];
    questions.push(randomTip);
  }

  // Add time-based questions only if we have room
  if (questions.length < 4) {
    const timeQuestions = getTimeBasedQuestions();
    questions.push(...timeQuestions.slice(0, 2));
  }

  // Add trending topic questions
  if (trendingTopics.length > 0) {
    questions.push(`What's trending in ${trendingTopics[0]}?`);
    questions.push(`Latest ${trendingTopics[1]} innovations?`);
  }

  // Fill remaining slots with general questions
  const generalQuestions = selectedTemplates
    .filter(t => t.type === 'general')
    .map(t => t.template);

  questions.push(...generalQuestions);

  // Add intent-based suggestions (but after contextual ones)
  if (conversationContext?.lastIntent) {
    const intentQuestions: string[] = [];
    switch (conversationContext.lastIntent) {
      case 'greeting':
        // After greeting, suggest next steps
        intentQuestions.push('Tell me about the conference highlights');
        intentQuestions.push('What sessions match my interests?');
        intentQuestions.push("What's happening right now?");
        break;
      case 'information_seeking':
        // After info seeking, offer to go deeper
        intentQuestions.push('Show me similar sessions');
        intentQuestions.push('Who else is speaking on this topic?');
        intentQuestions.push('Build me a personalized agenda');
        break;
      case 'local_recommendations':
        // After local recs, suggest other local options
        intentQuestions.push('What about breakfast options?');
        intentQuestions.push('Any networking events nearby?');
        intentQuestions.push('Where are the happy hours?');
        break;
      case 'preference_setting':
        // After setting preferences, offer agenda
        intentQuestions.push('Create my agenda based on these preferences');
        intentQuestions.push('What sessions match these interests?');
        break;
      case 'practical_need':
        // After practical need, suggest related help
        intentQuestions.push('Where can I charge my phone?');
        intentQuestions.push('Any quiet spaces available?');
        intentQuestions.push("What's the WiFi password?");
        break;
      case 'emotional_support':
        // After emotional support, suggest helpful options
        intentQuestions.push('What are the must-see sessions?');
        intentQuestions.push('Where can I take a break?');
        intentQuestions.push('Help me prioritize my day');
        break;
      case 'navigation_help':
        // After navigation, suggest locations
        intentQuestions.push('Where is the Expo Floor?');
        intentQuestions.push('How do I get to the main stage?');
        intentQuestions.push("Where's registration?");
        break;
      case 'social_planning':
        // After social planning, suggest events
        intentQuestions.push("What's the dress code tonight?");
        intentQuestions.push('Any industry meetups today?');
        intentQuestions.push('Where are people going after?');
        break;
      case 'agenda_building':
        // After agenda building, suggest next steps
        intentQuestions.push('How do I save this agenda?');
        intentQuestions.push('Can you add more networking time?');
        intentQuestions.push('Show me alternative sessions');
        break;
    }
    // Add intent-based questions after contextual ones
    if (intentQuestions.length > 0) {
      questions.push(...intentQuestions.slice(0, 2)); // Add 2 intent-based questions
    }
  }

  // If user hasn't built an agenda yet, make it less prominent
  if (!conversationContext?.agendaBuilt) {
    // Move agenda building down in priority
    const agendaIndex = questions.findIndex(q => q.toLowerCase().includes('agenda'));
    if (agendaIndex > 2) {
      const agendaQuestion = questions.splice(agendaIndex, 1)[0];
      questions.push(agendaQuestion);
    }
  }

  // For very new users, ensure we always have educational content
  if (messageCount === 0 && !questions.includes("What can you help me with?")) {
    questions.unshift("What can you help me with?");
  }

  // Ensure variety and limit
  return [...new Set(questions)].slice(0, 6);
}

export async function POST(request: NextRequest) {
  try {
    // Get conversation context from request body
    const { conversationContext, lastMessage, lastAssistantMessage, messageCount } = await request.json();

    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    let userProfile = null;

    if (session?.user?.email) {
      userProfile = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          role: true,
          interests: true,
          company: true,
          organizationType: true
        }
      });
    }

    // If we have a last message, classify its intent to provide better suggestions
    let lastIntent = conversationContext?.lastIntent;
    if (lastMessage && !lastIntent) {
      try {
        const classification = await classifyUserIntent(lastMessage, conversationContext);
        lastIntent = classification.primary_intent;
      } catch (error) {
        console.error('Error classifying last message:', error);
      }
    }

    // Generate dynamic questions with context including last assistant message
    const questions = await generateDynamicQuestions(userProfile, {
      ...conversationContext,
      lastIntent,
      lastAssistantMessage: lastAssistantMessage || conversationContext?.lastAssistantMessage,
      lastMessage,
      messageCount: messageCount || conversationContext?.messageCount || 0
    });

    // Add cache headers for performance
    return NextResponse.json(
      {
        questions,
        personalized: !!userProfile,
        contextAware: true,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'no-cache' // Don't cache context-aware suggestions
        }
      }
    );

  } catch (error) {
    console.error('Error generating question suggestions:', error);

    // Return fallback questions on error
    return NextResponse.json({
      questions: [
        "What sessions should I attend?",
        "Who are the keynote speakers?",
        "What's happening today?",
        "Find sessions about AI",
        "Build me a personalized agenda",
        "Show me networking events"
      ],
      personalized: false,
      contextAware: false,
      error: true
    });
  }
}

// Keep GET endpoint for backward compatibility
export async function GET(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(authOptions);
    let userProfile = null;

    if (session?.user?.email) {
      userProfile = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: {
          role: true,
          interests: true,
          company: true,
          organizationType: true
        }
      });
    }

    // Generate dynamic questions without context (backward compatibility)
    const questions = await generateDynamicQuestions(userProfile, null);

    // Add cache headers for performance
    return NextResponse.json(
      {
        questions,
        personalized: !!userProfile,
        timestamp: new Date().toISOString()
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
        }
      }
    );

  } catch (error) {
    console.error('Error generating question suggestions:', error);

    // Return fallback questions on error
    return NextResponse.json({
      questions: [
        "What are the must-attend sessions?",
        "Who are the keynote speakers?",
        "What's happening today?",
        "Show me AI and automation sessions",
        "Find sessions about claims technology",
        "Build me a personalized agenda"
      ],
      personalized: false,
      error: true
    });
  }
}