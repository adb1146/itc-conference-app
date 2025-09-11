import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG, getAIModel, getTokenLimit } from '@/lib/ai-config';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { message, userPreferences } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Fetch all sessions with speakers
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

    // Format sessions for context
    const sessionsContext = sessions.map(session => {
      // Extract day from tags if available
      const dayTag = session.tags?.find((tag: string) => tag.startsWith('day'));
      const dayNumber = dayTag ? dayTag.replace('day', 'Day ') : null;
      
      return {
        title: session.title,
        description: session.description,
        day: dayNumber,
        startTime: session.startTime,
        endTime: session.endTime,
        track: session.track,
        location: session.location,
        speakers: session.speakers.map(ss => ({
          name: ss.speaker.name,
          role: ss.speaker.role,
          company: ss.speaker.company
        }))
      };
    });

    // Initialize Anthropic
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || '',
    });

    // Create the prompt with session context
    const systemPrompt = `You are an intelligent assistant for the ITC Vegas 2025 conference (October 15-17, 2025). 
You have access to the complete conference agenda and can help attendees:
- Find relevant sessions based on their interests
- Create personalized schedules
- Answer questions about speakers, topics, and timing
- Avoid scheduling conflicts
- Recommend networking opportunities

Conference Sessions:
${JSON.stringify(sessionsContext, null, 2)}

User Preferences (if provided):
${userPreferences ? JSON.stringify(userPreferences, null, 2) : 'None specified'}

Guidelines:
1. Be concise but informative
2. Consider time conflicts when recommending sessions
3. Group recommendations by day
4. Highlight key speakers when relevant
5. Consider the user's role and interests if mentioned
6. Format responses with clear structure (use bullet points, bold for session titles)
7. Include timing and location details`;

    // Use centralized AI configuration
    const modelId = getAIModel();
    const tokenLimit = getTokenLimit();
    
    // Log model usage for monitoring
    console.log(`[Basic Chat] Using model: ${modelId} with ${tokenLimit} token limit`);
    
    const response = await anthropic.messages.create({
      model: modelId,
      max_tokens: tokenLimit,
      messages: [
        {
          role: 'user',
          content: `${systemPrompt}\n\nUser Question: ${message}`
        }
      ],
    });

    // Extract the text response
    const aiResponse = response.content[0].type === 'text' 
      ? response.content[0].text 
      : 'I apologize, but I couldn\'t process your request. Please try again.';

    // Return the response
    return NextResponse.json({
      response: aiResponse,
      sessionCount: sessions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}