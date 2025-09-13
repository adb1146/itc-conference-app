import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { createEnhancedPrompt, analyzeQueryComplexity } from '@/lib/prompt-engine';
import { selectMasterPrompts } from '@/lib/prompts/master-prompt';

const prisma = new PrismaClient();

// Model selection based on query complexity
const FAST_MODEL = 'claude-3-haiku-20240307';  // Fastest, good for simple queries
const BALANCED_MODEL = 'claude-3-5-sonnet-20241022';  // Balanced speed/quality
const POWERFUL_MODEL = 'claude-opus-4-1-20250805';  // Most capable but slowest

// Keywords that indicate complex queries needing more powerful models
const COMPLEX_KEYWORDS = ['schedule', 'personalized', 'recommend', 'conflict', 'multiple', 'compare', 'analyze', 'strategy', 'best', 'should i'];
const SIMPLE_KEYWORDS = ['when', 'where', 'who', 'what time', 'location', 'speaker', 'how many', 'list'];

function determineModel(message: string): { model: string; maxTokens: number; temperature: number } {
  // Use enhanced complexity analysis
  const complexity = analyzeQueryComplexity(message);
  
  if (complexity === 'simple') {
    return { 
      model: FAST_MODEL, 
      maxTokens: AI_CONFIG.DYNAMIC_TOKEN_LIMITS.simple.max,
      temperature: AI_CONFIG.TEMPERATURE_BY_COMPLEXITY.simple
    };
  } else if (complexity === 'moderate') {
    return { 
      model: BALANCED_MODEL, 
      maxTokens: AI_CONFIG.DYNAMIC_TOKEN_LIMITS.moderate.max,
      temperature: AI_CONFIG.TEMPERATURE_BY_COMPLEXITY.moderate
    };
  } else {
    // Use Opus for complex queries
    return { 
      model: POWERFUL_MODEL, 
      maxTokens: AI_CONFIG.DYNAMIC_TOKEN_LIMITS.complex.max,
      temperature: AI_CONFIG.TEMPERATURE_BY_COMPLEXITY.complex
    };
  }
}

// Extract relevant context based on query
async function getRelevantContext(message: string) {
  const lowerMessage = message.toLowerCase();
  
  // Build search conditions
  const searchConditions = [];
  
  // Look for day references
  if (lowerMessage.includes('day 1') || lowerMessage.includes('first day') || lowerMessage.includes('october 15') || lowerMessage.includes('oct 15')) {
    searchConditions.push({ tags: { has: 'day1' } });
  }
  if (lowerMessage.includes('day 2') || lowerMessage.includes('second day') || lowerMessage.includes('october 16') || lowerMessage.includes('oct 16')) {
    searchConditions.push({ tags: { has: 'day2' } });
  }
  if (lowerMessage.includes('day 3') || lowerMessage.includes('third day') || lowerMessage.includes('october 17') || lowerMessage.includes('oct 17')) {
    searchConditions.push({ tags: { has: 'day3' } });
  }
  
  // Look for topic keywords in the message
  const topicKeywords = [
    'ai', 'artificial intelligence', 'machine learning', 'automation',
    'cyber', 'security', 'cybersecurity',
    'claims', 'claim processing',
    'underwriting', 'risk assessment',
    'embedded', 'embedded insurance',
    'data', 'analytics', 'data science',
    'digital', 'digitalization', 'transformation',
    'customer', 'customer experience', 'cx',
    'blockchain', 'web3',
    'iot', 'telematics',
    'insurtech', 'innovation'
  ];
  
  const matchedTopics = topicKeywords.filter(topic => lowerMessage.includes(topic));
  
  // Build the where clause
  let whereClause: any = {};
  
  // Add day conditions
  if (searchConditions.length > 0) {
    whereClause.OR = searchConditions;
  }
  
  // Add topic conditions
  if (matchedTopics.length > 0) {
    const topicConditions = matchedTopics.map(topic => ({
      OR: [
        { title: { contains: topic, mode: 'insensitive' } },
        { description: { contains: topic, mode: 'insensitive' } },
        { track: { contains: topic, mode: 'insensitive' } }
      ]
    }));
    
    if (whereClause.OR) {
      whereClause = {
        AND: [
          { OR: searchConditions },
          { OR: topicConditions }
        ]
      };
    } else {
      whereClause.OR = topicConditions;
    }
  }
  
  // Check if we need speaker information
  const needsSpeakers = lowerMessage.includes('speaker') || 
                        lowerMessage.includes('who') || 
                        lowerMessage.includes('present') ||
                        lowerMessage.includes('panelist');
  
  // For general queries or if no specific filters, return a representative sample
  const isGeneralQuery = matchedTopics.length === 0 && searchConditions.length === 0;
  const limit = isGeneralQuery ? 25 : 40; // Fewer sessions for general queries
  
  // Fetch relevant sessions
  const sessions = await prisma.session.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: needsSpeakers ? {
      speakers: {
        include: {
          speaker: true
        }
      }
    } : undefined,
    take: limit,
    orderBy: [
      { startTime: 'asc' }
    ]
  });
  
  return sessions;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Determine which model to use based on query complexity
    const { model, maxTokens, temperature } = determineModel(message);
    const queryComplexity = analyzeQueryComplexity(message);
    
    // Get only relevant context instead of all sessions
    const sessions = await getRelevantContext(message);
    
    // Format sessions for context (optimized format)
    const sessionsContext = sessions.map(session => {
      const dayTag = session.tags?.find((tag: string) => tag.startsWith('day'));
      const dayNumber = dayTag ? dayTag.replace('day', 'Day ') : null;
      
      const sessionInfo: any = {
        id: session.id, // Include session ID for linking
        title: session.title,
        day: dayNumber,
        time: session.startTime ? `${new Date(session.startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}` : 'TBD',
        track: session.track || 'General',
        location: session.location || 'TBD'
      };
      
      // Only include descriptions for complex queries
      if (model !== FAST_MODEL && session.description) {
        sessionInfo.description = session.description.substring(0, 150) + '...';
      }
      
      // Include speakers if available
      if ('speakers' in session && session.speakers.length > 0) {
        sessionInfo.speakers = session.speakers.map((ss: any) => ({
          name: ss.speaker.name,
          company: ss.speaker.company
        }));
      }
      
      return sessionInfo;
    });

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Create base prompt
    const basePrompt = `You are an intelligent assistant for ITC Vegas 2025 (October 15-17, 2025).

Available Sessions (${sessions.length} shown):
${JSON.stringify(sessionsContext, null, 2)}

User: ${userPreferences?.name || 'Guest'}
Interests: ${userPreferences?.interests?.join(', ') || 'Not specified'}

Guidelines:
- Be concise but comprehensive
- Use bullet points for lists
- Include timing and location details
- Consider scheduling conflicts
- Bold important session titles`;
    
    // Select and apply master prompts based on query
    const masterPrompts = selectMasterPrompts(message);
    
    // Create enhanced prompt using the prompt engine
    const enhancedPrompt = createEnhancedPrompt({
      userMessage: message,
      userProfile: userPreferences,
      sessionData: sessionsContext,
      complexity: queryComplexity
    }, basePrompt + '\n\n' + masterPrompts);
    
    const systemPrompt = enhancedPrompt.systemPrompt;

    console.log(`[Enhanced Chat] Complexity: ${queryComplexity}, Model: ${model}, Tokens: ${maxTokens}, Sessions: ${sessions.length}`);
    
    // Make the API call with enhanced settings
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: temperature,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\n${enhancedPrompt.enhancedUserMessage}\n\n${enhancedPrompt.responseGuidelines}`
        }
      ],
    });

    // Extract the text response
    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';

    // Return the response with performance metadata and session data
    return NextResponse.json({
      response: aiResponse,
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title
      })), // Include session data for linking
      performance: {
        model: model.includes('haiku') ? 'Fast (Haiku)' : 
               model.includes('sonnet') ? 'Balanced (Sonnet)' : 
               'Powerful (Opus)',
        complexity: queryComplexity,
        contextSessions: sessions.length,
        enhancedPrompt: true,
        responseTime: 'optimized'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    
    // Parse error message if it's a string containing JSON
    let errorMessage = 'Failed to process your request. Please try again.';
    let statusCode = 500;
    
    if (error?.message) {
      try {
        // Try to parse JSON error from the message
        const jsonMatch = error.message.match(/\{.*\}/);
        if (jsonMatch) {
          const errorData = JSON.parse(jsonMatch[0]);
          
          // Check for specific error types
          if (errorData?.error?.message?.includes('credit balance')) {
            // Fallback to mock responses when credits are exhausted
            console.log('API credits exhausted, using mock responses');
            
            // Import the mock response handler
            const { POST: mockHandler } = await import('./mock-route');
            return mockHandler(request);
          } else if (errorData?.error?.type === 'rate_limit_error') {
            errorMessage = 'The service is experiencing high demand. Please wait a moment and try again.';
            statusCode = 429;
          } else if (errorData?.error?.message) {
            errorMessage = 'Service temporarily unavailable. Please try again later.';
            statusCode = 503;
          }
        }
      } catch (parseError) {
        // If parsing fails, use the default error message
        console.error('Error parsing error message:', parseError);
      }
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode }
    );
  } finally {
    await prisma.$disconnect();
  }
}