import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';

const prisma = new PrismaClient();

// Model selection based on query complexity
const FAST_MODEL = 'claude-3-haiku-20240307';  // Fastest, good for simple queries
const BALANCED_MODEL = 'claude-3-5-sonnet-20241022';  // Balanced speed/quality
const POWERFUL_MODEL = 'claude-opus-4-1-20250805';  // Most capable but slowest

// Keywords that indicate complex queries needing more powerful models
const COMPLEX_KEYWORDS = ['schedule', 'personalized', 'recommend', 'conflict', 'multiple', 'compare', 'analyze', 'strategy'];
const SIMPLE_KEYWORDS = ['when', 'where', 'who', 'what time', 'location', 'speaker'];

function determineModel(message: string): { model: string; maxTokens: number } {
  const lowerMessage = message.toLowerCase();
  
  // Check for simple queries first (use fastest model)
  if (SIMPLE_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) && 
      lowerMessage.length < 50) {
    return { model: FAST_MODEL, maxTokens: 500 };
  }
  
  // Check for complex queries (use powerful model)
  if (COMPLEX_KEYWORDS.some(keyword => lowerMessage.includes(keyword)) ||
      lowerMessage.length > 200) {
    return { model: BALANCED_MODEL, maxTokens: 1500 };
  }
  
  // Default to fast model for medium complexity
  return { model: FAST_MODEL, maxTokens: 800 };
}

// Extract relevant context based on query
async function getRelevantContext(message: string) {
  const lowerMessage = message.toLowerCase();
  
  // Extract search terms from the message
  const searchTerms = [];
  
  // Look for day references
  if (lowerMessage.includes('day 1') || lowerMessage.includes('first day') || lowerMessage.includes('october 15')) {
    searchTerms.push({ tags: { has: 'day1' } });
  }
  if (lowerMessage.includes('day 2') || lowerMessage.includes('second day') || lowerMessage.includes('october 16')) {
    searchTerms.push({ tags: { has: 'day2' } });
  }
  if (lowerMessage.includes('day 3') || lowerMessage.includes('third day') || lowerMessage.includes('october 17')) {
    searchTerms.push({ tags: { has: 'day3' } });
  }
  
  // Look for topic keywords
  const topics = ['ai', 'cyber', 'claims', 'underwriting', 'embedded', 'data', 'digital', 'customer'];
  const matchedTopics = topics.filter(topic => lowerMessage.includes(topic));
  
  // Build the query
  let whereClause: any = {};
  
  if (searchTerms.length > 0) {
    whereClause.OR = searchTerms;
  }
  
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
          { OR: searchTerms },
          { OR: topicConditions }
        ]
      };
    } else {
      whereClause.OR = topicConditions;
    }
  }
  
  // If asking about speakers, include speaker info
  const includeSpeakers = lowerMessage.includes('speaker') || 
                          lowerMessage.includes('who') || 
                          lowerMessage.includes('present');
  
  // Fetch relevant sessions (limit to 30 most relevant)
  const sessions = await prisma.session.findMany({
    where: Object.keys(whereClause).length > 0 ? whereClause : undefined,
    include: includeSpeakers ? {
      speakers: {
        include: {
          speaker: true
        }
      }
    } : undefined,
    take: 30,
    orderBy: [
      { startTime: 'asc' }
    ]
  });
  
  // If no specific sessions found, get a sample
  if (sessions.length === 0) {
    const sampleSessions = await prisma.session.findMany({
      take: 20,
      include: includeSpeakers ? {
        speakers: {
          include: {
            speaker: true
          }
        }
      } : undefined,
      orderBy: [
        { startTime: 'asc' }
      ]
    });
    return sampleSessions;
  }
  
  return sessions;
}

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Determine which model to use based on query complexity
    const { model, maxTokens } = determineModel(message);
    
    // Get only relevant context instead of all sessions
    const sessions = await getRelevantContext(message);
    
    // Format sessions for context (lighter format for faster processing)
    const sessionsContext = sessions.map(session => {
      const dayTag = session.tags?.find((tag: string) => tag.startsWith('day'));
      const dayNumber = dayTag ? dayTag.replace('day', 'Day ') : null;
      
      const sessionInfo: any = {
        title: session.title,
        day: dayNumber,
        time: `${new Date(session.startTime).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        })}`,
        track: session.track,
        location: session.location
      };
      
      // Only include full details if needed
      if (message.toLowerCase().includes('description') || 
          message.toLowerCase().includes('about')) {
        sessionInfo.description = session.description?.substring(0, 200);
      }
      
      if ('speakers' in session) {
        sessionInfo.speakers = session.speakers.map((ss: any) => ss.speaker.name).join(', ');
      }
      
      return sessionInfo;
    });

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Simplified, focused prompt for faster processing
    const systemPrompt = `You are a helpful assistant for ITC Vegas 2025 (Oct 15-17). 
Be concise and direct. Format with bullet points when listing items.

Available Sessions: ${JSON.stringify(sessionsContext, null, 2)}

User Info: ${userPreferences?.name ? userPreferences.name : 'Guest'}${userPreferences?.interests ? ', interested in ' + userPreferences.interests.join(', ') : ''}`;

    console.log(`[Fast Chat] Using model: ${model} with ${maxTokens} token limit`);
    
    // Make the API call with optimized settings
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature: 0.5, // Lower temperature for more consistent, faster responses
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nQuestion: ${message}\n\nProvide a concise, helpful answer.`
        }
      ],
    });

    // Extract the text response
    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';

    // Return the response with metadata
    return NextResponse.json({
      response: aiResponse,
      model: model.includes('haiku') ? 'Fast' : model.includes('sonnet') ? 'Balanced' : 'Powerful',
      sessionCount: sessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Fast Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}