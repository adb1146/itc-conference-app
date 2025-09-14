import { SmartAgenda, ScheduleItem, AgendaOptions } from './types';
import prisma from '@/lib/db';

/**
 * Fast agenda builder that creates a personalized schedule without expensive AI calls
 */
export async function generateFastAgenda(
  userId: string,
  options: Partial<AgendaOptions> = {}
): Promise<{ success: boolean; agenda?: SmartAgenda; error?: string }> {
  try {
    // Fetch user with favorites
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: {
          include: {
            session: {
              include: {
                speakers: {
                  include: {
                    speaker: true
                  }
                }
              }
            },
            speaker: true
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // Fetch all sessions
    const allSessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    // Group sessions by day
    const sessionsByDay = new Map<string, any[]>();
    allSessions.forEach(session => {
      const day = new Date(session.startTime).toDateString();
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, []);
      }
      sessionsByDay.get(day)!.push(session);
    });

    // Get favorited sessions
    const favoritedSessionIds = new Set(
      user.favorites
        .filter(f => f.type === 'session' && f.sessionId)
        .map(f => f.sessionId)
    );

    // Build agenda for each day
    const days = [];
    let dayNumber = 1;

    for (const [dateString, daySessions] of sessionsByDay) {
      const schedule: ScheduleItem[] = [];
      const usedTimeSlots = new Set<string>();

      // First, add all favorited sessions
      for (const session of daySessions) {
        if (favoritedSessionIds.has(session.id)) {
          const timeSlot = `${session.startTime}-${session.endTime}`;
          if (!usedTimeSlots.has(timeSlot)) {
            schedule.push({
              id: `session-${session.id}`,
              type: 'session',
              title: session.title,
              description: session.description || '',
              startTime: session.startTime,
              endTime: session.endTime,
              location: session.location || '',
              speakers: session.speakers.map((s: any) => ({
                id: s.speaker.id,
                name: s.speaker.name,
                title: s.speaker.title
              })),
              track: session.track || '',
              source: 'user-favorite',
              confidence: 100,
              item: session
            });
            usedTimeSlots.add(timeSlot);
          }
        }
      }

      // Then, add high-priority sessions based on user interests
      if (user.interests && user.interests.length > 0) {
        const interestKeywords = user.interests.map(i => i.toLowerCase());

        for (const session of daySessions) {
          if (schedule.length >= 8) break; // Max 8 sessions per day

          const timeSlot = `${session.startTime}-${session.endTime}`;
          if (usedTimeSlots.has(timeSlot)) continue;

          // Score session based on interests
          const sessionText = `${session.title} ${session.description} ${session.track}`.toLowerCase();
          let matchScore = 0;

          for (const keyword of interestKeywords) {
            if (sessionText.includes(keyword)) {
              matchScore++;
            }
          }

          // Add session if it matches interests
          if (matchScore > 0) {
            schedule.push({
              id: `session-${session.id}`,
              type: 'session',
              title: session.title,
              description: session.description || '',
              startTime: session.startTime,
              endTime: session.endTime,
              location: session.location || '',
              speakers: session.speakers.map((s: any) => ({
                id: s.speaker.id,
                name: s.speaker.name,
                title: s.speaker.title
              })),
              track: session.track || '',
              source: 'ai-suggested',
              confidence: Math.min(matchScore * 30, 90),
              aiMetadata: {
                score: matchScore,
                reasoning: `Matches your interests: ${interestKeywords.filter(k => sessionText.includes(k)).join(', ')}`
              },
              item: session
            });
            usedTimeSlots.add(timeSlot);
          }
        }
      }

      // Add meal breaks
      const lunchTime = new Date(dateString);
      lunchTime.setHours(12, 0, 0, 0);
      const lunchEndTime = new Date(lunchTime);
      lunchEndTime.setHours(13, 0, 0, 0);

      schedule.push({
        id: `meal-lunch-${dayNumber}`,
        type: 'meal',
        title: 'Lunch Break',
        description: 'Network and refuel',
        startTime: lunchTime,
        endTime: lunchEndTime,
        location: 'Expo Hall',
        source: 'system',
        confidence: 100
      });

      // Sort schedule by time
      schedule.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      days.push({
        date: dateString,
        dayNumber,
        schedule,
        stats: {
          totalSessions: schedule.filter(i => i.type === 'session').length,
          favoritesIncluded: schedule.filter(i => i.source === 'user-favorite').length,
          aiSuggestions: schedule.filter(i => i.source === 'ai-suggested').length,
          breaks: schedule.filter(i => i.type === 'meal' || i.type === 'break').length
        }
      });

      dayNumber++;
      if (dayNumber > 3) break; // Max 3 days
    }

    // Calculate metrics
    const totalFavorites = favoritedSessionIds.size;
    const favoritesIncluded = days.reduce((sum, day) =>
      sum + day.schedule.filter(item => item.source === 'user-favorite').length, 0
    );
    const aiSuggestionsAdded = days.reduce((sum, day) =>
      sum + day.schedule.filter(item => item.source === 'ai-suggested').length, 0
    );

    // Generate suggestions
    const suggestions = [];
    if (favoritesIncluded < totalFavorites) {
      suggestions.push(`${totalFavorites - favoritesIncluded} favorites had scheduling conflicts`);
    }
    if (aiSuggestionsAdded > 0) {
      suggestions.push(`Added ${aiSuggestionsAdded} sessions based on your interests`);
    }
    if (!user.interests || user.interests.length === 0) {
      suggestions.push('Add interests to your profile for personalized recommendations');
    }

    const agenda: SmartAgenda = {
      userId,
      generatedAt: new Date(),
      days,
      metrics: {
        totalFavorites,
        favoritesIncluded,
        aiSuggestionsAdded,
        conflictsResolved: 0,
        overallConfidence: 85,
        profileCompleteness: calculateProfileCompleteness(user)
      },
      conflicts: [],
      suggestions,
      warnings: [],
      usingAI: false
    };

    return {
      success: true,
      agenda
    };

  } catch (error) {
    console.error('Error generating fast agenda:', error);
    return {
      success: false,
      error: 'Failed to generate agenda'
    };
  }
}

function calculateProfileCompleteness(user: any): number {
  let score = 0;
  const weights = {
    interests: 30,
    goals: 20,
    role: 20,
    organizationType: 15,
    bio: 15
  };

  if (user.interests && user.interests.length > 0) score += weights.interests;
  if (user.goals && user.goals.length > 0) score += weights.goals;
  if (user.role) score += weights.role;
  if (user.organizationType) score += weights.organizationType;
  if (user.bio) score += weights.bio;

  return score;
}