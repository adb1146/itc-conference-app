/**
 * AI Agenda Reviewer
 * Reviews generated agendas for quality and common sense issues
 * Acts as a "human-like" double-check before presenting to users
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import type { SmartAgenda, ScheduleItem } from './types';

// Review issue types and severity
export enum IssueSeverity {
  CRITICAL = 'critical',  // Must fix - breaks the schedule
  MAJOR = 'major',        // Should fix - significantly impacts experience
  MINOR = 'minor'         // Nice to fix - small improvements
}

export interface ReviewIssue {
  severity: IssueSeverity;
  type: string;
  description: string;
  dayNumber?: number;
  sessionId?: string;
  suggestedFix?: string;
}

export interface ReviewResult {
  reviewed: boolean;
  issuesFound: ReviewIssue[];
  issuesFixed: ReviewIssue[];
  confidence: number;
  notes: string[];
  reviewDuration: number;
}

export interface AgendaReviewContext {
  agenda: SmartAgenda;
  userProfile?: {
    interests: string[];
    role: string;
    experience?: number;
  };
}

/**
 * Main review function that checks the agenda for issues
 */
export async function reviewAgenda(
  context: AgendaReviewContext
): Promise<{ agenda: SmartAgenda; review: ReviewResult }> {
  const startTime = Date.now();
  const issues: ReviewIssue[] = [];
  const fixed: ReviewIssue[] = [];
  const notes: string[] = [];

  try {
    // 1. Check for timing issues
    const timingIssues = checkTimingIssues(context.agenda);
    issues.push(...timingIssues);

    // 2. Check for content balance
    const balanceIssues = checkContentBalance(context.agenda);
    issues.push(...balanceIssues);

    // 3. Check for logical flow
    const flowIssues = checkLogicalFlow(context.agenda);
    issues.push(...flowIssues);

    // 4. Check for missing essentials
    const essentialIssues = checkEssentials(context.agenda);
    issues.push(...essentialIssues);

    // 5. Apply automatic fixes for critical issues
    const fixedAgenda = await applyFixes(context.agenda, issues, fixed, notes);

    // 6. Calculate confidence score
    const confidence = calculateConfidence(issues, fixed);

    // 7. Use AI for deeper review if enabled
    let aiReviewNotes: string[] = [];
    if (process.env.ENABLE_AI_REVIEW === 'true') {
      aiReviewNotes = await performAIReview(fixedAgenda, context.userProfile);
      notes.push(...aiReviewNotes);
    }

    const reviewResult: ReviewResult = {
      reviewed: true,
      issuesFound: issues,
      issuesFixed: fixed,
      confidence,
      notes,
      reviewDuration: Date.now() - startTime
    };

    // Add review metadata to agenda
    const reviewedAgenda = {
      ...fixedAgenda,
      aiReview: reviewResult
    };

    return { agenda: reviewedAgenda, review: reviewResult };

  } catch (error) {
    console.error('[AI Reviewer] Review failed:', error);
    // Return original agenda if review fails
    return {
      agenda: context.agenda,
      review: {
        reviewed: false,
        issuesFound: [],
        issuesFixed: [],
        confidence: 0,
        notes: ['Review process failed - returning original agenda'],
        reviewDuration: Date.now() - startTime
      }
    };
  }
}

/**
 * Check for timing-related issues
 */
function checkTimingIssues(agenda: SmartAgenda): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  agenda.days.forEach(day => {
    let lastEndTime: Date | null = null;

    day.schedule.forEach((item, index) => {
      // Parse time strings (e.g., "9:00 AM" -> Date)
      const startTime = parseTimeString(item.time, day.date);
      const endTime = parseTimeString(item.endTime, day.date);

      // Check for too early sessions (before 7 AM)
      if (startTime.getHours() < 7) {
        issues.push({
          severity: IssueSeverity.CRITICAL,
          type: 'timing',
          description: `Session "${item.item.title}" starts too early at ${item.time}`,
          dayNumber: day.dayNumber,
          sessionId: item.id,
          suggestedFix: 'Remove or reschedule to after 7 AM'
        });
      }

      // Check for too late sessions (after 10 PM)
      if (endTime.getHours() >= 22) {
        issues.push({
          severity: IssueSeverity.MAJOR,
          type: 'timing',
          description: `Session "${item.item.title}" ends too late at ${item.endTime}`,
          dayNumber: day.dayNumber,
          sessionId: item.id,
          suggestedFix: 'Consider removing late sessions unless networking events'
        });
      }

      // Check for missing breaks (>3 hours without break)
      if (lastEndTime) {
        const gap = (startTime.getTime() - lastEndTime.getTime()) / (1000 * 60); // minutes
        if (gap < 0) {
          // Overlapping sessions (should be caught by conflict detection)
          issues.push({
            severity: IssueSeverity.CRITICAL,
            type: 'overlap',
            description: `Sessions overlap on Day ${day.dayNumber}`,
            dayNumber: day.dayNumber,
            sessionId: item.id,
            suggestedFix: 'Remove overlapping session'
          });
        } else if (gap > 180) { // 3+ hours gap
          issues.push({
            severity: IssueSeverity.MINOR,
            type: 'gap',
            description: `Large gap (${Math.round(gap)} minutes) before "${item.item.title}"`,
            dayNumber: day.dayNumber,
            sessionId: item.id,
            suggestedFix: 'Consider adding sessions or activities in this gap'
          });
        }
      }

      // Track for next iteration
      if (item.type === 'session') {
        lastEndTime = endTime;
      }
    });

    // Check for too many consecutive sessions without breaks
    const sessionCount = day.schedule.filter(s => s.type === 'session').length;
    if (sessionCount > 8) {
      const consecutiveWithoutBreak = countConsecutiveSessionsWithoutBreak(day.schedule);
      if (consecutiveWithoutBreak > 4) {
        issues.push({
          severity: IssueSeverity.MAJOR,
          type: 'overload',
          description: `Day ${day.dayNumber} has ${consecutiveWithoutBreak} consecutive sessions without proper breaks`,
          dayNumber: day.dayNumber,
          suggestedFix: 'Add coffee breaks or reduce session count'
        });
      }
    }
  });

  return issues;
}

/**
 * Check for content balance issues
 */
function checkContentBalance(agenda: SmartAgenda): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  // Track sessions by track/topic
  const trackCounts = new Map<string, number>();
  let totalSessions = 0;

  agenda.days.forEach(day => {
    const daySessions = day.schedule.filter(s => s.type === 'session');
    totalSessions += daySessions.length;

    // Check daily load
    if (daySessions.length > 10) {
      issues.push({
        severity: IssueSeverity.MAJOR,
        type: 'overload',
        description: `Day ${day.dayNumber} has too many sessions (${daySessions.length})`,
        dayNumber: day.dayNumber,
        suggestedFix: 'Reduce to 8-10 sessions per day for better experience'
      });
    } else if (daySessions.length < 4) {
      issues.push({
        severity: IssueSeverity.MINOR,
        type: 'underload',
        description: `Day ${day.dayNumber} has very few sessions (${daySessions.length})`,
        dayNumber: day.dayNumber,
        suggestedFix: 'Consider adding more relevant sessions'
      });
    }

    // Count tracks
    daySessions.forEach(session => {
      if (session.item.track) {
        trackCounts.set(
          session.item.track,
          (trackCounts.get(session.item.track) || 0) + 1
        );
      }
    });
  });

  // Check for track imbalance (too focused on one track)
  trackCounts.forEach((count, track) => {
    const percentage = (count / totalSessions) * 100;
    if (percentage > 60) {
      issues.push({
        severity: IssueSeverity.MINOR,
        type: 'track-imbalance',
        description: `Over ${Math.round(percentage)}% of sessions are from "${track}" track`,
        suggestedFix: 'Consider diversifying with sessions from other tracks'
      });
    }
  });

  // Check for day-to-day balance
  const sessionCounts = agenda.days.map(d => d.schedule.filter(s => s.type === 'session').length);
  const maxSessions = Math.max(...sessionCounts);
  const minSessions = Math.min(...sessionCounts);

  if (maxSessions - minSessions > 5) {
    issues.push({
      severity: IssueSeverity.MAJOR,
      type: 'day-imbalance',
      description: `Uneven distribution: ${maxSessions} vs ${minSessions} sessions across days`,
      suggestedFix: 'Redistribute sessions for more balanced days'
    });
  }

  return issues;
}

/**
 * Check for logical flow issues
 */
function checkLogicalFlow(agenda: SmartAgenda): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  agenda.days.forEach(day => {
    // Check for duplicate or very similar sessions
    const sessionTitles = new Set<string>();
    const similarSessions: string[] = [];

    day.schedule.forEach(item => {
      if (item.type === 'session') {
        const normalizedTitle = item.item.title.toLowerCase();

        // Check for exact duplicates
        if (sessionTitles.has(normalizedTitle)) {
          issues.push({
            severity: IssueSeverity.CRITICAL,
            type: 'duplicate',
            description: `Duplicate session "${item.item.title}" on Day ${day.dayNumber}`,
            dayNumber: day.dayNumber,
            sessionId: item.id,
            suggestedFix: 'Remove duplicate session'
          });
        }
        sessionTitles.add(normalizedTitle);

        // Check for similar sessions (simplified similarity check)
        sessionTitles.forEach(existing => {
          if (existing !== normalizedTitle && areSimilar(existing, normalizedTitle)) {
            similarSessions.push(item.item.title);
          }
        });
      }
    });

    if (similarSessions.length > 0) {
      issues.push({
        severity: IssueSeverity.MINOR,
        type: 'similar',
        description: `Similar sessions detected on Day ${day.dayNumber}`,
        dayNumber: day.dayNumber,
        suggestedFix: 'Consider replacing with more diverse content'
      });
    }

    // Check for meal time conflicts
    const lunchTime = day.schedule.find(s =>
      s.type === 'meal' || s.item.title?.toLowerCase().includes('lunch')
    );

    if (!lunchTime) {
      const middaySession = day.schedule.find(s => {
        const time = parseTimeString(s.time, day.date);
        return time.getHours() >= 12 && time.getHours() < 14;
      });

      if (middaySession && day.schedule.filter(s => s.type === 'session').length > 4) {
        issues.push({
          severity: IssueSeverity.MAJOR,
          type: 'missing-meal',
          description: `No lunch break on Day ${day.dayNumber}`,
          dayNumber: day.dayNumber,
          suggestedFix: 'Add lunch break around 12:00-1:00 PM'
        });
      }
    }
  });

  return issues;
}

/**
 * Check for missing essential elements
 */
function checkEssentials(agenda: SmartAgenda): ReviewIssue[] {
  const issues: ReviewIssue[] = [];

  // Check for keynotes
  const hasKeynote = agenda.days.some(day =>
    day.schedule.some(s =>
      s.item.title?.toLowerCase().includes('keynote') ||
      s.item.format?.toLowerCase().includes('keynote')
    )
  );

  if (!hasKeynote) {
    issues.push({
      severity: IssueSeverity.MINOR,
      type: 'missing-keynote',
      description: 'No keynote sessions in agenda',
      suggestedFix: 'Consider adding important keynote sessions'
    });
  }

  // Check for networking opportunities
  const networkingCount = agenda.days.reduce((sum, day) =>
    sum + day.schedule.filter(s =>
      s.item.title?.toLowerCase().includes('network') ||
      s.item.title?.toLowerCase().includes('reception') ||
      s.item.title?.toLowerCase().includes('mixer')
    ).length,
    0
  );

  if (networkingCount === 0) {
    issues.push({
      severity: IssueSeverity.MINOR,
      type: 'missing-networking',
      description: 'No networking events in agenda',
      suggestedFix: 'Add networking opportunities for better conference experience'
    });
  }

  // Check for welcome/closing sessions
  const firstDay = agenda.days[0];
  const lastDay = agenda.days[agenda.days.length - 1];

  if (firstDay && !firstDay.schedule.some(s =>
    s.item.title?.toLowerCase().includes('opening') ||
    s.item.title?.toLowerCase().includes('welcome')
  )) {
    issues.push({
      severity: IssueSeverity.MINOR,
      type: 'missing-opening',
      description: 'No opening/welcome session on first day',
      suggestedFix: 'Consider adding conference opening session'
    });
  }

  return issues;
}

/**
 * Apply automatic fixes for critical and major issues
 */
async function applyFixes(
  agenda: SmartAgenda,
  issues: ReviewIssue[],
  fixed: ReviewIssue[],
  notes: string[]
): Promise<SmartAgenda> {
  const fixedAgenda = JSON.parse(JSON.stringify(agenda)); // Deep clone

  // Fix critical issues first
  const criticalIssues = issues.filter(i => i.severity === IssueSeverity.CRITICAL);

  for (const issue of criticalIssues) {
    switch (issue.type) {
      case 'timing':
        // Remove too-early sessions
        if (issue.sessionId && issue.dayNumber) {
          const day = fixedAgenda.days.find(d => d.dayNumber === issue.dayNumber);
          if (day) {
            const index = day.schedule.findIndex(s => s.id === issue.sessionId);
            if (index !== -1) {
              day.schedule.splice(index, 1);
              fixed.push(issue);
              notes.push(`Removed early morning session: ${issue.description}`);
            }
          }
        }
        break;

      case 'duplicate':
        // Remove duplicate sessions
        if (issue.sessionId && issue.dayNumber) {
          const day = fixedAgenda.days.find(d => d.dayNumber === issue.dayNumber);
          if (day) {
            const index = day.schedule.findIndex(s => s.id === issue.sessionId);
            if (index !== -1) {
              day.schedule.splice(index, 1);
              fixed.push(issue);
              notes.push(`Removed duplicate session on Day ${issue.dayNumber}`);
            }
          }
        }
        break;

      case 'overlap':
        // Remove overlapping session (keep the favorite or higher scored one)
        if (issue.sessionId && issue.dayNumber) {
          const day = fixedAgenda.days.find(d => d.dayNumber === issue.dayNumber);
          if (day) {
            const index = day.schedule.findIndex(s => s.id === issue.sessionId);
            if (index !== -1) {
              // Only remove if it's not a user favorite
              const session = day.schedule[index];
              if (session.source !== 'user-favorite') {
                day.schedule.splice(index, 1);
                fixed.push(issue);
                notes.push(`Resolved scheduling conflict on Day ${issue.dayNumber}`);
              }
            }
          }
        }
        break;
    }
  }

  // Fix some major issues
  const majorIssues = issues.filter(i => i.severity === IssueSeverity.MAJOR);

  for (const issue of majorIssues) {
    if (issue.type === 'missing-meal' && issue.dayNumber) {
      // Add a lunch break
      const day = fixedAgenda.days.find(d => d.dayNumber === issue.dayNumber);
      if (day) {
        // Find a good spot around noon
        const lunchSlot = {
          id: `meal-lunch-day${issue.dayNumber}`,
          type: 'meal' as const,
          time: '12:00 PM',
          endTime: '1:00 PM',
          title: 'Lunch Break',
          item: {
            id: `lunch-${issue.dayNumber}`,
            title: 'Lunch Break',
            description: 'Networking lunch',
            location: 'Exhibition Hall'
          },
          priority: 'medium' as const,
          source: 'ai-suggested' as const,
          matchScore: 50,
          matchReasons: ['Essential break']
        };

        // Insert at appropriate position
        const insertIndex = day.schedule.findIndex(s => {
          const time = parseTimeString(s.time, day.date);
          return time.getHours() >= 13;
        });

        if (insertIndex !== -1) {
          day.schedule.splice(insertIndex, 0, lunchSlot);
          fixed.push(issue);
          notes.push(`Added lunch break on Day ${issue.dayNumber}`);
        }
      }
    }
  }

  // Update stats after fixes
  fixedAgenda.days.forEach(day => {
    const sessions = day.schedule.filter(s => s.type === 'session');
    const favorites = sessions.filter(s => s.source === 'user-favorite');
    const aiSuggested = sessions.filter(s => s.source === 'ai-suggested');

    day.stats = {
      ...day.stats,
      totalSessions: sessions.length,
      favoritesCovered: favorites.length,
      aiSuggestions: aiSuggested.length
    };
  });

  return fixedAgenda;
}

/**
 * Perform AI-powered review for deeper insights
 */
async function performAIReview(
  agenda: SmartAgenda,
  userProfile?: any
): Promise<string[]> {
  const notes: string[] = [];

  try {
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY || ''
    });

    // Prepare agenda summary for AI review
    const agendaSummary = agenda.days.map(day => ({
      day: day.dayNumber,
      sessions: day.schedule.map(s => ({
        time: s.time,
        title: s.item.title,
        type: s.type,
        track: s.item.track
      }))
    }));

    const prompt = `Review this conference agenda for common sense issues:

AGENDA:
${JSON.stringify(agendaSummary, null, 2)}

USER PROFILE:
- Interests: ${userProfile?.interests?.join(', ') || 'Not specified'}
- Role: ${userProfile?.role || 'Not specified'}

Please check for:
1. Unrealistic scheduling (too many sessions, missing breaks)
2. Poor session variety (too focused on one topic)
3. Missing important elements (keynotes, networking)
4. Sessions that don't match user's interests/role
5. Any other issues that would impact the conference experience

Return a JSON object with:
{
  "issues": [{"type": "string", "description": "string", "severity": "critical|major|minor"}],
  "suggestions": ["string"],
  "overallQuality": "excellent|good|fair|poor",
  "confidence": 0-100
}`;

    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Use fast model for review
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    // Parse AI response
    const content = response.content[0];
    if (content.type === 'text') {
      try {
        const reviewData = JSON.parse(content.text);

        // Add AI suggestions to notes
        if (reviewData.suggestions) {
          notes.push(...reviewData.suggestions.map((s: string) => `AI Suggestion: ${s}`));
        }

        // Log overall quality
        if (reviewData.overallQuality) {
          notes.push(`AI Assessment: Agenda quality is ${reviewData.overallQuality}`);
        }

      } catch (parseError) {
        console.error('[AI Reviewer] Failed to parse AI response:', parseError);
      }
    }

  } catch (error) {
    console.error('[AI Reviewer] AI review failed:', error);
    // Continue without AI review
  }

  return notes;
}

/**
 * Calculate confidence score based on issues found and fixed
 */
function calculateConfidence(issues: ReviewIssue[], fixed: ReviewIssue[]): number {
  let confidence = 100;

  // Deduct points for unfixed issues
  const unfixedIssues = issues.filter(i => !fixed.includes(i));

  unfixedIssues.forEach(issue => {
    switch (issue.severity) {
      case IssueSeverity.CRITICAL:
        confidence -= 15;
        break;
      case IssueSeverity.MAJOR:
        confidence -= 8;
        break;
      case IssueSeverity.MINOR:
        confidence -= 3;
        break;
    }
  });

  // Bonus for fixing issues
  confidence += Math.min(fixed.length * 2, 10);

  // Ensure confidence stays within bounds
  return Math.max(0, Math.min(100, confidence));
}

/**
 * Helper function to parse time strings
 */
function parseTimeString(timeStr: string, dateStr: string): Date {
  const date = new Date(dateStr + 'T00:00:00');
  const [time, period] = timeStr.split(' ');
  const [hours, minutes] = time.split(':').map(Number);

  let hour = hours;
  if (period === 'PM' && hours !== 12) hour += 12;
  if (period === 'AM' && hours === 12) hour = 0;

  date.setHours(hour, minutes || 0, 0, 0);
  return date;
}

/**
 * Helper function to check if two strings are similar
 */
function areSimilar(str1: string, str2: string): boolean {
  // Simple similarity check - can be enhanced with better algorithms
  const words1 = new Set(str1.split(' ').filter(w => w.length > 3));
  const words2 = new Set(str2.split(' ').filter(w => w.length > 3));

  let commonWords = 0;
  words1.forEach(word => {
    if (words2.has(word)) commonWords++;
  });

  const similarity = commonWords / Math.max(words1.size, words2.size);
  return similarity > 0.6; // 60% word overlap
}

/**
 * Count consecutive sessions without breaks
 */
function countConsecutiveSessionsWithoutBreak(schedule: ScheduleItem[]): number {
  let maxConsecutive = 0;
  let currentConsecutive = 0;

  schedule.forEach(item => {
    if (item.type === 'session') {
      currentConsecutive++;
      maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
    } else if (item.type === 'meal' || item.type === 'break') {
      currentConsecutive = 0;
    }
  });

  return maxConsecutive;
}