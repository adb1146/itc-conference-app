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

    // Define conference dates
    const conferenceDates = [
      '2025-10-14', // Tuesday
      '2025-10-15', // Wednesday
      '2025-10-16'  // Thursday
    ];

    // Group sessions by day
    const sessionsByDay = new Map<string, any[]>();

    // Initialize map with conference dates in order
    conferenceDates.forEach(date => {
      sessionsByDay.set(date, []);
    });

    // Add sessions to their respective days
    allSessions.forEach(session => {
      const dateStr = new Date(session.startTime).toISOString().split('T')[0];
      if (sessionsByDay.has(dateStr)) {
        sessionsByDay.get(dateStr)!.push(session);
      }
    });

    // Get favorited sessions
    const favoritedSessionIds = new Set(
      user.favorites
        .filter(f => f.type === 'session' && f.sessionId)
        .map(f => f.sessionId)
    );

    // Build agenda for each day
    const days = [];

    // Map specific dates to day numbers
    const dayNumberMap: Record<string, number> = {
      '2025-10-14': 1,  // Tuesday
      '2025-10-15': 2,  // Wednesday
      '2025-10-16': 3   // Thursday
    };

    for (const [dateString, daySessions] of sessionsByDay) {
      const dayNumber = dayNumberMap[dateString];
      if (!dayNumber) continue;  // Skip non-conference dates
      const schedule: ScheduleItem[] = [];
      const usedTimeSlots = new Set<string>();

      // First, add all favorited sessions
      for (const session of daySessions) {
        if (favoritedSessionIds.has(session.id)) {
          const timeSlot = `${session.startTime}-${session.endTime}`;
          if (!usedTimeSlots.has(timeSlot)) {
            schedule.push({
              id: `session-${session.id}`,
              time: new Date(session.startTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }),
              endTime: new Date(session.endTime).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              }),
              type: 'session',
              source: 'user-favorite',
              item: {
                id: session.id,
                title: session.title,
                description: session.description || '',
                location: session.location || '',
                speakers: session.speakers.map((s: any) => ({
                  id: s.speaker.id,
                  name: s.speaker.name,
                  title: s.speaker.title
                })),
                track: session.track || ''
              }
            });
            usedTimeSlots.add(timeSlot);
          }
        }
      }

      // Then, add high-priority sessions based on user profile
      // Build profile keywords from all available fields
      const profileKeywords: string[] = [];

      // Add interests
      if (user.interests && user.interests.length > 0) {
        profileKeywords.push(...user.interests.map(i => i.toLowerCase()));
      }

      // Add role-based keywords
      if (user.role) {
        const roleKeywords = user.role.toLowerCase();
        profileKeywords.push(roleKeywords);
        // Add related keywords based on role
        if (roleKeywords.includes('executive')) {
          profileKeywords.push('leadership', 'strategy', 'transformation');
        }
        if (roleKeywords.includes('product')) {
          profileKeywords.push('product', 'innovation', 'roadmap');
        }
        if (roleKeywords.includes('developer') || roleKeywords.includes('engineer')) {
          profileKeywords.push('technical', 'api', 'integration', 'architecture');
        }
        if (roleKeywords.includes('sales') || roleKeywords.includes('bd')) {
          profileKeywords.push('distribution', 'partnerships', 'growth');
        }
      }

      // Add organization type keywords
      if (user.organizationType) {
        const orgType = user.organizationType.toLowerCase();
        profileKeywords.push(orgType);
        if (orgType.includes('carrier')) {
          profileKeywords.push('carrier', 'underwriting', 'claims');
        }
        if (orgType.includes('broker') || orgType.includes('mga')) {
          profileKeywords.push('distribution', 'broker', 'agency');
        }
        if (orgType.includes('vendor') || orgType.includes('technology')) {
          profileKeywords.push('insurtech', 'technology', 'platform');
        }
      }

      // Add goals if available
      if (user.goals && Array.isArray(user.goals)) {
        profileKeywords.push(...user.goals.map((g: string) => g.toLowerCase()));
      }

      // Log profile keywords for debugging
      console.log('[Smart Agenda] Building agenda with profile keywords:', {
        interests: user.interests,
        role: user.role,
        organizationType: user.organizationType,
        goals: user.goals,
        totalKeywords: profileKeywords.length,
        keywords: profileKeywords
      });

      if (profileKeywords.length > 0) {
        // Create a session scoring system
        const scoredSessions = daySessions
          .filter(session => {
            const timeSlot = `${session.startTime}-${session.endTime}`;
            return !usedTimeSlots.has(timeSlot) && !favoritedSessionIds.has(session.id);
          })
          .map(session => {
            const sessionText = `${session.title} ${session.description} ${session.track} ${session.tags?.join(' ') || ''}`.toLowerCase();
            let matchScore = 0;
            const matchedKeywords: string[] = [];

            for (const keyword of profileKeywords) {
              if (sessionText.includes(keyword)) {
                matchScore++;
                matchedKeywords.push(keyword);
              }
            }

            return { session, matchScore, matchedKeywords };
          })
          .filter(item => item.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore);

        // Add top matching sessions
        for (const { session, matchScore, matchedKeywords } of scoredSessions) {
          if (schedule.length >= 8) break; // Max 8 sessions per day

          const timeSlot = `${session.startTime}-${session.endTime}`;
          if (usedTimeSlots.has(timeSlot)) continue;

          schedule.push({
            id: `session-${session.id}`,
            time: new Date(session.startTime).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
              hour12: true
            }),
            endTime: new Date(session.endTime).toLocaleTimeString('en-US', {
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
              speakers: session.speakers.map((s: any) => ({
                id: s.speaker.id,
                name: s.speaker.name,
                title: s.speaker.title
              })),
              track: session.track || ''
            },
            aiMetadata: {
              score: matchScore,
              reasoning: `Matches your profile: ${matchedKeywords.slice(0, 5).join(', ')}${matchedKeywords.length > 5 ? '...' : ''}`,
              confidence: Math.min(matchScore * 20, 95)
            }
          });
          usedTimeSlots.add(timeSlot);
        }
      }

      // Add meal breaks
      const lunchTime = new Date(dateString + 'T12:00:00');
      const lunchEndTime = new Date(dateString + 'T13:00:00');

      schedule.push({
        id: `meal-lunch-${dayNumber}`,
        time: lunchTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        endTime: lunchEndTime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        type: 'meal',
        source: 'system',
        item: {
          id: `meal-lunch-${dayNumber}`,
          title: 'Lunch Break',
          description: 'Network and refuel',
          location: 'Expo Hall'
        }
      });

      // Sort schedule by time - convert time strings back to Date for sorting
      schedule.sort((a, b) => {
        const timeA = new Date(`${dateString} ${a.time}`).getTime();
        const timeB = new Date(`${dateString} ${b.time}`).getTime();
        return timeA - timeB;
      });

      days.push({
        date: dateString, // This will now be in YYYY-MM-DD format
        dayNumber,
        schedule,
        stats: {
          totalSessions: schedule.filter(i => i.type === 'session').length,
          favoritesCovered: schedule.filter(i => i.source === 'user-favorite').length,
          aiSuggestions: schedule.filter(i => i.source === 'ai-suggested').length,
          walkingMinutes: 0,
          breakMinutes: 0,
          mealsCovered: schedule.some(i => i.type === 'meal')
        }
      });
    }

    // Sort days by dayNumber to ensure correct order
    days.sort((a, b) => a.dayNumber - b.dayNumber);

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