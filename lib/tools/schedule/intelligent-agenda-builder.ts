/**
 * Intelligent Agenda Builder
 * Uses vector search and smart scoring to create highly personalized conference schedules
 * with clear explanations for each selection
 */

import { SmartAgenda, ScheduleItem, AgendaOptions } from './types';
import prisma from '@/lib/db';
import { hybridSearch } from '@/lib/vector-db';

interface SessionScore {
  sessionId: string;
  score: number;
  reasons: string[];
  matchFactors: {
    interests: number;
    role: number;
    organizationType: number;
    popularity: number;
    speakers: number;
    networking: number;
    semantic: number;
  };
}

interface AgendaInsights {
  primaryFocus: string[];
  keyReasons: string[];
  optimizationStrategy: string;
  personalizedFor: {
    role: string;
    company: string;
    interests: string[];
  };
  stats: {
    totalSessionsAnalyzed: number;
    matchingInterests: number;
    networkingOpportunities: number;
    expertSpeakers: number;
  };
}

/**
 * Calculate a comprehensive score for a session based on user profile
 */
async function scoreSession(
  session: any,
  userProfile: any,
  semanticScores: Map<string, number>
): Promise<SessionScore> {
  const score: SessionScore = {
    sessionId: session.id,
    score: 0,
    reasons: [],
    matchFactors: {
      interests: 0,
      role: 0,
      organizationType: 0,
      popularity: 0,
      speakers: 0,
      networking: 0,
      semantic: 0
    }
  };

  // 1. Interest matching (40% weight)
  const userInterests = userProfile.interests || [];
  const sessionText = `${session.title} ${session.description}`.toLowerCase();
  let interestMatches = 0;

  userInterests.forEach((interest: string) => {
    const interestKeywords = getInterestKeywords(interest);
    const matchCount = interestKeywords.filter(keyword =>
      sessionText.includes(keyword.toLowerCase())
    ).length;

    if (matchCount > 0) {
      interestMatches++;
      score.reasons.push(`Matches your interest in ${interest}`);
    }
  });

  score.matchFactors.interests = (interestMatches / Math.max(userInterests.length, 1)) * 40;

  // 2. Role relevance (20% weight)
  const roleKeywords = getRoleKeywords(userProfile.role);
  const roleMatches = roleKeywords.filter(keyword =>
    sessionText.includes(keyword.toLowerCase())
  ).length;

  if (roleMatches > 0) {
    score.matchFactors.role = Math.min(roleMatches * 5, 20);
    score.reasons.push(`Relevant for ${userProfile.role} professionals`);
  }

  // 3. Organization type relevance (10% weight)
  if (userProfile.organizationType) {
    const orgKeywords = getOrgTypeKeywords(userProfile.organizationType);
    const orgMatches = orgKeywords.filter(keyword =>
      sessionText.includes(keyword.toLowerCase())
    ).length;

    if (orgMatches > 0) {
      score.matchFactors.organizationType = 10;
      score.reasons.push(`Tailored for ${userProfile.organizationType} organizations`);
    }
  }

  // 4. Session popularity (10% weight)
  // In real implementation, this would use actual attendance/rating data
  const popularTracks = ['AI & Automation', 'Digital Transformation', 'Customer Experience'];
  if (popularTracks.some(track => session.track === track)) {
    score.matchFactors.popularity = 10;
    score.reasons.push('High-demand session');
  }

  // 5. Speaker expertise (10% weight)
  if (session.speakers?.length > 0) {
    const hasCLevel = session.speakers.some((s: any) =>
      s.speaker.title?.match(/CEO|CTO|CFO|Chief|President|Founder/i)
    );

    if (hasCLevel) {
      score.matchFactors.speakers = 10;
      score.reasons.push('Features industry leaders');
    }
  }

  // 6. Networking opportunities and social events (15% weight for dedicated networking)
  const networkingKeywords = ['networking', 'roundtable', 'panel', 'discussion', 'workshop'];
  const socialEventKeywords = ['reception', 'party', 'happy hour', 'mixer', 'meetup', 'social'];
  const isNetworkingEvent = session.title.toLowerCase().includes('networking') ||
                            session.title.toLowerCase().includes('reception');
  const isSocialEvent = socialEventKeywords.some(keyword =>
    session.title.toLowerCase().includes(keyword));

  if (isNetworkingEvent || isSocialEvent) {
    // High priority for dedicated networking/social events
    score.matchFactors.networking = 15;
    score.reasons.push('🤝 Essential networking opportunity');
  } else if (networkingKeywords.some(keyword => sessionText.includes(keyword))) {
    score.matchFactors.networking = 5;
    score.reasons.push('Great networking opportunity');
  }

  // 7. Semantic similarity (5% weight)
  const semanticScore = semanticScores.get(session.id) || 0;
  if (semanticScore > 0.7) {
    score.matchFactors.semantic = 5;
    score.reasons.push('Highly relevant to your profile');
  }

  // Calculate total score
  score.score = Object.values(score.matchFactors).reduce((sum, val) => sum + val, 0);

  // Add bonus for favorites
  if (userProfile.favoriteIds?.includes(session.id)) {
    score.score += 50; // Heavy bonus for favorited sessions
    score.reasons.unshift('⭐ Your saved favorite');
  }

  return score;
}

/**
 * Get keywords associated with an interest area
 */
function getInterestKeywords(interest: string): string[] {
  const keywordMap: Record<string, string[]> = {
    'AI & Automation': ['ai', 'artificial intelligence', 'machine learning', 'automation', 'predictive', 'neural', 'deep learning', 'chatbot', 'nlp'],
    'Claims Technology': ['claims', 'adjustment', 'settlement', 'fraud detection', 'subrogation', 'loss', 'claimant'],
    'Cybersecurity': ['cyber', 'security', 'breach', 'ransomware', 'encryption', 'threat', 'vulnerability', 'compliance'],
    'Embedded Insurance': ['embedded', 'api', 'integration', 'white label', 'partnership', 'distribution', 'ecosystem'],
    'Digital Distribution': ['digital', 'online', 'mobile', 'platform', 'marketplace', 'e-commerce', 'direct-to-consumer'],
    'Customer Experience': ['customer', 'experience', 'cx', 'engagement', 'satisfaction', 'journey', 'personalization', 'omnichannel'],
    'Underwriting': ['underwriting', 'risk assessment', 'pricing', 'actuarial', 'rating', 'risk selection', 'portfolio'],
    'Data Analytics': ['data', 'analytics', 'insights', 'bi', 'visualization', 'metrics', 'kpi', 'reporting']
  };

  return keywordMap[interest] || [interest.toLowerCase()];
}

/**
 * Get keywords associated with a role
 */
function getRoleKeywords(role: string): string[] {
  const roleMap: Record<string, string[]> = {
    'Executive': ['strategy', 'leadership', 'transformation', 'growth', 'innovation', 'roi', 'governance'],
    'Product Manager': ['product', 'roadmap', 'feature', 'user story', 'mvp', 'launch', 'iteration'],
    'Developer': ['api', 'code', 'implementation', 'architecture', 'development', 'technical', 'integration'],
    'Data Scientist': ['model', 'algorithm', 'prediction', 'statistics', 'machine learning', 'analysis'],
    'Underwriter': ['risk', 'pricing', 'assessment', 'portfolio', 'loss ratio', 'exposure'],
    'Claims Manager': ['claims', 'processing', 'efficiency', 'customer service', 'fraud', 'settlement'],
    'Sales/BD': ['sales', 'business development', 'partnership', 'growth', 'revenue', 'market'],
    'Startup Founder': ['startup', 'innovation', 'funding', 'scaling', 'disruption', 'venture'],
    'Investor': ['investment', 'roi', 'portfolio', 'valuation', 'market opportunity', 'due diligence'],
    'Consultant': ['strategy', 'implementation', 'best practices', 'transformation', 'advisory']
  };

  return roleMap[role] || [];
}

/**
 * Get keywords associated with organization types
 */
function getOrgTypeKeywords(orgType: string): string[] {
  const orgMap: Record<string, string[]> = {
    'Carrier': ['carrier', 'insurer', 'underwriting', 'claims', 'policy', 'premium'],
    'Broker': ['broker', 'distribution', 'client', 'commission', 'placement', 'advisory'],
    'MGA/MGU': ['mga', 'mgu', 'program', 'capacity', 'binding authority'],
    'Reinsurer': ['reinsurance', 'treaty', 'facultative', 'retrocession', 'catastrophe'],
    'Technology Vendor': ['platform', 'software', 'saas', 'solution', 'integration', 'api'],
    'Consulting Firm': ['consulting', 'advisory', 'strategy', 'implementation', 'transformation'],
    'Startup': ['innovation', 'disruption', 'agile', 'mvp', 'scaling', 'venture'],
    'Investor/VC': ['investment', 'portfolio', 'funding', 'valuation', 'exit strategy']
  };

  return orgMap[orgType] || [];
}

/**
 * Generate insights explaining the agenda selections
 */
function generateInsights(
  selectedSessions: Array<{ session: any; score: SessionScore }>,
  userProfile: any,
  allSessionsCount: number
): AgendaInsights {
  // Analyze the selected sessions
  const allReasons = selectedSessions.flatMap(s => s.score.reasons);
  const interestMatches = selectedSessions.filter(s => s.score.matchFactors.interests > 0).length;
  const networkingSessions = selectedSessions.filter(s => s.score.matchFactors.networking > 0).length;
  const leaderSessions = selectedSessions.filter(s => s.score.matchFactors.speakers > 0).length;

  // Determine primary focus areas
  const primaryFocus: string[] = [];
  const interestCounts = new Map<string, number>();

  userProfile.interests?.forEach((interest: string) => {
    const count = selectedSessions.filter(s =>
      s.score.reasons.some(r => r.includes(interest))
    ).length;
    if (count > 0) {
      interestCounts.set(interest, count);
    }
  });

  // Sort interests by session count
  const sortedInterests = Array.from(interestCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([interest]) => interest);

  primaryFocus.push(...sortedInterests);

  // Generate key reasons
  const keyReasons: string[] = [];

  if (interestMatches > selectedSessions.length * 0.7) {
    keyReasons.push(`Strong alignment with your interests in ${sortedInterests.join(' and ')}`);
  }

  if (networkingSessions > 3) {
    keyReasons.push('Maximized networking opportunities throughout the conference');
  }

  if (leaderSessions > 5) {
    keyReasons.push('Access to insights from top industry leaders and executives');
  }

  // Determine optimization strategy
  let strategy = 'Balanced approach covering ';
  if (primaryFocus.length > 0) {
    strategy += primaryFocus.join(', ');
  } else {
    strategy += 'diverse topics relevant to your role';
  }

  if (userProfile.organizationType) {
    strategy += ` with focus on ${userProfile.organizationType} perspectives`;
  }

  return {
    primaryFocus,
    keyReasons,
    optimizationStrategy: strategy,
    personalizedFor: {
      role: userProfile.role || 'Conference Attendee',
      company: userProfile.company || 'Your Organization',
      interests: userProfile.interests || []
    },
    stats: {
      totalSessionsAnalyzed: allSessionsCount,
      matchingInterests: interestMatches,
      networkingOpportunities: networkingSessions,
      expertSpeakers: leaderSessions
    }
  };
}

/**
 * Main function to generate intelligent agenda with insights
 */
export async function generateIntelligentAgenda(
  userId: string,
  options: Partial<AgendaOptions> = {}
): Promise<{
  success: boolean;
  agenda?: SmartAgenda & { insights?: AgendaInsights };
  error?: string
}> {
  try {
    console.log('[Intelligent Agenda] Starting generation for user:', userId);

    // 1. Fetch user profile with all relevant data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        favorites: {
          include: {
            session: {
              include: {
                speakers: {
                  include: { speaker: true }
                }
              }
            }
          }
        }
      }
    });

    if (!user) {
      return { success: false, error: 'User not found' };
    }

    // 2. Build user profile for scoring
    const userProfile = {
      interests: user.interests || user.profile?.interests || [],
      role: user.role || user.profile?.role,
      organizationType: user.organizationType || user.profile?.organizationType,
      company: user.company || user.profile?.company,
      favoriteIds: user.favorites
        .filter(f => f.type === 'session' && f.sessionId)
        .map(f => f.sessionId)
    };

    console.log('[Intelligent Agenda] User profile:', userProfile);

    // 3. Create search query from profile
    const searchQuery = [
      ...userProfile.interests,
      userProfile.role,
      userProfile.organizationType
    ].filter(Boolean).join(' ');

    // 4. Use vector search to find relevant sessions
    let semanticScores = new Map<string, number>();

    if (searchQuery) {
      try {
        const vectorResults = await hybridSearch(
          searchQuery,
          userProfile.interests,
          [],
          100 // Get top 100 relevant sessions
        );

        // Map semantic scores
        vectorResults.forEach(result => {
          if (result.type === 'session' && result.sessionId) {
            semanticScores.set(result.sessionId, result.score || 0);
          }
        });

        console.log('[Intelligent Agenda] Found', semanticScores.size, 'semantically relevant sessions');
      } catch (error) {
        console.error('[Intelligent Agenda] Vector search failed, continuing without semantic scores:', error);
      }
    }

    // 5. Fetch all sessions
    const allSessions = await prisma.session.findMany({
      include: {
        speakers: {
          include: { speaker: true }
        }
      },
      orderBy: { startTime: 'asc' }
    });

    // Filter out breaks, meals, and networking events for accurate counting
    const actualSessions = allSessions.filter(session => {
      const title = session.title.toLowerCase();
      return !title.includes('break') &&
             !title.includes('lunch') &&
             !title.includes('breakfast') &&
             !title.includes('registration') &&
             !title.includes('networking') &&
             !title.includes('reception') &&
             !title.includes('party');
    });

    console.log('[Intelligent Agenda] Total items in schedule:', allSessions.length);
    console.log('[Intelligent Agenda] Actual conference sessions:', actualSessions.length);

    // 6. Score all sessions
    const sessionScores = new Map<string, SessionScore>();
    for (const session of allSessions) {
      const score = await scoreSession(session, userProfile, semanticScores);
      sessionScores.set(session.id, score);
    }

    // 7. Group sessions by day and time
    const sessionsByDayTime = new Map<string, Map<string, any[]>>();
    const conferenceDates = ['2025-10-14', '2025-10-15', '2025-10-16'];

    conferenceDates.forEach(date => {
      sessionsByDayTime.set(date, new Map());
    });

    allSessions.forEach(session => {
      const dateStr = new Date(session.startTime).toISOString().split('T')[0];
      const timeStr = new Date(session.startTime).toTimeString().slice(0, 5);

      if (sessionsByDayTime.has(dateStr)) {
        const dayMap = sessionsByDayTime.get(dateStr)!;
        if (!dayMap.has(timeStr)) {
          dayMap.set(timeStr, []);
        }
        dayMap.get(timeStr)!.push(session);
      }
    });

    // 8. Build optimal schedule for each day
    const days = [];
    const selectedSessions: Array<{ session: any; score: SessionScore }> = [];
    const dayNumberMap: Record<string, number> = {
      '2025-10-14': 1,
      '2025-10-15': 2,
      '2025-10-16': 3
    };

    for (const [dateString, timeSlotsMap] of sessionsByDayTime) {
      const dayNumber = dayNumberMap[dateString];
      if (!dayNumber) continue;

      const schedule: ScheduleItem[] = [];
      const usedTimeSlots = new Set<string>();

      // Sort time slots
      const sortedTimeSlots = Array.from(timeSlotsMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // First, ensure we include at least one networking/social event for the day
      let hasNetworkingEvent = false;
      const networkingEvents = [];

      for (const [timeSlot, sessionsAtTime] of sortedTimeSlots) {
        const networkingSessions = sessionsAtTime.filter(session => {
          const title = session.title.toLowerCase();
          return title.includes('networking') || title.includes('reception') ||
                 title.includes('party') || title.includes('happy hour') ||
                 title.includes('mixer') || title.includes('social');
        });

        if (networkingSessions.length > 0) {
          networkingEvents.push({
            timeSlot,
            sessions: networkingSessions,
            scores: networkingSessions.map(s => ({
              session: s,
              score: sessionScores.get(s.id)!
            }))
          });
        }
      }

      // Select best session for each time slot
      for (const [timeSlot, sessionsAtTime] of sortedTimeSlots) {
        if (usedTimeSlots.has(timeSlot)) continue;

        // Sort sessions by score
        const scoredSessions = sessionsAtTime
          .map(session => ({
            session,
            score: sessionScores.get(session.id)!
          }))
          .filter(s => s.score)
          .sort((a, b) => b.score.score - a.score.score);

        if (scoredSessions.length === 0) continue;

        // Take the best scoring session
        let best = scoredSessions[0];

        // Prioritize networking events, especially end-of-day events
        const isEndOfDay = timeSlot >= '16:30'; // After 4:30 PM
        const hasNetworkingHere = networkingEvents.some(ne => ne.timeSlot === timeSlot);

        if (hasNetworkingHere) {
          const networkingOption = networkingEvents.find(ne => ne.timeSlot === timeSlot);
          if (networkingOption && networkingOption.scores.length > 0) {
            // Always include end-of-day networking, or if we haven't had one yet
            if (isEndOfDay || !hasNetworkingEvent) {
              best = networkingOption.scores.sort((a, b) => b.score.score - a.score.score)[0];
              // Give bonus score to ensure it's included
              best.score.score += 20;
              hasNetworkingEvent = true;
            }
          }
        }

        // Lower threshold for networking events, higher for regular sessions
        const isNetworkingEvent = best.session.title.toLowerCase().includes('networking') ||
                                  best.session.title.toLowerCase().includes('reception') ||
                                  best.session.title.toLowerCase().includes('party');
        const scoreThreshold = isNetworkingEvent ? 10 : 15;

        // Only include sessions with reasonable scores
        if (best.score.score > scoreThreshold || userProfile.favoriteIds.includes(best.session.id)) {
          const startTime = new Date(best.session.startTime);
          const endTime = new Date(best.session.endTime);

          schedule.push({
            id: `item-${best.session.id}`,
            type: 'session',
            time: startTime.toTimeString().slice(0, 5),
            endTime: endTime.toTimeString().slice(0, 5),
            title: best.session.title,
            item: {
              id: best.session.id,
              title: best.session.title,
              description: best.session.description,
              track: best.session.track,
              format: best.session.format,
              location: best.session.location,
              speakers: best.session.speakers?.map((s: any) => ({
                id: s.speaker.id,
                name: s.speaker.name,
                title: s.speaker.title,
                company: s.speaker.company
              })) || []
            },
            priority: best.score.score > 70 ? 'high' : best.score.score > 40 ? 'medium' : 'low',
            source: userProfile.favoriteIds.includes(best.session.id) ? 'user-favorite' : 'ai-suggested',
            matchScore: best.score.score,
            matchReasons: best.score.reasons.slice(0, 3)
          });

          selectedSessions.push(best);
          usedTimeSlots.add(timeSlot);

          // Mark overlapping time slots as used
          const sessionStart = startTime.getTime();
          const sessionEnd = endTime.getTime();

          sortedTimeSlots.forEach(([otherTime]) => {
            const otherTimeDate = new Date(`${dateString}T${otherTime}`);
            if (otherTimeDate.getTime() >= sessionStart && otherTimeDate.getTime() < sessionEnd) {
              usedTimeSlots.add(otherTime);
            }
          });
        }
      }

      // Add meal breaks
      const lunchTime = '12:00';
      if (!Array.from(usedTimeSlots).some(time => time >= '11:30' && time <= '13:00')) {
        schedule.push({
          id: `lunch-day${dayNumber}`,
          type: 'meal',
          time: lunchTime,
          endTime: '13:00',
          title: 'Lunch & Networking',
          item: {
            id: `lunch-${dayNumber}`,
            title: 'Lunch & Networking',
            description: 'Network with fellow attendees',
            location: 'Exhibition Hall'
          },
          priority: 'medium',
          source: 'schedule'
        });
      }

      // Sort schedule by time
      schedule.sort((a, b) => a.time.localeCompare(b.time));

      // Calculate day stats
      const sessionCount = schedule.filter(item => item.type === 'session').length;
      const favoritesCount = schedule.filter(item => item.source === 'user-favorite').length;
      const aiCount = schedule.filter(item => item.source === 'ai-suggested').length;

      days.push({
        dayNumber,
        date: dateString,
        schedule,
        stats: {
          totalSessions: sessionCount,
          favoritesCovered: favoritesCount,
          aiSuggestions: aiCount,
          breaksCovered: schedule.filter(item => item.type === 'meal').length
        },
        conflicts: []
      });
    }

    // 9. Generate insights
    const insights = generateInsights(selectedSessions, userProfile, actualSessions.length);

    // 10. Calculate overall metrics
    const totalSessions = days.reduce((sum, day) => sum + day.stats.totalSessions, 0);
    const totalFavorites = days.reduce((sum, day) => sum + day.stats.favoritesCovered, 0);
    const totalAI = days.reduce((sum, day) => sum + day.stats.aiSuggestions, 0);

    const agenda: SmartAgenda & { insights?: AgendaInsights } = {
      userId,
      generatedAt: new Date(),
      days,
      metrics: {
        totalFavorites: userProfile.favoriteIds.length,
        favoritesIncluded: totalFavorites,
        aiSuggestionsAdded: totalAI,
        conflictsResolved: 0,
        overallConfidence: Math.round(
          selectedSessions.reduce((sum, s) => sum + s.score.score, 0) /
          Math.max(selectedSessions.length, 1)
        ),
        profileCompleteness: userProfile.interests.length > 0 ? 100 : 50
      },
      conflicts: [], // No conflicts in this implementation
      suggestions: insights.keyReasons || [], // Use key reasons as suggestions
      warnings: [],
      aiReasoning: undefined, // Not using AI reasoning in this implementation
      profileCoaching: userProfile.interests.length === 0
        ? ['Add your interests to get better session recommendations']
        : undefined,
      usingAI: true,
      insights
    };

    console.log('[Intelligent Agenda] Generated successfully with', totalSessions, 'sessions');

    return { success: true, agenda };

  } catch (error) {
    console.error('[Intelligent Agenda] Generation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate agenda'
    };
  }
}

/**
 * Calculate profile completeness percentage
 */
export function calculateProfileCompleteness(user: any): number {
  if (!user) return 0;

  const fields = [
    user.name,
    user.email,
    user.company || user.profile?.company,
    user.role || user.profile?.role,
    user.organizationType || user.profile?.organizationType,
    (user.interests && user.interests.length > 0) || (user.profile?.interests && user.profile.interests.length > 0),
    user.profile?.bio,
    user.profile?.linkedinUrl
  ];

  const completedFields = fields.filter(field => {
    if (typeof field === 'boolean') return field;
    return field !== null && field !== undefined && field !== '';
  }).length;

  return Math.round((completedFields / fields.length) * 100);
}