import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock responses for common queries
const MOCK_RESPONSES: Record<string, string> = {
  'hello': 'Hello! I\'m your ITC Vegas 2025 AI Concierge. I can help you explore sessions, find speakers, and plan your conference schedule. What would you like to know?',
  'help': 'I can help you with:\n• Finding sessions by topic or day\n• Information about speakers\n• Planning your conference schedule\n• Getting session recommendations\n\nWhat would you like to explore?',
  'day 1': 'Day 1 (October 15, 2025) features opening keynotes, AI & Innovation tracks, and networking sessions. Would you like specific session recommendations?',
  'day 2': 'Day 2 (October 16, 2025) includes Digital Transformation, Claims & Underwriting, and Customer Experience tracks. What topics interest you?',
  'day 3': 'Day 3 (October 17, 2025) offers Embedded Insurance, Cybersecurity, and closing keynote sessions. Would you like to see the schedule?',
  'ai': 'There are numerous AI-focused sessions including:\n• AI in Claims Processing\n• Machine Learning for Risk Assessment\n• Generative AI in Insurance\n• Automation & Efficiency tracks\n\nWhich area interests you most?',
  'speakers': 'ITC Vegas 2025 features 200+ industry leaders from companies like MetLife, State Farm, Allstate, and innovative InsurTech startups. Would you like recommendations based on your interests?',
  'register': 'To register for ITC Vegas 2025, you can create an account directly through our chat interface. Would you like to start the registration process now?',
  'schedule': 'The conference runs October 15-17, 2025. Each day starts at 8:00 AM with registration and breakfast, followed by keynotes at 9:00 AM. Sessions run throughout the day until 5:30 PM, with networking events in the evenings.',
  'default': 'I understand you\'re asking about the conference. While our AI service is temporarily limited, I can help with basic information about sessions, speakers, and scheduling. Please try asking about specific days, topics, or speakers.'
};

function findBestResponse(message: string): string {
  const lowerMessage = message.toLowerCase();
  
  // Check for exact matches first
  for (const [key, response] of Object.entries(MOCK_RESPONSES)) {
    if (lowerMessage.includes(key) && key !== 'default') {
      return response;
    }
  }
  
  // Return default response
  return MOCK_RESPONSES.default;
}

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get mock response based on message
    const response = findBestResponse(message);
    
    // Add a small delay to simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    return NextResponse.json({
      response,
      performance: {
        model: 'Mock Response (API Credits Exhausted)',
        contextSessions: 0,
        responseTime: 'instant'
      },
      timestamp: new Date().toISOString(),
      isMock: true
    });

  } catch (error) {
    console.error('Mock Chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process chat request' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}