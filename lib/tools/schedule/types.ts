// Types for the Smart Agenda Builder Tool

export interface AgendaOptions {
  includeMeals: boolean;
  maxSessionsPerDay: number;
  preferredTracks: string[];
  avoidTracks: string[];
  startTime: string; // "8:00 AM"
  endTime: string;   // "6:00 PM"
  minimumBreakMinutes: number;
  maximumWalkingMinutes: number;
}

export interface ScheduleItem {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  location: string;
  type: 'session' | 'meal' | 'break' | 'travel';
  source: 'user-favorite' | 'ai-suggested' | 'system';
  confidence: number;
  track?: string;
  speakers?: Array<{
    id: string;
    name: string;
    title?: string;
  }>;

  // The actual content - optional for backward compatibility
  item?: any;

  // AI metadata for suggested items
  aiMetadata?: {
    score?: number;
    reasoning?: string;
    confidence?: number;
    matchScore?: number;
    similarityToFavorites?: number;
    method?: 'vector-similarity' | 'keyword-match' | 'track-based';
  };
}

export interface AlternativeSession {
  id: string;
  title: string;
  confidence: number;
  reasoning: string;
}

export interface DaySchedule {
  date: string;
  dayNumber: number;
  schedule: ScheduleItem[];
  stats: {
    totalSessions: number;
    favoritesCovered: number;
    aiSuggestions: number;
    walkingMinutes: number;
    breakMinutes: number;
    mealsCovered: boolean;
  };
}

export interface SmartAgenda {
  userId: string;
  generatedAt: Date;
  days: DaySchedule[];

  // Overall metrics
  metrics: {
    totalFavorites: number;
    favoritesIncluded: number;
    aiSuggestionsAdded: number;
    conflictsResolved: number;
    overallConfidence: number;
    profileCompleteness?: number;
  };

  // Issues and suggestions
  conflicts: ConflictInfo[];
  suggestions: string[];
  warnings: string[];

  // AI reasoning and coaching
  aiReasoning?: Array<{
    stage: string;
    thought: string;
    analysis: string;
    decision: string;
    confidence: number;
  }>;
  profileCoaching?: string[];
  usingAI?: boolean;
}

export interface ConflictInfo {
  type: 'time-overlap' | 'venue-distance' | 'meal-conflict';
  sessionIds: string[];
  description: string;
  resolution?: string;
  alternatives?: AlternativeSession[];
}

export interface VenueDistance {
  from: string;
  to: string;
  walkingMinutes: number;
  distance: 'same-room' | 'same-floor' | 'same-building' | 'different-building';
}

export interface MealBreak {
  id: string;
  type: 'breakfast' | 'lunch' | 'dinner' | 'coffee';
  title: string;
  startTime: string;
  endTime: string;
  location?: string;
  isNetworkingEvent?: boolean;
  relatedSessionId?: string; // If it's a meal session like "Breakfast & Bold Ideas"
}

export interface TimeSlot {
  startTime: Date;
  endTime: Date;
  available: boolean;
  reason?: string; // Why it's not available
}

export interface GenerationResult {
  success: boolean;
  agenda?: SmartAgenda;
  error?: string;
  requiresAuth?: boolean;
}