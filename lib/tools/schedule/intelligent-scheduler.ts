// Intelligent Scheduling Utilities for Smart Agenda
// Handles energy management, cognitive load, networking, and breaks

import { ScheduleItem, AgendaOptions, Session } from './types';

/**
 * Calculate cognitive load for a session based on various factors
 */
export function calculateCognitiveLoad(session: Session): number {
  let load = 50; // Base load

  // Format impacts cognitive load
  const formatLoads: Record<string, number> = {
    'workshop': 80,
    'hands-on': 85,
    'technical-deep-dive': 90,
    'panel': 40,
    'keynote': 35,
    'networking': 20,
    'social': 15
  };

  const format = session.track?.toLowerCase() || '';
  Object.entries(formatLoads).forEach(([key, value]) => {
    if (format.includes(key) || session.title.toLowerCase().includes(key)) {
      load = value;
    }
  });

  // Technical content increases load
  const technicalKeywords = ['api', 'integration', 'architecture', 'implementation', 'code', 'technical', 'advanced'];
  const titleLower = session.title.toLowerCase();
  const descLower = (session.description || '').toLowerCase();

  technicalKeywords.forEach(keyword => {
    if (titleLower.includes(keyword) || descLower.includes(keyword)) {
      load += 5;
    }
  });

  // Level adjustments
  if (session.level === 'advanced') load += 15;
  if (session.level === 'intermediate') load += 5;
  if (session.level === 'beginner') load -= 10;

  return Math.min(100, Math.max(10, load));
}

/**
 * Calculate networking value for a session
 */
export function calculateNetworkingScore(session: Session, userProfile?: any): number {
  let score = 25; // Base score

  const networkingKeywords = [
    'networking', 'meetup', 'social', 'reception', 'mixer',
    'coffee', 'breakfast', 'lunch', 'dinner', 'happy hour',
    'roundtable', 'birds of a feather', 'bof', 'unconference'
  ];

  const title = session.title.toLowerCase();
  const desc = (session.description || '').toLowerCase();

  // Check for networking indicators
  networkingKeywords.forEach(keyword => {
    if (title.includes(keyword) || desc.includes(keyword)) {
      score += 20;
    }
  });

  // Meals are networking opportunities
  if (title.includes('breakfast') || title.includes('lunch') || title.includes('dinner')) {
    score += 30;
  }

  // Evening events are typically more social
  const hour = parseInt(session.startTime.toString().split('T')[1]?.split(':')[0] || '0');
  if (hour >= 17) score += 15; // After 5 PM

  // Panel discussions offer Q&A networking
  if (session.track?.includes('panel') || title.includes('panel')) {
    score += 10;
  }

  // Industry-specific sessions for targeted networking
  if (userProfile?.industryFocus) {
    userProfile.industryFocus.forEach((industry: string) => {
      if (title.includes(industry.toLowerCase()) || desc.includes(industry.toLowerCase())) {
        score += 15;
      }
    });
  }

  return Math.min(100, Math.max(0, score));
}

/**
 * Determine optimal energy level for a time slot
 */
export function getOptimalEnergyForTimeSlot(
  timeStr: string,
  energyProfile: 'morning-person' | 'night-owl' | 'steady' = 'steady'
): 'high' | 'medium' | 'low' {
  const hour = parseInt(timeStr.split(':')[0]);
  const isPM = timeStr.includes('PM');
  const adjustedHour = isPM && hour !== 12 ? hour + 12 : hour;

  switch (energyProfile) {
    case 'morning-person':
      if (adjustedHour >= 7 && adjustedHour <= 11) return 'high';
      if (adjustedHour >= 14 && adjustedHour <= 16) return 'low'; // Post-lunch dip
      if (adjustedHour >= 12 && adjustedHour <= 17) return 'medium';
      return 'low';

    case 'night-owl':
      if (adjustedHour >= 7 && adjustedHour <= 9) return 'low';
      if (adjustedHour >= 10 && adjustedHour <= 12) return 'medium';
      if (adjustedHour >= 14 && adjustedHour <= 18) return 'high';
      return 'medium';

    case 'steady':
    default:
      if (adjustedHour >= 9 && adjustedHour <= 11) return 'high';
      if (adjustedHour >= 14 && adjustedHour <= 15) return 'low'; // Post-lunch
      return 'medium';
  }
}

/**
 * Calculate if a break is needed based on cumulative cognitive load
 */
export function shouldInsertBreak(
  cumulativeLoad: number,
  lastBreakTime: string | null,
  currentTime: string,
  options: AgendaOptions
): boolean {
  // High cognitive load needs a break
  if (cumulativeLoad > 150) return true;

  // Check time since last break
  if (lastBreakTime) {
    const timeSinceBreak = getMinutesBetween(lastBreakTime, currentTime);
    if (timeSinceBreak > 120) return true; // 2 hours without break
    if (timeSinceBreak > 90 && cumulativeLoad > 100) return true;
  }

  // Energy dip times (post-lunch)
  const hour = parseInt(currentTime.split(':')[0]);
  const isPM = currentTime.includes('PM');
  const adjustedHour = isPM && hour !== 12 ? hour + 12 : hour;
  if (adjustedHour === 14 || adjustedHour === 15) return true;

  return false;
}

/**
 * Create an intelligent break item
 */
export function createSmartBreak(
  duration: number,
  purpose: 'coffee' | 'recharge' | 'networking' | 'meal-prep',
  startTime: string
): ScheduleItem {
  const titles: Record<string, string> = {
    'coffee': '☕ Coffee & Recharge Break',
    'recharge': '🔋 Energy Recovery Break',
    'networking': '🤝 Networking & Connection Time',
    'meal-prep': '🍽️ Pre-Meal Break'
  };

  const descriptions: Record<string, string> = {
    'coffee': 'Grab a coffee, check messages, and prepare for next session',
    'recharge': 'Take a mental break, stretch, and restore your energy',
    'networking': 'Connect with other attendees and expand your network',
    'meal-prep': 'Prepare for upcoming meal and networking opportunity'
  };

  return {
    id: `break-${Date.now()}`,
    time: startTime,
    endTime: addMinutesToTime(startTime, duration),
    type: 'break',
    source: 'system',
    priority: 'medium',
    title: titles[purpose],
    energyLevel: 'recovery',
    item: {
      id: `break-${purpose}`,
      title: titles[purpose],
      description: descriptions[purpose],
      location: purpose === 'coffee' ? 'Coffee Stations' : 'Various Locations'
    }
  };
}

/**
 * Create a buffer/transition time between sessions
 */
export function createBufferTime(
  startTime: string,
  duration: number = 5,
  fromLocation?: string,
  toLocation?: string
): ScheduleItem {
  const needsTravel = fromLocation && toLocation && fromLocation !== toLocation;

  return {
    id: `buffer-${Date.now()}`,
    time: startTime,
    endTime: addMinutesToTime(startTime, duration),
    type: 'buffer',
    source: 'system',
    priority: 'low',
    title: needsTravel ? '🚶 Travel Time' : '⏱️ Transition Time',
    item: {
      id: 'buffer',
      title: needsTravel ? `Travel from ${fromLocation} to ${toLocation}` : 'Session Transition',
      description: needsTravel
        ? `Allow time to walk between venues`
        : 'Brief transition between sessions'
    }
  };
}

/**
 * Detect if a session is primarily a networking event
 */
export function isNetworkingEvent(session: Session): boolean {
  const networkingIndicators = [
    'networking', 'reception', 'mixer', 'social hour',
    'meet and greet', 'cocktail', 'happy hour', 'roundtable',
    'birds of a feather', 'bof', 'meetup', 'mingle'
  ];

  const title = session.title.toLowerCase();
  const desc = (session.description || '').toLowerCase();

  return networkingIndicators.some(indicator =>
    title.includes(indicator) || desc.includes(indicator)
  );
}

/**
 * Enhanced meal break with networking consideration
 */
export function createEnhancedMealBreak(
  mealType: 'breakfast' | 'lunch' | 'dinner',
  date: string,
  options: AgendaOptions
): ScheduleItem {
  const mealTimes = {
    breakfast: { start: '7:30 AM', end: '8:30 AM', title: '🥐 Breakfast & Morning Networking' },
    lunch: { start: '12:00 PM', end: '1:00 PM', title: '🥗 Lunch & Midday Connections' },
    dinner: { start: '6:00 PM', end: '7:30 PM', title: '🍽️ Dinner & Evening Networking' }
  };

  const meal = mealTimes[mealType];
  const networkingPriority = options.networkingPriority || 'medium';

  let description = `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} break`;
  if (networkingPriority === 'high') {
    description += ' - Great opportunity to connect with other attendees';
  } else if (networkingPriority === 'low') {
    description += ' - Quiet time to recharge and prepare for afternoon sessions';
  } else {
    description += ' - Balance of dining and optional networking';
  }

  return {
    id: `meal-${mealType}-${date}`,
    time: meal.start,
    endTime: meal.end,
    type: 'meal',
    source: 'system',
    priority: 'high',
    title: meal.title,
    networkingScore: networkingPriority === 'high' ? 80 : 40,
    energyLevel: 'recovery',
    item: {
      id: mealType,
      title: meal.title,
      description,
      location: 'Conference Dining Area'
    }
  };
}

/**
 * Score a session based on multiple intelligent factors
 */
export function calculateIntelligentSessionScore(
  session: Session,
  userProfile: any,
  currentSchedule: ScheduleItem[],
  timeSlot: string,
  options: AgendaOptions
): number {
  let score = 0;

  // Base relevance to user interests (30%)
  const relevanceScore = calculateSessionRelevance(session, userProfile);
  score += relevanceScore * 0.3;

  // Energy fit for time slot (20%)
  const cognitiveLoad = calculateCognitiveLoad(session);
  const optimalEnergy = getOptimalEnergyForTimeSlot(timeSlot, options.energyProfile);
  const energyFit = calculateEnergyFit(cognitiveLoad, optimalEnergy);
  score += energyFit * 0.2;

  // Networking value (15%)
  const networkingScore = calculateNetworkingScore(session, userProfile);
  score += (networkingScore / 100) * 0.15 * 100;

  // Topic coherence with current schedule (15%)
  const coherenceScore = calculateTopicCoherence(session, currentSchedule);
  score += coherenceScore * 0.15;

  // Uniqueness factor (10%)
  const uniqueness = calculateUniqueness(session);
  score += uniqueness * 0.1;

  // Format preference (10%)
  if (options.sessionFormats) {
    const formatScore = calculateFormatPreference(session, options.sessionFormats);
    score += formatScore * 0.1;
  }

  return Math.min(100, Math.max(0, score));
}

// Helper functions

function getMinutesBetween(time1: string, time2: string): number {
  const [h1, m1] = time1.split(':').map(s => parseInt(s));
  const [h2, m2] = time2.split(':').map(s => parseInt(s));
  const isPM1 = time1.includes('PM');
  const isPM2 = time2.includes('PM');

  const hour1 = isPM1 && h1 !== 12 ? h1 + 12 : h1;
  const hour2 = isPM2 && h2 !== 12 ? h2 + 12 : h2;

  return (hour2 * 60 + m2) - (hour1 * 60 + m1);
}

function addMinutesToTime(time: string, minutes: number): string {
  const [hourStr, rest] = time.split(':');
  const [minStr, period] = rest.split(' ');
  let hour = parseInt(hourStr);
  let min = parseInt(minStr);
  const isPM = period === 'PM';

  if (isPM && hour !== 12) hour += 12;

  min += minutes;
  hour += Math.floor(min / 60);
  min = min % 60;

  const newPeriod = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;

  return `${displayHour}:${min.toString().padStart(2, '0')} ${newPeriod}`;
}

function calculateSessionRelevance(session: Session, userProfile: any): number {
  let score = 50; // Base score

  // Check interests match
  if (userProfile.interests && userProfile.interests.length > 0) {
    const sessionText = `${session.title} ${session.description || ''} ${session.track || ''}`.toLowerCase();
    userProfile.interests.forEach((interest: string) => {
      if (sessionText.includes(interest.toLowerCase())) {
        score += 10;
      }
    });
  }

  // Check track preferences
  if (userProfile.preferredTracks?.includes(session.track)) {
    score += 20;
  }

  return Math.min(100, score);
}

function calculateEnergyFit(cognitiveLoad: number, optimalEnergy: string): number {
  const energyMap = { 'high': 100, 'medium': 60, 'low': 30 };
  const optimalLoad = energyMap[optimalEnergy];

  // Perfect match
  if (Math.abs(cognitiveLoad - optimalLoad) < 20) return 100;

  // Good match
  if (Math.abs(cognitiveLoad - optimalLoad) < 40) return 70;

  // Acceptable
  if (Math.abs(cognitiveLoad - optimalLoad) < 60) return 40;

  // Poor match
  return 20;
}

function calculateTopicCoherence(session: Session, currentSchedule: ScheduleItem[]): number {
  if (currentSchedule.length === 0) return 70; // Neutral for first session

  // Get recent topics from schedule
  const recentTopics = currentSchedule
    .slice(-3) // Last 3 items
    .filter(item => item.type === 'session')
    .map(item => item.item.track)
    .filter(Boolean);

  if (recentTopics.length === 0) return 70;

  // Check if session continues the theme
  if (recentTopics.includes(session.track)) return 90;

  // Check for related tracks (simplified)
  const relatedTracks: Record<string, string[]> = {
    'AI': ['Data', 'Analytics', 'Automation'],
    'Claims': ['Underwriting', 'Risk', 'Operations'],
    'Digital': ['Innovation', 'Technology', 'Transformation']
  };

  for (const [track, related] of Object.entries(relatedTracks)) {
    if (recentTopics.includes(track) && related.includes(session.track || '')) {
      return 75;
    }
  }

  // Topic switch penalty
  return 40;
}

function calculateUniqueness(session: Session): number {
  let score = 50;

  // Keynotes are unique
  if (session.title.toLowerCase().includes('keynote')) score += 30;

  // Special events
  const specialKeywords = ['exclusive', 'special', 'limited', 'vip', 'invitation'];
  const text = `${session.title} ${session.description || ''}`.toLowerCase();
  specialKeywords.forEach(keyword => {
    if (text.includes(keyword)) score += 15;
  });

  return Math.min(100, score);
}

function calculateFormatPreference(session: Session, formats: any): number {
  const sessionFormat = session.track?.toLowerCase() || '';
  const title = session.title.toLowerCase();

  if (formats.keynote && title.includes('keynote')) return 100;
  if (formats.panel && (title.includes('panel') || sessionFormat.includes('panel'))) return 100;
  if (formats.workshop && (title.includes('workshop') || title.includes('hands-on'))) return 100;
  if (formats.networking && isNetworkingEvent(session)) return 100;

  return 50; // Neutral if no preference match
}

export {
  getMinutesBetween,
  addMinutesToTime,
  calculateSessionRelevance,
  calculateEnergyFit,
  calculateTopicCoherence,
  calculateUniqueness,
  calculateFormatPreference
};