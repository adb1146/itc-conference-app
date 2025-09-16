/**
 * Agenda Service
 * Handles personalized agenda building and scheduling
 */

import { Session } from '@/domain/interfaces/IRepository';
import { SearchService } from './SearchService';

export interface AgendaRequest {
  userId?: string;
  interests?: string[];
  days?: string[];
  tracks?: string[];
  preferredFormat?: 'compact' | 'detailed' | 'timeline';
  avoidConflicts?: boolean;
}

export interface AgendaItem {
  session: Session;
  startTime: Date;
  endTime: Date;
  priority: 'must-attend' | 'recommended' | 'optional';
  conflicts?: Session[];
  reason?: string;
}

export interface PersonalizedAgenda {
  userId?: string;
  items: AgendaItem[];
  totalSessions: number;
  conflicts: number;
  coverage: {
    interests: string[];
    tracks: string[];
    days: string[];
  };
  recommendations: string[];
}

export class AgendaService {
  constructor(private searchService: SearchService) {}

  /**
   * Build a personalized agenda based on user preferences
   */
  async buildAgenda(request: AgendaRequest): Promise<PersonalizedAgenda> {
    console.log('[AgendaService] Building personalized agenda', request);
    
    // 1. Find relevant sessions based on interests
    const relevantSessions = await this.findRelevantSessions(request);
    
    // 2. Score and prioritize sessions
    const scoredSessions = this.scoreSessions(relevantSessions, request);
    
    // 3. Resolve scheduling conflicts
    const schedule = this.buildOptimalSchedule(scoredSessions, request);
    
    // 4. Generate recommendations
    const recommendations = this.generateRecommendations(schedule, request);
    
    // 5. Format the agenda
    return this.formatAgenda(schedule, request, recommendations);
  }

  /**
   * Find sessions relevant to user interests
   */
  private async findRelevantSessions(request: AgendaRequest): Promise<Session[]> {
    const searchPromises = [];
    
    // Search for each interest
    if (request.interests && request.interests.length > 0) {
      for (const interest of request.interests) {
        searchPromises.push(
          this.searchService.search({
            query: interest,
            type: 'hybrid',
            limit: 30
          })
        );
      }
    } else {
      // No specific interests, get popular sessions
      searchPromises.push(
        this.searchService.search({
          query: 'keynote innovation AI digital',
          type: 'hybrid',
          limit: 50
        })
      );
    }
    
    // Execute searches in parallel
    const searchResults = await Promise.all(searchPromises);
    
    // Merge and deduplicate results
    const sessionMap = new Map<string, Session>();
    for (const result of searchResults) {
      for (const session of result.sessions) {
        if (!sessionMap.has(session.id)) {
          sessionMap.set(session.id, session);
        }
      }
    }
    
    return Array.from(sessionMap.values());
  }

  /**
   * Score sessions based on relevance to user preferences
   */
  private scoreSessions(sessions: Session[], request: AgendaRequest): Array<{
    session: Session;
    score: number;
    matchedInterests: string[];
  }> {
    return sessions.map(session => {
      let score = 0;
      const matchedInterests: string[] = [];
      
      // Score based on interest matches
      if (request.interests) {
        for (const interest of request.interests) {
          const interestLower = interest.toLowerCase();
          
          // Check title match (highest weight)
          if (session.title.toLowerCase().includes(interestLower)) {
            score += 3;
            matchedInterests.push(interest);
          }
          
          // Check description match (medium weight)
          if (session.description?.toLowerCase().includes(interestLower)) {
            score += 2;
            if (!matchedInterests.includes(interest)) {
              matchedInterests.push(interest);
            }
          }
          
          // Check tags match (lower weight)
          if (session.tags?.some(tag => tag.toLowerCase().includes(interestLower))) {
            score += 1;
            if (!matchedInterests.includes(interest)) {
              matchedInterests.push(interest);
            }
          }
        }
      }
      
      // Bonus for preferred tracks
      if (request.tracks && session.track && request.tracks.includes(session.track)) {
        score += 2;
      }
      
      // Penalty for sessions outside preferred days
      if (request.days && session.startTime) {
        const sessionDay = new Date(session.startTime).toLocaleDateString('en-US', { weekday: 'long' });
        if (!request.days.includes(sessionDay)) {
          score -= 5;
        }
      }
      
      return { session, score, matchedInterests };
    })
    .filter(item => item.score > 0) // Only keep relevant sessions
    .sort((a, b) => b.score - a.score); // Sort by score descending
  }

  /**
   * Build optimal schedule avoiding conflicts
   */
  private buildOptimalSchedule(
    scoredSessions: Array<{ session: Session; score: number; matchedInterests: string[] }>,
    request: AgendaRequest
  ): AgendaItem[] {
    const schedule: AgendaItem[] = [];
    const scheduledTimes = new Map<string, AgendaItem>();
    
    for (const { session, score, matchedInterests } of scoredSessions) {
      if (!session.startTime || !session.endTime) continue;
      
      const timeSlot = this.getTimeSlot(session.startTime, session.endTime);
      const existingItem = scheduledTimes.get(timeSlot);
      
      // Determine priority based on score
      const priority: 'must-attend' | 'recommended' | 'optional' = 
        score >= 7 ? 'must-attend' :
        score >= 4 ? 'recommended' : 
        'optional';
      
      const newItem: AgendaItem = {
        session,
        startTime: new Date(session.startTime),
        endTime: new Date(session.endTime),
        priority,
        reason: matchedInterests.length > 0 
          ? `Matches your interests: ${matchedInterests.join(', ')}` 
          : undefined
      };
      
      if (existingItem && request.avoidConflicts) {
        // Handle conflict
        if (score > this.getItemScore(existingItem)) {
          // Replace with higher priority session
          existingItem.conflicts = existingItem.conflicts || [];
          existingItem.conflicts.push(existingItem.session);
          schedule[schedule.indexOf(existingItem)] = newItem;
          scheduledTimes.set(timeSlot, newItem);
        } else {
          // Keep existing, note conflict
          existingItem.conflicts = existingItem.conflicts || [];
          existingItem.conflicts.push(session);
        }
      } else if (!existingItem) {
        // No conflict, add to schedule
        schedule.push(newItem);
        scheduledTimes.set(timeSlot, newItem);
      }
      
      // Limit agenda size
      if (schedule.length >= 20) break;
    }
    
    // Sort by time
    return schedule.sort((a, b) => 
      a.startTime.getTime() - b.startTime.getTime()
    );
  }

  /**
   * Generate recommendations based on the agenda
   */
  private generateRecommendations(
    schedule: AgendaItem[],
    request: AgendaRequest
  ): string[] {
    const recommendations: string[] = [];
    
    // Check for gaps in schedule
    const hasLunchBreak = this.hasBreakPeriod(schedule, 12, 14);
    if (!hasLunchBreak && schedule.length > 4) {
      recommendations.push('Consider taking a lunch break between 12-2 PM');
    }
    
    // Check for back-to-back high priority sessions
    const consecutiveHighPriority = this.countConsecutiveHighPriority(schedule);
    if (consecutiveHighPriority >= 3) {
      recommendations.push('You have multiple must-attend sessions back-to-back. Consider scheduling breaks.');
    }
    
    // Check interest coverage
    if (request.interests) {
      const coveredInterests = new Set<string>();
      schedule.forEach(item => {
        const reason = item.reason || '';
        request.interests!.forEach(interest => {
          if (reason.toLowerCase().includes(interest.toLowerCase())) {
            coveredInterests.add(interest);
          }
        });
      });
      
      const uncoveredInterests = request.interests.filter(i => !coveredInterests.has(i));
      if (uncoveredInterests.length > 0) {
        recommendations.push(`No sessions found for: ${uncoveredInterests.join(', ')}`);
      }
    }
    
    // Networking recommendation
    if (schedule.length < 10) {
      recommendations.push('You have a lighter schedule - great opportunity for networking!');
    }
    
    return recommendations;
  }

  /**
   * Format the final agenda
   */
  private formatAgenda(
    schedule: AgendaItem[],
    request: AgendaRequest,
    recommendations: string[]
  ): PersonalizedAgenda {
    // Extract coverage information
    const coveredInterests = new Set<string>();
    const coveredTracks = new Set<string>();
    const coveredDays = new Set<string>();
    
    let conflictCount = 0;
    
    schedule.forEach(item => {
      // Count conflicts
      if (item.conflicts && item.conflicts.length > 0) {
        conflictCount += item.conflicts.length;
      }
      
      // Track coverage
      if (item.session.track) {
        coveredTracks.add(item.session.track);
      }
      
      if (item.startTime) {
        const day = new Date(item.startTime).toLocaleDateString('en-US', { weekday: 'long' });
        coveredDays.add(day);
      }
      
      if (item.reason) {
        const interests = item.reason.match(/Matches your interests: (.+)/)?.[1]?.split(', ') || [];
        interests.forEach(i => coveredInterests.add(i));
      }
    });
    
    return {
      userId: request.userId,
      items: schedule,
      totalSessions: schedule.length,
      conflicts: conflictCount,
      coverage: {
        interests: Array.from(coveredInterests),
        tracks: Array.from(coveredTracks),
        days: Array.from(coveredDays)
      },
      recommendations
    };
  }

  /**
   * Helper: Get time slot key for conflict detection
   */
  private getTimeSlot(startTime: Date | string, endTime: Date | string): string {
    const start = new Date(startTime);
    const end = new Date(endTime);
    return `${start.toISOString()}-${end.toISOString()}`;
  }

  /**
   * Helper: Get score for an agenda item
   */
  private getItemScore(item: AgendaItem): number {
    switch (item.priority) {
      case 'must-attend': return 10;
      case 'recommended': return 5;
      case 'optional': return 1;
      default: return 0;
    }
  }

  /**
   * Helper: Check if schedule has break period
   */
  private hasBreakPeriod(schedule: AgendaItem[], startHour: number, endHour: number): boolean {
    for (let i = 0; i < schedule.length - 1; i++) {
      const gap = schedule[i + 1].startTime.getTime() - schedule[i].endTime.getTime();
      const gapHours = gap / (1000 * 60 * 60);
      
      if (gapHours >= 1) {
        const gapStartHour = schedule[i].endTime.getHours();
        if (gapStartHour >= startHour && gapStartHour < endHour) {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Helper: Count consecutive high-priority sessions
   */
  private countConsecutiveHighPriority(schedule: AgendaItem[]): number {
    let maxConsecutive = 0;
    let currentConsecutive = 0;
    
    for (const item of schedule) {
      if (item.priority === 'must-attend') {
        currentConsecutive++;
        maxConsecutive = Math.max(maxConsecutive, currentConsecutive);
      } else {
        currentConsecutive = 0;
      }
    }
    
    return maxConsecutive;
  }
}