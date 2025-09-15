/**
 * Guest Agenda Builder
 * Builds personalized agendas for non-authenticated users by collecting preferences
 */

import { SmartAgenda, ScheduleItem, AgendaOptions } from './types';
import prisma from '@/lib/db';

export interface GuestPreferences {
  interests: string[];
  role?: string;
  goals?: string[];
  organizationType?: string;
  experienceLevel?: string;
  days?: string[];
}

export interface PreferenceQuestion {
  id: string;
  question: string;
  options?: string[];
  type: 'multi-select' | 'single-select' | 'text';
  required: boolean;
}

export const PREFERENCE_QUESTIONS: PreferenceQuestion[] = [
  {
    id: 'interests',
    question: "What topics are you most interested in? (Select all that apply)",
    options: [
      'AI & Automation',
      'Cybersecurity',
      'Claims Technology',
      'Underwriting',
      'Digital Transformation',
      'Customer Experience',
      'Embedded Insurance',
      'Data & Analytics',
      'InsurTech Innovation',
      'Regulatory & Compliance'
    ],
    type: 'multi-select',
    required: true
  },
  {
    id: 'role',
    question: "What's your role in the industry?",
    options: [
      'Executive/C-Suite',
      'IT/Technology',
      'Product Management',
      'Innovation/Strategy',
      'Operations',
      'Sales/Marketing',
      'Underwriting',
      'Claims',
      'Vendor/Solution Provider',
      'Consultant',
      'Student/Academic'
    ],
    type: 'single-select',
    required: false
  },
  {
    id: 'goals',
    question: "What are your main goals for the conference? (Select up to 3)",
    options: [
      'Learn about new technologies',
      'Network with peers',
      'Find solution providers',
      'Discover implementation strategies',
      'Understand industry trends',
      'Meet potential partners',
      'Evaluate vendor solutions',
      'Gain competitive insights'
    ],
    type: 'multi-select',
    required: false
  },
  {
    id: 'days',
    question: "Which days will you attend?",
    options: [
      'Day 1 - Tuesday, Oct 14',
      'Day 2 - Wednesday, Oct 15',
      'Day 3 - Thursday, Oct 16'
    ],
    type: 'multi-select',
    required: true
  }
];

/**
 * Generate a personalized agenda for a guest user based on collected preferences
 */
export async function generateGuestAgenda(
  preferences: GuestPreferences,
  options: Partial<AgendaOptions> = {}
): Promise<{ success: boolean; agenda?: SmartAgenda; error?: string; executionTime?: number; metadata?: any }> {
  const startTime = Date.now();

  try {
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

    // Score sessions based on preferences
    const scoredSessions = allSessions.map(session => {
      let score = 0;

      // Interest matching (highest weight)
      if (preferences.interests && preferences.interests.length > 0) {
        preferences.interests.forEach(interest => {
          const interestLower = interest.toLowerCase();
          const titleLower = session.title?.toLowerCase() || '';
          const descLower = session.description?.toLowerCase() || '';
          const trackLower = session.track?.toLowerCase() || '';

          if (titleLower.includes(interestLower) ||
              descLower.includes(interestLower) ||
              trackLower.includes(interestLower)) {
            score += 10;
          }

          // Check for specific keyword matches
          if (interest === 'AI & Automation' &&
              (titleLower.includes('ai') || titleLower.includes('artificial') ||
               titleLower.includes('machine learning') || titleLower.includes('automation'))) {
            score += 15;
          }

          if (interest === 'Cybersecurity' &&
              (titleLower.includes('cyber') || titleLower.includes('security') ||
               titleLower.includes('fraud') || titleLower.includes('risk'))) {
            score += 15;
          }
        });
      }

      // Role matching
      if (preferences.role) {
        const roleLower = preferences.role.toLowerCase();
        const sessionContent = `${session.title} ${session.description} ${session.track}`.toLowerCase();

        if (sessionContent.includes(roleLower)) {
          score += 5;
        }

        // Executive priority for strategic sessions
        if (preferences.role === 'Executive/C-Suite' &&
            (sessionContent.includes('strategic') || sessionContent.includes('leadership') ||
             sessionContent.includes('transformation'))) {
          score += 8;
        }
      }

      // Goal matching
      if (preferences.goals && preferences.goals.length > 0) {
        preferences.goals.forEach(goal => {
          const goalLower = goal.toLowerCase();
          const sessionContent = `${session.title} ${session.description}`.toLowerCase();

          if (goal.includes('technologies') && sessionContent.includes('innovation')) {
            score += 5;
          }
          if (goal.includes('network') && sessionContent.includes('networking')) {
            score += 10;
          }
          if (goal.includes('solution') && sessionContent.includes('case study')) {
            score += 7;
          }
        });
      }

      // Keynote sessions get a boost
      if (session.title.toLowerCase().includes('keynote')) {
        score += 20;
      }

      // Meal sessions get a small boost
      if (session.title.toLowerCase().includes('lunch') ||
          session.title.toLowerCase().includes('breakfast') ||
          session.title.toLowerCase().includes('break')) {
        score += 3;
      }

      return { session, score };
    });

    // Group sessions by day
    const sessionsByDay = new Map<string, any[]>();
    scoredSessions.forEach(({ session, score }) => {
      const day = new Date(session.startTime).toDateString();
      if (!sessionsByDay.has(day)) {
        sessionsByDay.set(day, []);
      }
      sessionsByDay.get(day)!.push({ session, score });
    });

    // Build agenda for selected days
    const days: any = {};
    let dayNumber = 1;
    let totalSessions = 0;
    const includedTracks = new Set<string>();

    for (const [dateString, daySessions] of sessionsByDay) {
      // Check if this day is selected
      const dayTag = `day${dayNumber}`;
      if (preferences.days && !preferences.days.some(d =>
        d.includes(`Day ${dayNumber}`) || d.includes(dayTag)
      )) {
        dayNumber++;
        continue;
      }

      // Sort sessions by score and time
      daySessions.sort((a, b) => {
        // First by time
        const timeA = new Date(a.session.startTime).getTime();
        const timeB = new Date(b.session.startTime).getTime();
        if (Math.abs(timeA - timeB) > 3600000) { // More than 1 hour apart
          return timeA - timeB;
        }
        // Then by score for concurrent sessions
        return b.score - a.score;
      });

      const schedule: ScheduleItem[] = [];
      const usedTimeSlots = new Set<string>();
      let sessionsForDay = 0;
      const maxPerDay = options.maxSessionsPerDay || 8;

      for (const { session, score } of daySessions) {
        // Skip if we've hit the max for the day
        if (sessionsForDay >= maxPerDay && session.type !== 'meal' && session.type !== 'break') {
          continue;
        }

        const startTime = new Date(session.startTime).getTime();
        const endTime = new Date(session.endTime).getTime();

        // Check for time conflicts
        let hasConflict = false;
        for (const slot of usedTimeSlots) {
          const [slotStart, slotEnd] = slot.split('-').map(Number);
          if ((startTime >= slotStart && startTime < slotEnd) ||
              (endTime > slotStart && endTime <= slotEnd)) {
            hasConflict = true;
            break;
          }
        }

        // Include high-score sessions or meals/breaks
        if (!hasConflict && (score >= 5 || session.type === 'meal' || session.type === 'break')) {
          usedTimeSlots.add(`${startTime}-${endTime}`);

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
            type: 'session' as const,
            source: 'ai-suggested' as const,
            item: {
              id: session.id,
              title: session.title,
              description: session.description || '',
              location: session.location || '',
              speakers: session.speakers.map((s: any) => ({
                id: s.speaker.id,
                name: s.speaker.name,
                company: s.speaker.company,
                role: s.speaker.role
              })),
              track: session.track || ''
            }
          });

          if (session.track) {
            includedTracks.add(session.track);
          }

          if (session.type !== 'meal' && session.type !== 'break') {
            sessionsForDay++;
            totalSessions++;
          }
        }
      }

      // Sort schedule by time
      schedule.sort((a, b) => {
        const timeA = new Date(`1970-01-01 ${a.time}`).getTime();
        const timeB = new Date(`1970-01-01 ${b.time}`).getTime();
        return timeA - timeB;
      });

      days[dayTag] = {
        date: dateString,
        schedule,
        sessionCount: sessionsForDay,
        conflicts: []
      };

      dayNumber++;
    }

    const executionTime = Date.now() - startTime;

    return {
      success: true,
      agenda: {
        success: true,
        days,
        metadata: {
          generatedAt: new Date().toISOString(),
          totalSessions,
          daysIncluded: Object.keys(days),
          tracks: Array.from(includedTracks),
          preferences: {
            interests: preferences.interests || [],
            role: preferences.role,
            goals: preferences.goals || []
          },
          executionTime: `${executionTime}ms`,
          sessionsConsidered: allSessions.length,
          isGuestAgenda: true
        }
      },
      executionTime,
      metadata: {
        sessionsConsidered: allSessions.length,
        totalSessions
      }
    };

  } catch (error) {
    console.error('Error generating guest agenda:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Format preference questions for chat interaction
 */
export function formatPreferenceQuestions(): string {
  return `To build your personalized agenda, tell me:

**What are you interested in?**
AI • Cybersecurity • Claims • Underwriting • Digital Transformation • Customer Experience • Data Analytics • InsurTech • Embedded Insurance

**Example:** "I'm interested in AI and cybersecurity, I'm a product manager attending all 3 days"`;
}

/**
 * Get structured preference options for interactive selection
 */
export function getPreferenceOptions() {
  return [
    // Topics of Interest
    { id: 'ai', label: 'AI & Machine Learning', category: 'interest' as const, value: 'AI and machine learning' },
    { id: 'cyber', label: 'Cybersecurity', category: 'interest' as const, value: 'cybersecurity' },
    { id: 'claims', label: 'Claims Technology', category: 'interest' as const, value: 'claims technology' },
    { id: 'underwriting', label: 'Underwriting', category: 'interest' as const, value: 'underwriting innovation' },
    { id: 'digital', label: 'Digital Transformation', category: 'interest' as const, value: 'digital transformation' },
    { id: 'cx', label: 'Customer Experience', category: 'interest' as const, value: 'customer experience' },
    { id: 'embedded', label: 'Embedded Insurance', category: 'interest' as const, value: 'embedded insurance' },
    { id: 'data', label: 'Data & Analytics', category: 'interest' as const, value: 'data analytics' },
    { id: 'emerging', label: 'Emerging Tech', category: 'interest' as const, value: 'emerging technologies' },
    { id: 'insurtech', label: 'InsurTech', category: 'interest' as const, value: 'insurtech innovations' },

    // Roles
    { id: 'technical', label: 'Technical', category: 'role' as const, value: 'technical professional' },
    { id: 'business', label: 'Business', category: 'role' as const, value: 'business leader' },
    { id: 'executive', label: 'Executive', category: 'role' as const, value: 'executive' },
    { id: 'product', label: 'Product Manager', category: 'role' as const, value: 'product manager' },
    { id: 'vendor', label: 'Vendor/Partner', category: 'role' as const, value: 'vendor partner' },
    { id: 'consultant', label: 'Consultant', category: 'role' as const, value: 'consultant' },
    { id: 'developer', label: 'Developer', category: 'role' as const, value: 'developer' },

    // Session Focus
    { id: 'technical_sessions', label: 'Technical Sessions', category: 'focus' as const, value: 'technical deep-dive sessions' },
    { id: 'business_sessions', label: 'Business Applications', category: 'focus' as const, value: 'business application sessions' },
    { id: 'case_studies', label: 'Case Studies', category: 'focus' as const, value: 'real-world case studies' },
    { id: 'hands_on', label: 'Hands-on Workshops', category: 'focus' as const, value: 'hands-on workshops' },
    { id: 'strategic', label: 'Strategic Sessions', category: 'focus' as const, value: 'strategic and leadership sessions' },

    // Days
    { id: 'day1', label: 'Day 1 (Oct 14)', category: 'days' as const, value: 'day 1' },
    { id: 'day2', label: 'Day 2 (Oct 15)', category: 'days' as const, value: 'day 2' },
    { id: 'day3', label: 'Day 3 (Oct 16)', category: 'days' as const, value: 'day 3' }
  ];
}

/**
 * Parse user responses to extract preferences
 */
export function parsePreferenceResponses(userInput: string): GuestPreferences {
  const preferences: GuestPreferences = {
    interests: [],
    days: []
  };

  const inputLower = userInput.toLowerCase();

  // Parse interests
  const interestKeywords = {
    'ai': 'AI & Automation',
    'artificial intelligence': 'AI & Automation',
    'automation': 'AI & Automation',
    'machine learning': 'AI & Automation',
    'cyber': 'Cybersecurity',
    'security': 'Cybersecurity',
    'claims': 'Claims Technology',
    'underwriting': 'Underwriting',
    'digital': 'Digital Transformation',
    'transformation': 'Digital Transformation',
    'customer': 'Customer Experience',
    'cx': 'Customer Experience',
    'embedded': 'Embedded Insurance',
    'data': 'Data & Analytics',
    'analytics': 'Data & Analytics',
    'insurtech': 'InsurTech Innovation',
    'innovation': 'InsurTech Innovation',
    'regulatory': 'Regulatory & Compliance',
    'compliance': 'Regulatory & Compliance'
  };

  for (const [keyword, interest] of Object.entries(interestKeywords)) {
    if (inputLower.includes(keyword) && !preferences.interests.includes(interest)) {
      preferences.interests.push(interest);
    }
  }

  // Parse role
  const roleKeywords = {
    'executive': 'Executive/C-Suite',
    'c-suite': 'Executive/C-Suite',
    'ceo': 'Executive/C-Suite',
    'cto': 'IT/Technology',
    'cio': 'IT/Technology',
    'it': 'IT/Technology',
    'technology': 'IT/Technology',
    'product': 'Product Management',
    'innovation': 'Innovation/Strategy',
    'strategy': 'Innovation/Strategy',
    'operations': 'Operations',
    'sales': 'Sales/Marketing',
    'marketing': 'Sales/Marketing',
    'underwriter': 'Underwriting',
    'claims': 'Claims',
    'vendor': 'Vendor/Solution Provider',
    'solution provider': 'Vendor/Solution Provider',
    'consultant': 'Consultant',
    'student': 'Student/Academic'
  };

  for (const [keyword, role] of Object.entries(roleKeywords)) {
    if (inputLower.includes(keyword)) {
      preferences.role = role;
      break;
    }
  }

  // Parse goals
  preferences.goals = [];
  if (inputLower.includes('learn')) preferences.goals.push('Learn about new technologies');
  if (inputLower.includes('network')) preferences.goals.push('Network with peers');
  if (inputLower.includes('solution') || inputLower.includes('vendor')) preferences.goals.push('Find solution providers');
  if (inputLower.includes('trend')) preferences.goals.push('Understand industry trends');
  if (inputLower.includes('partner')) preferences.goals.push('Meet potential partners');

  // Parse days
  if (inputLower.includes('all') || inputLower.includes('three day') || inputLower.includes('3 day')) {
    preferences.days = ['Day 1 - Tuesday, Oct 14', 'Day 2 - Wednesday, Oct 15', 'Day 3 - Thursday, Oct 16'];
  } else {
    if (inputLower.includes('day 1') || inputLower.includes('tuesday') || inputLower.includes('oct 14')) {
      preferences.days.push('Day 1 - Tuesday, Oct 14');
    }
    if (inputLower.includes('day 2') || inputLower.includes('wednesday') || inputLower.includes('oct 15')) {
      preferences.days.push('Day 2 - Wednesday, Oct 15');
    }
    if (inputLower.includes('day 3') || inputLower.includes('thursday') || inputLower.includes('oct 16')) {
      preferences.days.push('Day 3 - Thursday, Oct 16');
    }
  }

  // Default to all days if none specified
  if (preferences.days.length === 0) {
    preferences.days = ['Day 1 - Tuesday, Oct 14', 'Day 2 - Wednesday, Oct 15', 'Day 3 - Thursday, Oct 16'];
  }

  return preferences;
}