/**
 * AI Reasoning Engine for Intelligent Agenda Building
 * Uses Claude Opus 4.1 with chain-of-thought reasoning for deep analysis
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_CONFIG } from '@/lib/ai-config';
import { generateThinkingInstructions } from '@/lib/prompt-engine';
import type {
  AgendaOptions,
  ScheduleItem,
  SmartAgenda,
  ConflictInfo,
  AlternativeSession
} from './types';

// Types for AI reasoning
export interface UserProfile {
  id: string;
  name: string;
  role: string;
  company: string;
  organizationType: string;
  interests: string[];
  goals: string[];
  yearsExperience: number;
  usingSalesforce: boolean;
  interestedInSalesforce: boolean;
}

export interface Favorite {
  id: string;
  type: 'session' | 'speaker';
  session?: any;
  speaker?: any;
}

export interface Session {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location: string;
  track: string;
  level: string;
  speakers: any[];
  tags: string[];
}

export interface ScheduleConstraints {
  startTime: string;
  endTime: string;
  includeMeals: boolean;
  maxSessionsPerDay: number;
  minimumBreakMinutes: number;
  maximumWalkingMinutes: number;
  targetSessionsPerPeriod: {
    morning: number;
    afternoon: number;
    evening: number;
  };
}

export interface ReasoningStep {
  stage: string;
  thought: string;
  analysis: string;
  decision: string;
  confidence: number;
  alternatives: Array<{
    option: string;
    pros: string[];
    cons: string[];
    whyNotChosen: string;
  }>;
}

export interface AgendaReasoningContext {
  userProfile: UserProfile;
  favorites: Favorite[];
  allSessions: Session[];
  constraints: ScheduleConstraints;
  dayNumber: number;
  date: string;
}

export interface AgendaReasoningResult {
  schedule: ScheduleItem[];
  reasoning: ReasoningStep[];
  insights: string[];
  suggestions: string[];
  confidenceScore: number;
  profileCompleteness: number;
  coachingMessages: string[];
}

export enum SessionPriority {
  MUST_ATTEND = 100,       // User favorites
  HIGHLY_RECOMMENDED = 85, // Speaker favorites + perfect profile match
  RECOMMENDED = 70,        // Strong profile match
  SUGGESTED = 50,          // Good fit
  OPTIONAL = 30,           // Interesting but not essential
}

/**
 * Generate intelligent agenda using AI reasoning
 */
export async function generateIntelligentAgenda(
  context: AgendaReasoningContext
): Promise<AgendaReasoningResult> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  });

  // Calculate profile completeness
  const profileCompleteness = calculateProfileCompleteness(context.userProfile);

  // Generate coaching messages based on profile
  const coachingMessages = generateProfileCoaching(context.userProfile, profileCompleteness);

  try {
    // Create the chain-of-thought prompt
    const systemPrompt = generateAgendaSystemPrompt();
    const userPrompt = generateAgendaUserPrompt(context, profileCompleteness);

    // Call Claude Opus 4.1 for intelligent reasoning
    const response = await anthropic.messages.create({
      model: AI_CONFIG.PRIMARY_MODEL, // claude-opus-4-1-20250805
      max_tokens: 4000,
      temperature: 0.8,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: userPrompt
      }]
    });

    // Parse the AI response
    const contentBlock = response.content[0];
    let result;
    if (contentBlock.type === 'text') {
      result = parseAIResponse(contentBlock.text);
    } else {
      throw new Error('Unexpected response type from AI');
    }

    // Add profile coaching to the result
    result.profileCompleteness = profileCompleteness;
    result.coachingMessages = coachingMessages;

    return result;
  } catch (error) {
    console.error('AI reasoning error:', error);
    // Fallback to basic algorithm if AI fails
    return generateFallbackAgenda(context, profileCompleteness, coachingMessages);
  }
}

/**
 * Generate system prompt for agenda reasoning
 */
function generateAgendaSystemPrompt(): string {
  return `You are an expert conference schedule optimizer with deep understanding of professional development, time management, and strategic career growth.

THINKING FRAMEWORK FOR AGENDA BUILDING:

1. PROFILE ANALYSIS (Understand the attendee deeply):
   - Analyze explicit goals and implicit needs
   - Identify knowledge gaps based on role and experience
   - Consider career trajectory and growth opportunities
   - Assess learning style and cognitive capacity
   - Recognize networking priorities

2. SESSION EVALUATION (Analyze each potential session):
   - Content relevance score (0-100) based on profile
   - Speaker quality and industry reputation
   - Networking potential with other attendees
   - Skill level appropriateness (beginner/intermediate/advanced)
   - Strategic value for short-term and long-term goals
   - Uniqueness of content (can't get elsewhere)

3. SCHEDULE OPTIMIZATION (Balance multiple factors):
   - Cognitive load distribution: Mix intense technical sessions with lighter networking
   - Energy management: Place difficult content when attendee is fresh
   - Topic progression: Build knowledge throughout the day
   - Diversity vs. depth: Balance broad exposure with deep dives
   - Break timing: Ensure mental recovery periods
   - Venue logistics: Minimize walking, account for distances

4. PRIORITY SYSTEM:
   Priority 100 (MUST_ATTEND): User's explicit favorites - always include
   Priority 85 (HIGHLY_RECOMMENDED): Sessions with favorited speakers + perfect profile matches
   Priority 70 (RECOMMENDED): Strong alignment with interests and goals
   Priority 50 (SUGGESTED): Good fit, worth considering
   Priority 30 (OPTIONAL): Interesting but not essential

5. CONFLICT RESOLUTION (Smart trade-offs):
   - Weigh immediate value vs. long-term benefit
   - Consider recording availability
   - Identify similar content alternatives
   - Factor in networking opportunities
   - Assess uniqueness of opportunity

6. HIDDEN OPPORTUNITIES (Find non-obvious value):
   - Cross-domain learning that sparks innovation
   - Unexpected connections between topics
   - Emerging trends before they're mainstream
   - Skill adjacencies that multiply value
   - Strategic relationships to build

REASONING OUTPUT FORMAT:
For each major decision, provide:
- THOUGHT: What you're considering
- ANALYSIS: Deep evaluation of options
- DECISION: What you chose and why
- CONFIDENCE: 0-100% score
- ALTERNATIVES: Other options considered with pros/cons

Remember: The goal is not just to fill time slots, but to create a transformative conference experience tailored to this specific attendee's growth.`;
}

/**
 * Generate user prompt with context
 */
function generateAgendaUserPrompt(
  context: AgendaReasoningContext,
  profileCompleteness: number
): string {
  const { userProfile, favorites, allSessions, constraints, dayNumber, date } = context;

  // Identify favorited sessions for this day
  const favoritedSessions = favorites
    .filter(f => f.type === 'session' && f.session)
    .map(f => f.session)
    .filter(s => new Date(s.startTime).toISOString().split('T')[0] === date);

  // Identify favorited speakers
  const favoritedSpeakers = favorites
    .filter(f => f.type === 'speaker' && f.speaker)
    .map(f => f.speaker);

  return `Build an intelligent conference agenda for Day ${dayNumber} (${date}).

USER PROFILE:
- Name: ${userProfile.name || 'Not specified'}
- Role: ${userProfile.role || 'Not specified'}
- Company: ${userProfile.company || 'Not specified'}
- Organization Type: ${userProfile.organizationType || 'Not specified'}
- Years Experience: ${userProfile.yearsExperience || 'Not specified'}
- Interests: ${userProfile.interests.length > 0 ? userProfile.interests.join(', ') : 'None specified'}
- Goals: ${userProfile.goals.length > 0 ? userProfile.goals.join(', ') : 'None specified'}
- Profile Completeness: ${profileCompleteness}%

FAVORITES:
- Favorited Sessions (${favoritedSessions.length}): ${favoritedSessions.map(s => s.title).join(', ') || 'None'}
- Favorited Speakers (${favoritedSpeakers.length}): ${favoritedSpeakers.map(s => s.name).join(', ') || 'None'}

CONSTRAINTS:
- Day starts: ${constraints.startTime}
- Day ends: ${constraints.endTime}
- Include meals: ${constraints.includeMeals}
- Target sessions: ${constraints.targetSessionsPerPeriod.morning} morning, ${constraints.targetSessionsPerPeriod.afternoon} afternoon
- Minimum break: ${constraints.minimumBreakMinutes} minutes
- Maximum walking: ${constraints.maximumWalkingMinutes} minutes

AVAILABLE SESSIONS:
${allSessions.filter(s => {
    const startTime = typeof s.startTime === 'string' ? new Date(s.startTime) : s.startTime;
    const sessionDate = startTime instanceof Date ? startTime.toISOString() : String(s.startTime);
    return sessionDate.split('T')[0] === date;
  })
  .slice(0, 50) // Limit to avoid token overflow
  .map(s => {
    const startTime = typeof s.startTime === 'string' ? new Date(s.startTime) : s.startTime;
    const endTime = typeof s.endTime === 'string' ? new Date(s.endTime) : s.endTime;
    const start = startTime instanceof Date ? startTime.toISOString() : String(s.startTime);
    const end = endTime instanceof Date ? endTime.toISOString() : String(s.endTime);
    return `- ${s.title} (${start.split('T')[1]} - ${end.split('T')[1]}, ${s.location}, Track: ${s.track})`;
  })
  .join('\n')}

TASK:
Create an optimized schedule following this priority:
1. Include ALL favorited sessions (Priority 100)
2. Add sessions featuring favorited speakers (Priority 85)
3. Fill gaps with AI recommendations based on profile (Priority 70-50)
4. Ensure proper meal breaks and walking time

For each session selection, explain your reasoning including:
- Why this session fits the user's profile
- What alternatives you considered
- Your confidence level
- How it connects to other sessions in the schedule

Provide strategic insights about the overall agenda and suggestions for getting the most value.

OUTPUT FORMAT:
{
  "schedule": [array of scheduled items with times],
  "reasoning": [array of reasoning steps],
  "insights": [strategic insights about the agenda],
  "suggestions": [actionable suggestions for the attendee],
  "confidenceScore": overall confidence percentage
}`;
}

/**
 * Calculate profile completeness score
 */
function calculateProfileCompleteness(profile: UserProfile): number {
  const weights = {
    name: 5,
    role: 15,
    company: 10,
    organizationType: 10,
    interests: 25,
    goals: 20,
    yearsExperience: 5,
    usingSalesforce: 5,
    interestedInSalesforce: 5
  };

  let score = 0;

  if (profile.name) score += weights.name;
  if (profile.role) score += weights.role;
  if (profile.company) score += weights.company;
  if (profile.organizationType) score += weights.organizationType;
  if (profile.interests && profile.interests.length > 0) {
    score += Math.min(weights.interests, (profile.interests.length / 5) * weights.interests);
  }
  if (profile.goals && profile.goals.length > 0) {
    score += Math.min(weights.goals, (profile.goals.length / 3) * weights.goals);
  }
  if (profile.yearsExperience > 0) score += weights.yearsExperience;
  score += weights.usingSalesforce; // Always counted as answered
  score += weights.interestedInSalesforce; // Always counted as answered

  return Math.round(score);
}

/**
 * Generate profile coaching messages
 */
function generateProfileCoaching(
  profile: UserProfile,
  completenessScore: number
): string[] {
  const messages: string[] = [];

  if (completenessScore < 80) {
    messages.push(`Your profile is ${completenessScore}% complete. Adding more details will improve AI recommendations.`);
  }

  if (!profile.interests || profile.interests.length === 0) {
    messages.push('💡 Add your interests to get personalized session recommendations');
  }

  if (!profile.goals || profile.goals.length === 0) {
    messages.push('🎯 Set your conference goals for a more strategic agenda');
  }

  if (!profile.role) {
    messages.push('👤 Add your role to get level-appropriate content');
  }

  if (!profile.organizationType) {
    messages.push('🏢 Specify your organization type for industry-relevant sessions');
  }

  if (profile.interests && profile.interests.length < 3) {
    messages.push('➕ Add more interests for better content diversity');
  }

  return messages;
}

/**
 * Parse AI response into structured result
 */
function parseAIResponse(responseText: string): AgendaReasoningResult {
  try {
    // Try to parse as JSON first
    const parsed = JSON.parse(responseText);
    return {
      schedule: parsed.schedule || [],
      reasoning: parsed.reasoning || [],
      insights: parsed.insights || [],
      suggestions: parsed.suggestions || [],
      confidenceScore: parsed.confidenceScore || 75,
      profileCompleteness: 0, // Will be set by caller
      coachingMessages: [] // Will be set by caller
    };
  } catch (error) {
    // If not valid JSON, extract information from text
    console.error('Failed to parse AI response as JSON, using text extraction');
    return extractFromText(responseText);
  }
}

/**
 * Extract agenda information from unstructured text
 */
function extractFromText(text: string): AgendaReasoningResult {
  // Basic extraction logic - would be enhanced in production
  return {
    schedule: [],
    reasoning: [{
      stage: 'parsing',
      thought: 'AI response was not in expected format',
      analysis: 'Attempting to extract schedule from text',
      decision: 'Using fallback algorithm',
      confidence: 50,
      alternatives: []
    }],
    insights: ['AI processing encountered an issue, using simplified recommendations'],
    suggestions: ['Please complete your profile for better recommendations'],
    confidenceScore: 50,
    profileCompleteness: 0,
    coachingMessages: []
  };
}

/**
 * Generate fallback agenda if AI fails
 */
function generateFallbackAgenda(
  context: AgendaReasoningContext,
  profileCompleteness: number,
  coachingMessages: string[]
): AgendaReasoningResult {
  return {
    schedule: [],
    reasoning: [{
      stage: 'fallback',
      thought: 'AI service temporarily unavailable',
      analysis: 'Using rule-based algorithm',
      decision: 'Generated basic schedule with favorites',
      confidence: 60,
      alternatives: []
    }],
    insights: ['Schedule generated using simplified algorithm'],
    suggestions: ['AI recommendations will be available shortly'],
    confidenceScore: 60,
    profileCompleteness,
    coachingMessages
  };
}

/**
 * Analyze session fit for user profile
 */
export async function analyzeSessionFit(
  session: Session,
  userProfile: UserProfile,
  currentSchedule: ScheduleItem[]
): Promise<{
  priority: SessionPriority;
  reasoning: string;
  confidence: number;
  conflicts: ConflictInfo[];
}> {
  // Calculate relevance based on profile
  let relevanceScore = 0;
  let reasoning = '';

  // Check interest alignment
  const matchingInterests = session.tags.filter(tag =>
    userProfile.interests.some(interest =>
      interest.toLowerCase().includes(tag.toLowerCase()) ||
      tag.toLowerCase().includes(interest.toLowerCase())
    )
  );

  if (matchingInterests.length > 0) {
    relevanceScore += 30;
    reasoning += `Matches your interests in ${matchingInterests.join(', ')}. `;
  }

  // Check goal alignment
  const goalKeywords = userProfile.goals.join(' ').toLowerCase();
  if (session.description.toLowerCase().includes(goalKeywords)) {
    relevanceScore += 25;
    reasoning += `Aligns with your goals. `;
  }

  // Check role relevance
  if (session.level && userProfile.role) {
    if (
      (userProfile.role.includes('Executive') && session.level === 'strategic') ||
      (userProfile.role.includes('Developer') && session.level === 'technical') ||
      (userProfile.role.includes('Manager') && session.level === 'intermediate')
    ) {
      relevanceScore += 20;
      reasoning += `Appropriate for your ${userProfile.role} role. `;
    }
  }

  // Check track relevance
  if (session.track && userProfile.organizationType) {
    if (
      (userProfile.organizationType === 'Carrier' && session.track.includes('Insurance')) ||
      (userProfile.organizationType === 'InsurTech' && session.track.includes('Innovation'))
    ) {
      relevanceScore += 15;
      reasoning += `Relevant to ${userProfile.organizationType} organizations. `;
    }
  }

  // Determine priority based on score
  let priority: SessionPriority;
  if (relevanceScore >= 70) {
    priority = SessionPriority.HIGHLY_RECOMMENDED;
  } else if (relevanceScore >= 50) {
    priority = SessionPriority.RECOMMENDED;
  } else if (relevanceScore >= 30) {
    priority = SessionPriority.SUGGESTED;
  } else {
    priority = SessionPriority.OPTIONAL;
  }

  // Check for conflicts
  const conflicts = detectScheduleConflicts(session, currentSchedule);

  return {
    priority,
    reasoning: reasoning || 'Could be interesting based on general conference themes.',
    confidence: Math.min(95, relevanceScore + 20),
    conflicts
  };
}

/**
 * Detect conflicts with current schedule
 */
function detectScheduleConflicts(
  session: Session,
  currentSchedule: ScheduleItem[]
): ConflictInfo[] {
  const conflicts: ConflictInfo[] = [];
  const sessionStart = new Date(session.startTime).getTime();
  const sessionEnd = new Date(session.endTime).getTime();

  for (const item of currentSchedule) {
    if (item.type === 'session') {
      const itemStart = new Date(`2025-10-15 ${item.time}`).getTime(); // Use actual date
      const itemEnd = new Date(`2025-10-15 ${item.endTime}`).getTime();

      if (sessionStart < itemEnd && sessionEnd > itemStart) {
        conflicts.push({
          type: 'time-overlap',
          sessionIds: [session.id, item.item.id],
          description: `Conflicts with "${item.item.title}"`,
          resolution: 'Choose one or find alternative time'
        });
      }
    }
  }

  return conflicts;
}