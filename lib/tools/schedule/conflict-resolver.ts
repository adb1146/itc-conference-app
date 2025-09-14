/**
 * Intelligent Conflict Resolution with AI
 * Detects and resolves scheduling conflicts using Claude Opus 4.1
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import type {
  ScheduleItem,
  ConflictInfo,
  AlternativeSession,
  Session
} from './types';
import { calculateVenueDistance } from './venue-distance';
import { searchSimilarSessions } from '@/lib/vector-db';

export interface ConflictResolutionContext {
  conflict: ConflictInfo;
  currentSchedule: ScheduleItem[];
  availableSessions: Session[];
  userProfile: any;
  userInterests: string[];
  date: string;
}

export interface ConflictResolution {
  type: 'swap' | 'remove' | 'reschedule' | 'accept';
  action: string;
  reasoning: string;
  confidence: number;
  alternatives: AlternativeSession[];
  impact: {
    sessionsAffected: number;
    walkingTimeChange: number;
    contentQualityChange: number;
  };
}

/**
 * Detect all conflicts in a schedule
 */
export function detectScheduleConflicts(
  schedule: ScheduleItem[],
  venueWalkingMinutes: number = 10
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];

  // Sort schedule by time
  const sortedSchedule = [...schedule].sort((a, b) => {
    const timeA = new Date(`2025-10-15 ${a.time}`).getTime();
    const timeB = new Date(`2025-10-15 ${b.time}`).getTime();
    return timeA - timeB;
  });

  for (let i = 0; i < sortedSchedule.length; i++) {
    const current = sortedSchedule[i];

    // Skip non-session items
    if (current.type !== 'session') continue;

    // Check for time conflicts with next item
    if (i < sortedSchedule.length - 1) {
      const next = sortedSchedule[i + 1];
      const currentEnd = new Date(`2025-10-15 ${current.endTime}`).getTime();
      const nextStart = new Date(`2025-10-15 ${next.time}`).getTime();

      // Direct overlap
      if (currentEnd > nextStart) {
        conflicts.push({
          type: 'time-overlap',
          sessionIds: [current.item.id, next.item.id],
          description: `"${current.item.title}" overlaps with "${next.item.title}"`,
          resolution: 'Choose one session or find alternative times'
        });
      }

      // Venue distance conflict
      if (next.type === 'session' && current.item.location && next.item.location) {
        const distance = calculateVenueDistance(
          current.item.location,
          next.item.location
        );

        const availableMinutes = (nextStart - currentEnd) / (1000 * 60);

        if (distance.walkingMinutes > availableMinutes) {
          conflicts.push({
            type: 'venue-distance',
            sessionIds: [current.item.id, next.item.id],
            description: `Not enough time (${Math.round(availableMinutes)} min) to walk from ${current.item.location} to ${next.item.location} (needs ${distance.walkingMinutes} min)`,
            resolution: `Need ${distance.walkingMinutes - availableMinutes} more minutes between sessions`
          });
        }
      }
    }

    // Check for meal conflicts
    const sessionTime = new Date(`2025-10-15 ${current.time}`).getHours();
    if (current.type === 'session') {
      if (sessionTime === 12 || sessionTime === 13) {
        // Check if lunch is scheduled
        const hasLunch = sortedSchedule.some(item =>
          item.type === 'meal' &&
          item.item.title.toLowerCase().includes('lunch')
        );
        if (!hasLunch) {
          conflicts.push({
            type: 'meal-conflict',
            sessionIds: [current.item.id],
            description: `Session "${current.item.title}" scheduled during typical lunch time`,
            resolution: 'Consider moving session or planning a working lunch'
          });
        }
      }
    }
  }

  return conflicts;
}

/**
 * Use AI to intelligently resolve conflicts
 */
export async function resolveConflictWithAI(
  context: ConflictResolutionContext
): Promise<ConflictResolution> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  try {
    // Find similar alternative sessions using vector search
    const conflictedSessions = context.currentSchedule.filter(item =>
      context.conflict.sessionIds.includes(item.item.id)
    );

    const alternatives = await findAlternativeSessions(
      conflictedSessions,
      context.availableSessions,
      context.userInterests
    );

    const systemPrompt = generateConflictResolutionPrompt();
    const userPrompt = formatConflictContext(context, alternatives);

    const response = await anthropic.messages.create({
      model: AI_CONFIG.PRIMARY_MODEL,
      max_tokens: 2000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    const contentBlock = response.content[0];
    if (contentBlock.type === 'text') {
      return parseResolutionResponse(contentBlock.text, alternatives);
    } else {
      throw new Error('Unexpected response type from AI');
    }
  } catch (error) {
    console.error('AI conflict resolution error:', error);
    return generateFallbackResolution(context);
  }
}

/**
 * Find alternative sessions using vector similarity
 */
async function findAlternativeSessions(
  conflictedSessions: ScheduleItem[],
  availableSessions: Session[],
  userInterests: string[]
): Promise<AlternativeSession[]> {
  const alternatives: AlternativeSession[] = [];

  for (const session of conflictedSessions) {
    if (session.type !== 'session') continue;

    // Use vector search to find similar sessions
    const query = `${session.item.title} ${session.item.description || ''} ${userInterests.join(' ')}`;

    try {
      const similar = await searchSimilarSessions(query, {
        excludeIds: [session.item.id],
        limit: 3
      });

      for (const alt of similar) {
        alternatives.push({
          id: alt.id,
          title: alt.title,
          confidence: Math.round(alt.score * 100),
          reasoning: `Similar content to "${session.item.title}" with ${Math.round(alt.score * 100)}% match`
        });
      }
    } catch (error) {
      console.error('Vector search error:', error);
      // Fallback to keyword matching
      const keywords = session.item.title.toLowerCase().split(' ');
      const matches = availableSessions
        .filter(s =>
          s.id !== session.item.id &&
          keywords.some(k => s.title.toLowerCase().includes(k))
        )
        .slice(0, 3);

      for (const match of matches) {
        alternatives.push({
          id: match.id,
          title: match.title,
          confidence: 60,
          reasoning: `Related topic to "${session.item.title}"`
        });
      }
    }
  }

  return alternatives;
}

/**
 * Generate AI prompt for conflict resolution
 */
function generateConflictResolutionPrompt(): string {
  return `You are an expert conference schedule conflict resolver.

CONFLICT RESOLUTION FRAMEWORK:

1. ANALYZE THE CONFLICT:
   - Understand the type (time overlap, venue distance, meal conflict)
   - Assess impact on user's goals and interests
   - Consider the importance of each conflicted session

2. RESOLUTION STRATEGIES:
   - SWAP: Replace one session with an alternative at a different time
   - REMOVE: Drop the less important session
   - RESCHEDULE: Move sessions to different time slots if possible
   - ACCEPT: Keep the conflict if benefits outweigh costs (e.g., partial attendance)

3. DECISION FACTORS:
   - User's explicit favorites have highest priority
   - Sessions with favorited speakers are second priority
   - AI suggestions can be more easily replaced
   - Consider content uniqueness and recording availability
   - Account for networking opportunities
   - Factor in physical constraints (walking time, energy)

4. SMART TRADE-OFFS:
   - Prioritize rare/unique content over common topics
   - Consider speaker reputation and expertise
   - Balance immediate value vs long-term benefit
   - Account for session prerequisites or sequences

OUTPUT FORMAT:
{
  "type": "swap|remove|reschedule|accept",
  "action": "Clear description of what to do",
  "reasoning": "Why this is the best solution",
  "confidence": 0-100,
  "alternatives": [array of alternative sessions],
  "impact": {
    "sessionsAffected": number,
    "walkingTimeChange": minutes,
    "contentQualityChange": -100 to +100
  }
}`;
}

/**
 * Format conflict context for AI
 */
function formatConflictContext(
  context: ConflictResolutionContext,
  alternatives: AlternativeSession[]
): string {
  const conflictedSessions = context.currentSchedule.filter(item =>
    context.conflict.sessionIds.includes(item.item.id)
  );

  return `CONFLICT DETAILS:
Type: ${context.conflict.type}
Description: ${context.conflict.description}

CONFLICTED SESSIONS:
${conflictedSessions.map(s =>
  `- "${s.item.title}" (${s.time} - ${s.endTime}, ${s.item.location || 'No location'})
   Source: ${s.source}
   ${s.aiMetadata ? `AI Confidence: ${s.aiMetadata.confidence}%` : ''}
   ${s.item.description || ''}`
).join('\n')}

USER PROFILE:
- Interests: ${context.userProfile.interests?.join(', ') || 'Not specified'}
- Goals: ${context.userProfile.goals?.join(', ') || 'Not specified'}
- Role: ${context.userProfile.role || 'Not specified'}

AVAILABLE ALTERNATIVES:
${alternatives.slice(0, 5).map(alt =>
  `- "${alt.title}" (${alt.confidence}% match) - ${alt.reasoning}`
).join('\n')}

CURRENT SCHEDULE CONTEXT:
Total sessions: ${context.currentSchedule.filter(i => i.type === 'session').length}
User favorites included: ${context.currentSchedule.filter(i => i.source === 'user-favorite').length}
AI suggestions: ${context.currentSchedule.filter(i => i.source === 'ai-suggested').length}

Provide the best resolution strategy considering the user's profile and priorities.`;
}

/**
 * Parse AI resolution response
 */
function parseResolutionResponse(
  responseText: string,
  alternatives: AlternativeSession[]
): ConflictResolution {
  try {
    const parsed = JSON.parse(responseText);
    return {
      type: parsed.type || 'remove',
      action: parsed.action || 'Remove the conflicting session',
      reasoning: parsed.reasoning || 'Conflict needs to be resolved',
      confidence: parsed.confidence || 70,
      alternatives: parsed.alternatives || alternatives.slice(0, 3),
      impact: parsed.impact || {
        sessionsAffected: 1,
        walkingTimeChange: 0,
        contentQualityChange: 0
      }
    };
  } catch (error) {
    return generateFallbackResolution({ conflict: null } as any);
  }
}

/**
 * Generate fallback resolution without AI
 */
function generateFallbackResolution(
  context: ConflictResolutionContext
): ConflictResolution {
  const alternatives = context.currentSchedule
    .filter(item =>
      item.type === 'session' &&
      !context.conflict.sessionIds.includes(item.item.id)
    )
    .slice(0, 3)
    .map(item => ({
      id: item.item.id,
      title: item.item.title,
      confidence: 50,
      reasoning: 'Alternative session available'
    }));

  return {
    type: 'remove',
    action: 'Remove the lower priority session',
    reasoning: 'Resolving time conflict by removing AI-suggested session',
    confidence: 60,
    alternatives,
    impact: {
      sessionsAffected: 1,
      walkingTimeChange: 0,
      contentQualityChange: -20
    }
  };
}

/**
 * Apply a conflict resolution to the schedule
 */
export function applyResolution(
  schedule: ScheduleItem[],
  resolution: ConflictResolution,
  conflictSessionIds: string[]
): ScheduleItem[] {
  let newSchedule = [...schedule];

  switch (resolution.type) {
    case 'remove':
      // Remove the conflicted session(s)
      newSchedule = newSchedule.filter(item =>
        !conflictSessionIds.includes(item.item.id)
      );
      break;

    case 'swap':
      // Replace with alternative
      if (resolution.alternatives.length > 0) {
        const indexToReplace = newSchedule.findIndex(item =>
          conflictSessionIds.includes(item.item.id)
        );
        if (indexToReplace !== -1) {
          const alternative = resolution.alternatives[0];
          newSchedule[indexToReplace] = {
            ...newSchedule[indexToReplace],
            item: {
              ...newSchedule[indexToReplace].item,
              id: alternative.id,
              title: alternative.title
            },
            source: 'ai-suggested',
            aiMetadata: {
              confidence: alternative.confidence,
              reasoning: alternative.reasoning,
              matchScore: alternative.confidence,
              similarityToFavorites: 0,
              method: 'vector-similarity'
            }
          };
        }
      }
      break;

    case 'reschedule':
      // Move to different time slot (requires more complex logic)
      console.log('Rescheduling not yet implemented');
      break;

    case 'accept':
      // Keep the conflict as-is
      console.log('Accepting conflict as-is');
      break;
  }

  return newSchedule;
}