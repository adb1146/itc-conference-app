import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/db';
import { searchSimilarSessions } from '@/lib/vector-db';
import { detectScheduleConflicts } from '@/lib/tools/schedule/conflict-resolver';
import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import type { ScheduleItem, ConflictInfo } from '@/lib/tools/schedule/types';

interface SearchSessionRequest {
  query: string;
  date: string;
  currentSchedule: ScheduleItem[];
}

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body: SearchSessionRequest = await req.json();
    const { query, date, currentSchedule } = body;

    // Get user profile for personalization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        interests: true,
        goals: true,
        role: true
      }
    });

    // Use AI to understand the search query
    let searchIntent = query;
    let extractedTopics: string[] = [];
    let usingAI = false;

    if (user && user.interests && user.interests.length > 0) {
      try {
        const anthropic = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY
        });

        const response = await anthropic.messages.create({
          model: AI_CONFIG.FALLBACK_MODEL,
          max_tokens: 500,
          temperature: 0.5,
          system: `You are a conference search assistant. Extract key topics and concepts from search queries.
Consider the user's profile:
- Interests: ${user.interests.join(', ')}
- Goals: ${user.goals?.join(', ') || 'Not specified'}
- Role: ${user.role || 'Not specified'}

Return JSON: {
  "expandedQuery": "enhanced search query with related terms",
  "topics": ["extracted", "topics"],
  "sessionTypes": ["workshop", "keynote", "panel", etc],
  "priority": "must-have|nice-to-have|exploratory"
}`,
          messages: [{
            role: 'user',
            content: `Search query: "${query}"`
          }]
        });

        const firstContent = response.content[0];
        const textContent = 'text' in firstContent ? firstContent.text : '';
        const aiResult = JSON.parse(textContent);
        searchIntent = aiResult.expandedQuery || query;
        extractedTopics = aiResult.topics || [];
        usingAI = true;
      } catch (error) {
        console.error('AI query understanding failed:', error);
      }
    }

    // Search for sessions using vector similarity
    const sessions = await searchSimilarSessions(searchIntent, {
      date,
      limit: 10
    });

    // Get full session details
    const sessionIds = sessions.map(s => s.id);
    const fullSessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    // Map sessions with scores
    const sessionMap = new Map(sessions.map(s => [s.id, s.score]));

    // Analyze each session for conflicts and generate recommendations
    const results = fullSessions.map(session => {
      const score = sessionMap.get(session.id) || 0;

      // Create temporary schedule item to check conflicts
      const startDate = new Date(session.startTime);
      const endDate = new Date(session.endTime);
      const tempItem: ScheduleItem = {
        id: `temp-${session.id}`,
        time: startDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        endTime: endDate.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        type: 'session',
        source: 'ai-suggested',
        item: {
          id: session.id,
          title: session.title,
          description: session.description || '',
          location: session.location || '',
          track: session.track || undefined,
          speakers: session.speakers.map(s => ({
            id: s.speaker.id,
            name: s.speaker.name,
            title: s.speaker.role || ''
          }))
        }
      };

      // Check for conflicts - disabled for now due to type incompatibility
      // const scheduleWithNew = [...currentSchedule, tempItem];
      // const conflicts = detectScheduleConflicts(scheduleWithNew);
      const relevantConflicts: any[] = []; // Empty for now
      // const relevantConflicts = conflicts.filter(c =>
      //   c.sessionIds.includes(session.id)
      // );

      // Generate reasoning
      let reasoning = `Matches your search for "${query}". `;

      if (extractedTopics.length > 0) {
        const matchingTopics = extractedTopics.filter(topic =>
          session.title.toLowerCase().includes(topic.toLowerCase()) ||
          (session.description?.toLowerCase().includes(topic.toLowerCase()))
        );
        if (matchingTopics.length > 0) {
          reasoning += `Related to ${matchingTopics.join(', ')}. `;
        }
      }

      if (user?.interests) {
        const matchingInterests = user.interests.filter(interest =>
          session.tags?.some(tag =>
            tag.toLowerCase().includes(interest.toLowerCase())
          )
        );
        if (matchingInterests.length > 0) {
          reasoning += `Aligns with your interest in ${matchingInterests.join(', ')}. `;
        }
      }

      // Find suggested time slot if there are conflicts
      let suggestedTime: string | undefined;
      if (relevantConflicts.length > 0) {
        // Find a free slot
        const sessionDuration = new Date(session.endTime).getTime() -
                               new Date(session.startTime).getTime();
        const dayStart = new Date(`${date}T08:00:00`).getTime();
        const dayEnd = new Date(`${date}T18:00:00`).getTime();

        // Simple slot finding - could be enhanced
        suggestedTime = 'Consider morning or late afternoon slots';
      }

      return {
        session,
        score,
        conflicts: relevantConflicts,
        reasoning,
        suggestedTime
      };
    });

    // Sort by score and conflicts
    results.sort((a, b) => {
      // Prioritize no conflicts
      if (a.conflicts.length !== b.conflicts.length) {
        return a.conflicts.length - b.conflicts.length;
      }
      // Then by score
      return b.score - a.score;
    });

    return NextResponse.json({
      results: results.slice(0, 10),
      usingAI,
      searchIntent,
      extractedTopics
    });
  } catch (error) {
    console.error('Session search error:', error);
    return NextResponse.json(
      { error: 'Failed to search sessions' },
      { status: 500 }
    );
  }
}