import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIModel, getTokenLimit } from '@/lib/ai-config';
import { getServerSession } from 'next-auth';
import { getAuthOptions } from '@/lib/auth-config';
import prisma from '@/lib/db';
import { createEnhancedPrompt, analyzeQueryComplexity, validateResponseQuality, generateSelfReflectionPrompt } from '@/lib/prompt-engine';
import { selectMasterPrompts, SCENARIO_PROMPTS } from '@/lib/prompts/master-prompt';

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
    const { 
      message, 
      userProfile = {},
      conversationId,
      timezone = 'America/Los_Angeles'
    } = await request.json();

    // Check if user is authenticated (optional for basic chat)
    const session = await getServerSession(getAuthOptions());
    
    // Get the authenticated user if signed in
    let user = null;
    let isGuest = true;
    
    if (session?.user?.email) {
      user = await prisma.user.findUnique({
        where: { email: session.user.email }
      });
      isGuest = false;
    }

    // Use user's actual profile if available, or guest profile
    const enhancedProfile = {
      ...userProfile,
      role: user?.role || userProfile.role,
      company: user?.company || userProfile.company,
      interests: user?.interests || userProfile.interests,
      goals: user?.goals || userProfile.goals,
      name: user?.name || userProfile.name || 'Guest'
    };

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get or create conversation (handle guest sessions)
    let conversation;
    if (conversationId && user) {
      conversation = await prisma.conversation.findFirst({
        where: {
          id: conversationId,
          userId: user.id
        }
      });
    }

    // Only create persistent conversations for logged-in users
    if (!conversation && user) {
      conversation = await prisma.conversation.create({
        data: {
          userId: user.id,
          messages: [], // Initialize with empty messages array
          context: {}
        }
      });
    }

    // Convert DB messages to history format (for logged-in users) or use empty array for guests
    const history = conversation ? 
      (conversation.messages || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })) : [];

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

    // Analyze query complexity using enhanced prompt engine
    const queryComplexity = analyzeQueryComplexity(message);
    const isSimpleQuery = queryComplexity === 'simple';
    
    // Use ONLY relevant sessions, not all sessions!
    // Sort all sessions by relevance first
    const allSessionsWithRelevance = sessions.map(session => ({
      ...session,
      relevanceScore: calculateRelevance(session, intent, enhancedProfile as UserProfile)
    }));
    
    // Filter to only highly relevant sessions (score > 0.3) and limit based on complexity
    const relevantSessionsFiltered = allSessionsWithRelevance
      .filter(s => s.relevanceScore > 0.3)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Limit based on complexity - but only from relevant sessions
    const sessionLimit = queryComplexity === 'simple' ? 10 : 
                        queryComplexity === 'moderate' ? 20 : 
                        30; // Even complex queries shouldn't need more than 30 relevant sessions
    
    // Take only the top relevant sessions
    const topRelevantSessions = relevantSessionsFiltered.slice(0, sessionLimit);
    
    // If we don't have enough relevant sessions, add some recommendations
    const sessionsToUse = topRelevantSessions.length > 0 ? topRelevantSessions : 
                          recommendations.slice(0, 10); // Use recommendations as fallback
    
    // Format sessions with enhanced context
    const sessionsContext = sessionsToUse.map(session => ({
      id: session.id,
      title: session.title,
      description: isSimpleQuery ? undefined : session.description, // Skip descriptions for simple queries
      startTime: session.startTime?.toISOString(),
      endTime: session.endTime?.toISOString(),
      track: session.track,
      location: session.location,
      level: isSimpleQuery ? undefined : session.level,
      tags: session.tags,
      speakers: session.speakers.map((ss: any) => ({
        name: ss.speaker.name,
        role: ss.speaker.role,
        company: ss.speaker.company,
        bio: isSimpleQuery ? undefined : ss.speaker.bio // Skip bios for simple queries
      })),
      // Use pre-calculated relevance score
      relevanceScore: session.relevanceScore || calculateRelevance(session, intent, enhancedProfile as UserProfile)
    }));

    // Sort by relevance
    sessionsContext.sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0));

    // Select model and token limits based on complexity
    const model = queryComplexity === 'simple' ? 'claude-3-haiku-20240307' : 
                  queryComplexity === 'moderate' ? 'claude-3-5-sonnet-20241022' :
                  AI_CONFIG.PRIMARY_MODEL; // Use Opus 4.1 for complex queries
    
    const maxTokens = AI_CONFIG.DYNAMIC_TOKEN_LIMITS[queryComplexity].max;
    const temperature = AI_CONFIG.TEMPERATURE_BY_COMPLEXITY[queryComplexity];
    
    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Create base system prompt
    const baseSystemPrompt = `You are an expert conference concierge AI for ITC Vegas 2025 (October 14-16, 2025). 
You have deep knowledge of insurance technology trends and can provide strategic advice.

YOUR CAPABILITIES:
1. **Personalized Recommendations**: Suggest sessions based on user's role, interests, and goals
2. **Strategic Scheduling**: Create optimal schedules avoiding conflicts and maximizing value
3. **Industry Insights**: Provide context about speakers, companies, and topics
4. **Networking Intelligence**: Identify key networking opportunities based on user's objectives
5. **Learning Paths**: Suggest session sequences for comprehensive topic understanding
6. **Time Optimization**: Balance sessions with breaks and networking time

USER PROFILE:
- Name: ${enhancedProfile.name || 'Guest'}
- Role: ${enhancedProfile.role || 'Not specified'}
- Company: ${enhancedProfile.company || 'Not specified'}
- Interests: ${enhancedProfile.interests?.join(', ') || 'Not specified'}
- Goals: ${enhancedProfile.goals?.join(', ') || 'Not specified'}
- Status: ${isGuest ? 'Guest (Sign in for personalized features)' : 'Authenticated'}

USER INTENT ANALYSIS:
- Primary Intent: ${intent.primary}
- Topics of Interest: ${intent.topics.join(', ')}
- Time Preference: ${intent.timePreference}
- Interaction Type: ${intent.interactionType}

CONVERSATION HISTORY:
${history.slice(-5).map(h => `${h.role}: ${h.content}`).join('\n')}

RELEVANT SESSIONS (Top ${sessionsContext.length} matches for your interests):
${JSON.stringify(sessionsContext, null, 2)}

Total sessions found: ${relevantSessionsFiltered.length} relevant out of ${sessions.length} total

DETECTED CONFLICTS:
${conflicts.length > 0 ? JSON.stringify(conflicts, null, 2) : 'None'}

SMART RECOMMENDATIONS:
${JSON.stringify(recommendations, null, 2)}

RESPONSE GUIDELINES - BE PROACTIVE AND ACTIONABLE:

**CRITICAL: Don't just list information. Be an intelligent assistant that thinks ahead!**

1. **START WITH THE "SO WHAT"** - Immediately explain why this matters to THIS specific user
2. **PROVIDE ACTIONABLE INSIGHTS**:
   - "Based on your ${enhancedProfile.role || 'role'}, you should prioritize..."
   - "⚠️ Warning: These sessions conflict - here's what I recommend..."
   - "💡 Pro tip: Arrive 15 min early to this popular session"
   - "🎯 Perfect for your goal of ${enhancedProfile.goals?.[0] || 'networking'}"

3. **STRUCTURE YOUR RESPONSE FOR ACTION**:
   📍 **What This Means For You:**
   [Personalized insight based on their profile]
   
   ⚡ **Quick Actions:**
   - Action 1: [Specific thing they can do NOW]
   - Action 2: [Next logical step]
   
   ⚠️ **Things to Watch Out For:**
   [Conflicts, timing issues, capacity limits]
   
   💡 **Insider Tips:**
   [Non-obvious value, strategic advice]

4. **ALWAYS END WITH THESE ELEMENTS**:
   - 2-3 specific next actions they can take immediately
   - Smart follow-up questions that anticipate their needs
   - Suggestions that go beyond what they asked

5. **BE SPECIFIC AND PERSONAL**:
   - Reference their company/role when relevant
   - Connect to their stated interests and goals
   - Suggest complementary sessions that build knowledge

6. Consider timezone: ${timezone}
7. Use ⭐ for must-attend sessions
8. Format for clarity with markdown

IMPORTANT CONTEXT:
- Day 1 (Oct 14): Opening day with orientation and kickoff party
- Day 2 (Oct 15): Main conference day with parallel tracks
- Day 3 (Oct 16): Final day with closing keynotes and awards
- Popular tracks: Technology, Claims, Cyber, Distribution, Health
- Key sponsors: State Farm, Jackson, isolved, Clearspeed`;

    // Apply master prompt enhancement based on query type
    const masterPrompts = selectMasterPrompts(message);
    
    // Add scenario-specific prompts if applicable
    let scenarioPrompt = '';
    if (message.toLowerCase().includes('recommend')) {
      scenarioPrompt = SCENARIO_PROMPTS.RECOMMENDATION;
    } else if (message.toLowerCase().includes('problem') || message.toLowerCase().includes('issue')) {
      scenarioPrompt = SCENARIO_PROMPTS.TROUBLESHOOTING;
    } else if (message.toLowerCase().includes('decide') || message.toLowerCase().includes('should i')) {
      scenarioPrompt = SCENARIO_PROMPTS.DECISION_MAKING;
    } else if (message.toLowerCase().includes('learn') || message.toLowerCase().includes('path')) {
      scenarioPrompt = SCENARIO_PROMPTS.LEARNING_PATH;
    }
    
    // Create enhanced prompt using the prompt engine
    const enhancedPrompt = createEnhancedPrompt({
      userMessage: message,
      conversationHistory: history,
      userProfile: enhancedProfile,
      sessionData: sessionsContext.slice(0, 20),
      intent: intent.primary,
      complexity: queryComplexity
    }, baseSystemPrompt + '\n\n' + masterPrompts + '\n\n' + scenarioPrompt);
    
    const systemPrompt = enhancedPrompt.systemPrompt;

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
        model: model,
        max_tokens: maxTokens,
        temperature: temperature,
        messages: [
          {
            role: 'user',
            content: `${systemPrompt}\n\n${enhancedPrompt.enhancedUserMessage}\n\n${enhancedPrompt.responseGuidelines}`
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
    let aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';
    
    // Validate response quality for complex queries
    if (queryComplexity === 'complex') {
      const validation = validateResponseQuality(aiResponse, {
        userMessage: message,
        complexity: queryComplexity
      });
      
      if (!validation.isValid && validation.suggestions) {
        console.log('[AI Chat] Response quality issues:', validation.suggestions);
        
        // For complex queries, consider a self-reflection pass
        const reflectionPrompt = generateSelfReflectionPrompt(aiResponse, {
          userMessage: message,
          complexity: queryComplexity
        });
        
        // Optional: Make a second pass for improvement (only for complex queries)
        try {
          const refinedResponse = await anthropic.messages.create({
            model: model,
            max_tokens: maxTokens,
            temperature: temperature * 0.8, // Slightly lower temperature for refinement
            messages: [
              {
                role: 'user',
                content: reflectionPrompt
              }
            ],
          });
          
          if (refinedResponse.content[0].type === 'text') {
            const refinedText = refinedResponse.content[0].text;
            // Only use refined version if it's substantially better
            if (refinedText.length > aiResponse.length * 1.2) {
              aiResponse = refinedText;
              console.log('[AI Chat] Used refined response for complex query');
            }
          }
        } catch (refinementError) {
          console.error('[AI Chat] Refinement failed, using original response:', refinementError);
        }
      }
    }

    // Only save to database for authenticated users
    if (conversation && user) {
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
    }

    // Extract actionable items from response
    const actions = extractActions(aiResponse, sessions);

    // Return enhanced response with FILTERED relevant sessions
    const sessionsToReturn = topRelevantSessions.length > 0 ? topRelevantSessions : 
                            recommendations.length > 0 ? recommendations.slice(0, 5) : [];
    
    console.log('[AI Chat] Query complexity:', queryComplexity, 'Model:', model, 'Tokens:', maxTokens);
    console.log('[AI Chat] Returning sessions:', sessionsToReturn.length, 'filtered relevant:', topRelevantSessions.length, 'old relevant:', relevantSessions.length, 'recommendations:', recommendations.length);
    
    return NextResponse.json({
      response: aiResponse,
      sessions: sessionsToReturn.map(s => ({
        id: s.id,
        title: s.title,
        startTime: s.startTime,
        endTime: s.endTime,
        location: s.location,
        track: s.track,
        speakers: s.speakers?.map((ss: any) => ({
          name: ss.speaker.name,
          role: ss.speaker.role,
          company: ss.speaker.company
        })) || []
      })), // Include relevant session data for rich display
      metadata: {
        sessionCount: sessions.length,
        relevantSessions: relevantSessions.length,
        recommendations: recommendations.length,
        conflicts: conflicts.length,
        intent: intent,
        actions: actions,
        queryComplexity: queryComplexity,
        model: model,
        enhancedPrompt: true,
        timestamp: new Date().toISOString()
      },
      suggestedFollowUps: generateFollowUpQuestions(intent, enhancedProfile as UserProfile),
      conversationId: conversation?.id || conversationId || `guest-${Date.now()}`,
      quickActions: actions,
      isGuest: isGuest
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

  // Extract topics with more specific AI keywords
  const topicKeywords = {
    'ai': ['ai', 'artificial intelligence', 'machine learning', 'ml', 'automation', 'automated', 'llm', 'generative', 'chatbot', 'neural', 'deep learning', 'cognitive', 'nlp', 'computer vision'],
    'claims': ['claims', 'fnol', 'settlement', 'adjuster', 'loss', 'subrogation', 'fraud detection'],
    'cyber': ['cyber', 'security', 'ransomware', 'breach', 'risk', 'vulnerability', 'threat'],
    'embedded': ['embedded', 'integration', 'api', 'platform', 'ecosystem', 'white label'],
    'distribution': ['distribution', 'channel', 'broker', 'agent', 'direct', 'marketplace'],
    'innovation': ['innovation', 'startup', 'disrupt', 'transform', 'future', 'emerging', 'trends'],
    'data': ['data', 'analytics', 'predictive', 'modeling', 'insights', 'visualization', 'bi'],
    'customer': ['customer', 'experience', 'cx', 'engagement', 'satisfaction', 'journey', 'personalization'],
    'underwriting': ['underwriting', 'risk assessment', 'pricing', 'actuarial', 'rating'],
    'health': ['health', 'medical', 'wellness', 'benefits', 'life', 'healthcare'],
    'property': ['property', 'casualty', 'p&c', 'home', 'auto', 'catastrophe', 'commercial'],
    'regulation': ['regulation', 'compliance', 'regulatory', 'legal', 'governance', 'privacy']
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

// Filter sessions based on relevance with higher threshold
function filterRelevantSessions(sessions: any[], intent: any, userProfile: UserProfile): any[] {
  return sessions
    .map(session => ({
      ...session,
      relevanceScore: calculateRelevance(session, intent, userProfile)
    }))
    .filter(session => session.relevanceScore > 0.4) // Higher threshold for better filtering
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 20); // Return only top 20 most relevant
}

// Calculate relevance score for a session with improved AI detection
function calculateRelevance(session: any, intent: any, userProfile: UserProfile): number {
  let score = 0;
  const title = session.title?.toLowerCase() || '';
  const description = session.description?.toLowerCase() || '';
  const track = session.track?.toLowerCase() || '';
  const tags = session.tags?.map((t: string) => t.toLowerCase()) || [];

  // Enhanced AI-specific keyword matching
  const aiKeywords = ['ai', 'artificial intelligence', 'machine learning', 'ml', 'automation', 
                      'llm', 'generative', 'chatbot', 'gpt', 'neural', 'deep learning', 
                      'cognitive', 'nlp', 'computer vision', 'predictive', 'algorithm'];
  
  // Strong match if AI is in the query and session
  if (intent.topics.includes('ai')) {
    const aiMatches = aiKeywords.filter(keyword => 
      title.includes(keyword) || description.includes(keyword) || 
      track.includes(keyword) || tags.some(tag => tag.includes(keyword))
    );
    
    // Give higher scores for more specific AI matches
    if (aiMatches.length > 0) {
      score += Math.min(0.5 + (aiMatches.length * 0.1), 0.8); // Up to 0.8 for strong AI match
    }
  }

  // Topic matching (adjusted weight)
  intent.topics.forEach((topic: string) => {
    if (topic !== 'ai') { // AI already handled above
      if (title.includes(topic) || description.includes(topic) || track.includes(topic)) {
        score += 0.3;
      }
    }
  });

  // User interest matching with better scoring
  if (userProfile.interests) {
    userProfile.interests.forEach(interest => {
      const interestLower = interest.toLowerCase();
      
      // Strong match in title
      if (title.includes(interestLower)) {
        score += 0.4;
      }
      // Moderate match in description
      else if (description.includes(interestLower)) {
        score += 0.2;
      }
      // Weak match in track or tags
      else if (track.includes(interestLower) || tags.some(tag => tag.includes(interestLower))) {
        score += 0.1;
      }
    });
  }

  // Track preference (reduced weight to avoid over-matching)
  if (userProfile.interests?.some(interest => track.includes(interest.toLowerCase()))) {
    score += 0.1;
  }

  // Speaker company matching (reduced weight)
  if (userProfile.company && session.speakers) {
    const hasRelevantSpeaker = session.speakers.some((s: any) => 
      s.speaker?.company?.toLowerCase().includes(userProfile.company!.toLowerCase())
    );
    if (hasRelevantSpeaker) score += 0.1;
  }

  // Time preference (reduced weight)
  if (intent.timePreference !== 'any') {
    const sessionTime = new Date(session.startTime);
    const hour = sessionTime.getHours();
    
    if (intent.timePreference === 'morning' && hour < 12) score += 0.05;
    else if (intent.timePreference === 'afternoon' && hour >= 12) score += 0.05;
    else if (intent.timePreference === `day${session.day}`) score += 0.1;
  }

  // Penalize generic sessions when specific topics are requested
  if (intent.topics.length > 0) {
    const isGeneric = ['keynote', 'opening', 'closing', 'lunch', 'break', 'networking', 'reception']
      .some(generic => title.includes(generic));
    if (isGeneric && score < 0.3) {
      score *= 0.5; // Reduce score for generic sessions unless they strongly match
    }
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

// Generate actionable follow-up questions that anticipate user needs
function generateFollowUpQuestions(intent: any, userProfile: UserProfile): string[] {
  const questions = [];
  
  // Context-aware, actionable follow-ups based on what was just discussed
  if (intent.primary === 'schedule' || intent.primary === 'recommendation') {
    questions.push("🗓️ Build my personalized Day 2 schedule avoiding all conflicts");
    questions.push("⚠️ Show me which popular sessions I should arrive early for");
    questions.push("🎯 Find sessions that complement these for a learning path");
  }
  
  if (intent.primary === 'networking') {
    questions.push("🤝 Identify the best networking breaks between these sessions");
    questions.push("👥 Which speakers should I connect with based on my interests?");
    questions.push("📍 Where are the sponsor booths I should visit between sessions?");
  }
  
  if (intent.primary === 'information') {
    questions.push("📊 Compare these sessions to help me choose the best one");
    questions.push("💡 What are the key takeaways I should expect from these?");
    questions.push("🔄 Show me alternative sessions if these are full");
  }
  
  // Proactive suggestions based on time of day
  const now = new Date();
  const hour = now.getHours();
  
  if (hour < 12) {
    questions.push("☕ What's the best session to start my day with?");
  } else if (hour < 17) {
    questions.push("🍽️ Which lunch sessions offer the best networking?");
  } else {
    questions.push("🌙 What evening events should I attend for networking?");
  }
  
  // Personalized based on profile
  if (userProfile.goals?.includes('Learn')) {
    questions.push("📚 Create a learning track for " + (userProfile.interests?.[0] || "emerging tech"));
  }
  
  if (userProfile.goals?.includes('Network')) {
    questions.push("🎪 Which vendor parties align with my company's needs?");
  }
  
  if (userProfile.goals?.includes('Find Solutions')) {
    questions.push("🛠️ Which vendors offer solutions for " + (userProfile.role || "my role") + "?");
  }
  
  // Smart suggestions that go beyond what they asked
  questions.push("💡 Show me hidden gem sessions others might miss");
  questions.push("📈 What are the top 3 trends I should pay attention to?");
  questions.push("🏃 Create an efficient route through the expo floor");
  
  return questions.slice(0, 4); // Return top 4 actionable questions
}