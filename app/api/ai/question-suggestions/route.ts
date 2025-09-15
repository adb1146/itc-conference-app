import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';

interface QuestionCategory {
  type: 'role' | 'interest' | 'time' | 'general' | 'trending';
  template: string;
  priority: number;
}

const QUESTION_TEMPLATES: QuestionCategory[] = [
  // General high-value questions
  { type: 'general', template: 'Build me a personalized agenda for the conference', priority: 10 },
  { type: 'general', template: 'What are the must-attend sessions this year?', priority: 9 },
  { type: 'general', template: 'Who are the keynote speakers?', priority: 8 },

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
  const questions: string[] = [];

  // Time of day based
  if (hour < 12) {
    questions.push("What's happening this morning?");
    questions.push("Show me today's keynote sessions");
  } else if (hour < 17) {
    questions.push("What's happening this afternoon?");
    questions.push("Find networking events tonight");
  } else {
    questions.push("What's on tomorrow's agenda?");
    questions.push("Evening networking opportunities?");
  }

  // Conference days
  questions.push("What are the Day 1 highlights?");
  questions.push("Show me Day 2 AI sessions");
  questions.push("What's the closing keynote about?");

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

async function generateDynamicQuestions(
  userProfile?: any
): Promise<string[]> {
  const questions: string[] = [];
  const selectedTemplates = [...QUESTION_TEMPLATES].sort((a, b) => b.priority - a.priority);

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

  // Add time-based questions
  const timeQuestions = getTimeBasedQuestions();
  questions.push(...timeQuestions.slice(0, 2));

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

  // Ensure variety and limit
  return [...new Set(questions)].slice(0, 8);
}

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

    // Generate dynamic questions
    const questions = await generateDynamicQuestions(userProfile);

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
        "Build me a personalized agenda for the conference",
        "What sessions should I attend if I'm interested in claims?",
        "I'm a broker, what would I be interested in?",
        "Show me the AI and automation sessions",
        "Who are the top speakers I should meet?",
        "What's happening on Day 2?",
        "Find sessions about embedded insurance",
        "What are the must-attend keynotes?"
      ],
      personalized: false,
      error: true
    });
  }
}