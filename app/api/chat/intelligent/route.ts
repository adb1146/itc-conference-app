import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIModel, getTokenLimit } from '@/lib/ai-config';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';

// Store conversation history in memory (in production, use Redis or database)
const conversationHistory = new Map<string, any[]>();

interface UserProfile {
  role?: string;
  company?: string;
  interests?: string[];
  experience?: string;
  goals?: string[];
  previousQuestions?: string[];
}

export async function POST(request: NextRequest) {
  try {
    // Check if user is authenticated
    const session = await getServerSession(getAuthOptions());
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Please sign in to use the intelligent chat' }, { status: 401 });
    }

    const { 
      message, 
      userProfile = {},
      conversationId,
      timezone = 'America/Los_Angeles'
    } = await request.json();

    // Get the authenticated user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Use user's actual profile if available
    const enhancedProfile = {
      ...userProfile,
      role: user.role || userProfile.role,
      company: user.company || userProfile.company,
      interests: user.interests || userProfile.interests,
      goals: user.goals || userProfile.goals
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create conversation
    let conversation;
    if (conversationId) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id
        }
      });
    }

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          messages: [], // Initialize with empty messages array
          context: {}
        }
      });
    }

    // Convert DB messages to history format
    const history = (conversation.messages || []).map((msg: any) => ({
      role: msg.role,
      content: msg.content
    }));

    // Fetch all sessions with detailed information
    const sessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: [
        { startTime: 'asc' }
      ]
    });

    // Analyze user intent
    const intent = analyzeIntent(message);

    // Get relevant sessions based on intent
    const relevantSessions = filterRelevantSessions(sessions, intent, enhancedProfile as UserProfile);

    // Detect scheduling conflicts
    const conflicts = detectConflicts(relevantSessions);

    // Generate recommendations based on user profile
    const recommendations = generateRecommendations(sessions, enhancedProfile as UserProfile, intent);

    // Format sessions with enhanced context
    const sessionsContext = sessions.map(session => ({
      id: session.id,
      title: session.title,
      description: session.description,
      startTime: session.startTime?.toISOString(),
      endTime: session.endTime?.toISOString(),
      track: session.track,
      location: session.location,
      level: session.level,
      tags: session.tags,
      speakers: session.speakers.map(ss => ({
        name: ss.speaker.name,
        role: ss.speaker.role,
        company: ss.speaker.company,
        bio: ss.speaker.bio
      })),
      // Add relevance score
      relevanceScore: calculateRelevance(session, intent, userProfile as UserProfile)
    }));

    // Sort by relevance
    sessionsContext.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Initialize Anthropic with Claude Sonnet for better reasoning
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Create enhanced system prompt
    const systemPrompt = `You are an expert conference concierge AI for ITC Vegas 2025 (October 14-16, 2025). 
You have deep knowledge of insurance technology trends and can provide strategic advice.

YOUR CAPABILITIES:
1. **Personalized Recommendations**: Suggest sessions based on user's role, interests, and goals
2. **Strategic Scheduling**: Create optimal schedules avoiding conflicts and maximizing value
3. **Industry Insights**: Provide context about speakers, companies, and topics
4. **Networking Intelligence**: Identify key networking opportunities based on user's objectives
5. **Learning Paths**: Suggest session sequences for comprehensive topic understanding
6. **Time Optimization**: Balance sessions with breaks and networking time

USER PROFILE:
- Name: ${user.name || 'Not provided'}
- Role: ${enhancedProfile.role || 'Not specified'}
- Company: ${enhancedProfile.company || 'Not specified'}
- Interests: ${enhancedProfile.interests?.join(', ') || 'Not specified'}
- Goals: ${enhancedProfile.goals?.join(', ') || 'Not specified'}

USER INTENT ANALYSIS:
- Primary Intent: ${intent.primary}
- Topics of Interest: ${intent.topics.join(', ')}
- Time Preference: ${intent.timePreference}
- Interaction Type: ${intent.interactionType}

CONVERSATION HISTORY:
${history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}

CONFERENCE SESSIONS (Sorted by Relevance):
${JSON.stringify(sessionsContext.slice(0, 20), null, 2)}

DETECTED CONFLICTS:
${conflicts.length > 0 ? JSON.stringify(conflicts, null, 2) : 'None'}

SMART RECOMMENDATIONS:
${JSON.stringify(recommendations, null, 2)}

RESPONSE GUIDELINES:
1. Be conversational but professional
2. Provide specific session recommendations with reasoning
3. Include timing and location details
4. Suggest alternative options when sessions conflict
5. Offer follow-up questions to refine recommendations
6. Use markdown formatting for clarity
7. Consider the user's timezone: ${timezone}
8. If suggesting a schedule, group by day and time
9. Highlight must-attend sessions with ⭐
10. Include networking tips when relevant

IMPORTANT CONTEXT:
- Day 1 (Oct 14): Opening day with orientation and kickoff party
- Day 2 (Oct 15): Main conference day with parallel tracks
- Day 3 (Oct 16): Final day with closing keynotes and awards
- Popular tracks: Technology, Claims, Cyber, Distribution, Health
- Key sponsors: State Farm, Jackson, isolved, Clearspeed`;

    // Use centralized AI configuration
    const modelId = getAIModel();
    const tokenLimit = getTokenLimit();
    
    // Log model usage for monitoring
    console.log(`[AI Chat] Using model: ${modelId} with ${tokenLimit} token limit`);
    
    // Add timeout and error handling for Claude API
    let response;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000); // 25 second timeout
      
      response = await anthropic.messages.create({
        model: modelId,
        max_tokens: tokenLimit,
        temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\nUser Question: ${message}\n\nProvide an intelligent, helpful response that demonstrates deep understanding of the conference and the user's needs.`
          }
        ],
      });
      
      clearTimeout(timeoutId);
    } catch (apiError) {
      console.error('[AI Chat] Claude API error:', apiError);
      
      // Provide a fallback response if API fails
      if (apiError instanceof Error && apiError.message.includes('abort')) {
        throw new Error('Request timeout - Claude API took too long to respond');
      }
      throw apiError;
    }

    // Extract the response
    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';

    // Save messages to database by updating the conversation's messages array
    const updatedMessages = [
      ...(conversation.messages as any[] || []),
      {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString()
      },
      {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date().toISOString()
      }
    ];

    // Create metadata object
    const metadata = {
      sessionCount: sessions.length,
      relevantSessions: relevantSessions.length,
      recommendations: recommendations.length,
      conflicts: conflicts.length,
      intent: intent,
      timestamp: new Date().toISOString()
    };
    
    await prisma.conversation.update({
      where: { id: conversation.id },
      data: { 
        messages: updatedMessages,
        context: metadata
      }
    });

    // Extract actionable items from response
    const actions = extractActions(aiResponse, sessions);

    // Return enhanced response
    return NextResponse.json({
      response: aiResponse,
      metadata: {
        sessionCount: sessions.length,
        relevantSessions: relevantSessions.length,
        recommendations: recommendations.length,
        conflicts: conflicts.length,
        intent: intent,
        actions: actions,
        timestamp: new Date().toISOString()
      },
      suggestedFollowUps: generateFollowUpQuestions(intent, enhancedProfile as UserProfile),
      conversationId: conversation.id,
      quickActions: actions
    });

  } catch (error) {
    console.error('Enhanced Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  } finally {
    // Don't disconnect shared Prisma instance
  }
}

// Analyze user intent from the message
function analyzeIntent(message: string): any {
  const lowerMessage = message.toLowerCase();
  
  const intent = {
    primary: 'general',
    topics: [] as string[],
    timePreference: 'any',
    interactionType: 'query',
    sentiment: 'neutral'
  };

  // Determine primary intent
  if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('should i')) {
    intent.primary = 'recommendation';
  } else if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('itinerary')) {
    intent.primary = 'scheduling';
  } else if (lowerMessage.includes('who') || lowerMessage.includes('speaker')) {
    intent.primary = 'speaker_info';
  } else if (lowerMessage.includes('when') || lowerMessage.includes('time') || lowerMessage.includes('day')) {
    intent.primary = 'timing';
  } else if (lowerMessage.includes('where') || lowerMessage.includes('location') || lowerMessage.includes('room')) {
    intent.primary = 'location';
  } else if (lowerMessage.includes('network') || lowerMessage.includes('meet') || lowerMessage.includes('connect')) {
    intent.primary = 'networking';
  } else if (lowerMessage.includes('learn') || lowerMessage.includes('understand') || lowerMessage.includes('deep dive')) {
    intent.primary = 'learning';
  }

  // Extract topics
  const topicKeywords = {
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'automation', 'automated'],
    'claims': ['claims', 'fnol', 'settlement', 'adjuster', 'loss'],
    'cyber': ['cyber', 'security', 'ransomware', 'breach', 'risk'],
    'embedded': ['embedded', 'integration', 'api', 'platform', 'ecosystem'],
    'distribution': ['distribution', 'channel', 'broker', 'agent', 'direct'],
    'innovation': ['innovation', 'startup', 'disrupt', 'transform', 'future'],
    'data': ['data', 'analytics', 'predictive', 'modeling', 'insights'],
    'customer': ['customer', 'experience', 'cx', 'engagement', 'satisfaction'],
    'underwriting': ['underwriting', 'risk assessment', 'pricing', 'actuarial'],
    'health': ['health', 'medical', 'wellness', 'benefits', 'life'],
    'property': ['property', 'casualty', 'p&c', 'home', 'auto', 'catastrophe'],
    'regulation': ['regulation', 'compliance', 'regulatory', 'legal', 'governance']
  };

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(keyword => lowerMessage.includes(keyword))) {
      intent.topics.push(topic);
    }
  }

  // Determine time preference
  if (lowerMessage.includes('morning')) intent.timePreference = 'morning';
  else if (lowerMessage.includes('afternoon')) intent.timePreference = 'afternoon';
  else if (lowerMessage.includes('day 1') || lowerMessage.includes('first day') || lowerMessage.includes('october 14')) intent.timePreference = 'day1';
  else if (lowerMessage.includes('day 2') || lowerMessage.includes('second day') || lowerMessage.includes('october 15')) intent.timePreference = 'day2';
  else if (lowerMessage.includes('day 3') || lowerMessage.includes('third day') || lowerMessage.includes('last day') || lowerMessage.includes('october 16')) intent.timePreference = 'day3';

  return intent;
}

// Filter sessions based on relevance
function filterRelevantSessions(sessions: any[], intent: any, userProfile: UserProfile): any[] {
  return sessions.filter(session => {
    const relevanceScore = calculateRelevance(session, intent, userProfile);
    return relevanceScore > 0.3; // Threshold for relevance
  });
}

// Calculate relevance score for a session
function calculateRelevance(session: any, intent: any, userProfile: UserProfile): number {
  let score = 0;
  const title = session.title?.toLowerCase() || '';
  const description = session.description?.toLowerCase() || '';
  const track = session.track?.toLowerCase() || '';

  // Topic matching (highest weight)
  intent.topics.forEach((topic: string) => {
    if (title.includes(topic) || description.includes(topic) || track.includes(topic)) {
      score += 0.4;
    }
  });

  // User interest matching
  if (userProfile.interests) {
    userProfile.interests.forEach(interest => {
      if (title.includes(interest.toLowerCase()) || description.includes(interest.toLowerCase())) {
        score += 0.3;
      }
    });
  }

  // Track preference
  if (userProfile.interests?.some(interest => track.includes(interest.toLowerCase()))) {
    score += 0.2;
  }

  // Speaker company matching
  if (userProfile.company && session.speakers) {
    const hasRelevantSpeaker = session.speakers.some((s: any) => 
      s.speaker?.company?.toLowerCase().includes(userProfile.company!.toLowerCase())
    );
    if (hasRelevantSpeaker) score += 0.2;
  }

  // Time preference
  if (intent.timePreference !== 'any') {
    const sessionTime = new Date(session.startTime);
    const hour = sessionTime.getHours();
    
    if (intent.timePreference === 'morning' && hour < 12) score += 0.1;
    else if (intent.timePreference === 'afternoon' && hour >= 12) score += 0.1;
    else if (intent.timePreference === `day${session.day}`) score += 0.2;
  }

  return Math.min(score, 1); // Cap at 1
}

// Detect scheduling conflicts
function detectConflicts(sessions: any[]): any[] {
  const conflicts = [];
  
  for (let i = 0; i < sessions.length; i++) {
    for (let j = i + 1; j < sessions.length; j++) {
      const session1 = sessions[i];
      const session2 = sessions[j];
      
      if (session1.startTime && session2.startTime && session1.endTime && session2.endTime) {
        const start1 = new Date(session1.startTime).getTime();
        const end1 = new Date(session1.endTime).getTime();
        const start2 = new Date(session2.startTime).getTime();
        const end2 = new Date(session2.endTime).getTime();
        
        // Check for overlap
        if ((start1 < end2 && end1 > start2) || (start2 < end1 && end2 > start1)) {
          conflicts.push({
            session1: session1.title,
            session2: session2.title,
            overlapStart: new Date(Math.max(start1, start2)),
            overlapEnd: new Date(Math.min(end1, end2))
          });
        }
      }
    }
  }
  
  return conflicts;
}

// Generate smart recommendations
function generateRecommendations(sessions: any[], userProfile: UserProfile, intent: any): any[] {
  const recommendations = [];
  
  // Learning path recommendations
  if (intent.primary === 'learning' && intent.topics.length > 0) {
    const topicSessions = sessions.filter(s => 
      intent.topics.some((topic: string) => 
        s.title?.toLowerCase().includes(topic) || 
        s.description?.toLowerCase().includes(topic)
      )
    );
    
    // Sort by level (beginner to advanced) and time
    topicSessions.sort((a, b) => {
      const levelOrder = { 'Beginner': 1, 'Intermediate': 2, 'Advanced': 3 };
      const aLevel = levelOrder[a.level as keyof typeof levelOrder] || 2;
      const bLevel = levelOrder[b.level as keyof typeof levelOrder] || 2;
      
      if (aLevel !== bLevel) return aLevel - bLevel;
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    });
    
    recommendations.push({
      type: 'learning_path',
      topic: intent.topics[0],
      sessions: topicSessions.slice(0, 5).map(s => ({
        title: s.title,
        level: s.level,
        time: s.startTime
      }))
    });
  }
  
  // Networking recommendations
  if (intent.primary === 'networking' || userProfile.goals?.includes('networking')) {
    const networkingEvents = sessions.filter(s => 
      s.title?.toLowerCase().includes('networking') ||
      s.title?.toLowerCase().includes('reception') ||
      s.title?.toLowerCase().includes('happy hour') ||
      s.title?.toLowerCase().includes('lunch') ||
      s.title?.toLowerCase().includes('breakfast') ||
      s.title?.toLowerCase().includes('party')
    );
    
    recommendations.push({
      type: 'networking',
      events: networkingEvents.map(s => ({
        title: s.title,
        time: s.startTime,
        description: s.description
      }))
    });
  }
  
  // Must-attend sessions based on profile
  if (userProfile.role) {
    const roleSessions = sessions.filter(s => {
      const relevance = calculateRelevance(s, intent, userProfile);
      return relevance > 0.6;
    });
    
    recommendations.push({
      type: 'must_attend',
      role: userProfile.role,
      sessions: roleSessions.slice(0, 3).map(s => ({
        title: s.title,
        reason: `Highly relevant for ${userProfile.role}`,
        speakers: s.speakers?.map((sp: any) => sp.speaker.name).join(', ')
      }))
    });
  }
  
  return recommendations;
}

// Extract actionable items from AI response
function extractActions(response: string, sessions: any[]): any[] {
  const actions = [];
  
  // Extract session mentions
  sessions.forEach(session => {
    if (response.includes(session.title)) {
      actions.push({
        type: 'add_to_schedule',
        sessionId: session.id,
        sessionTitle: session.title,
        time: session.startTime
      });
    }
  });
  
  // Extract time-based actions
  if (response.toLowerCase().includes('add to calendar') || response.toLowerCase().includes('save')) {
    actions.push({
      type: 'save_schedule',
      description: 'Save recommended sessions to your schedule'
    });
  }
  
  return actions;
}

// Generate follow-up questions
function generateFollowUpQuestions(intent: any, userProfile: UserProfile): string[] {
  const questions = [];
  
  if (!userProfile.role) {
    questions.push("What's your role in the insurance industry?");
  }
  
  if (!userProfile.interests || userProfile.interests.length === 0) {
    questions.push("What specific topics are you most interested in learning about?");
  }
  
  if (intent.primary === 'recommendation') {
    questions.push("Would you like me to create a personalized schedule for you?");
    questions.push("Are there any specific speakers or companies you'd like to hear from?");
  }
  
  if (intent.primary === 'networking') {
    questions.push("What type of connections are you looking to make at the conference?");
  }
  
  if (intent.topics.length > 0) {
    questions.push(`Would you like to see more advanced sessions about ${intent.topics[0]}?`);
  }
  
  return questions.slice(0, 3); // Return top 3 questions
}