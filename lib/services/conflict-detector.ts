import { Session } from '@prisma/client';
import { AgendaItem } from '@/types/agenda';

export interface TimeSlot {
  start: Date;
  end: Date;
  sessionId?: string;
  title?: string;
}

export interface ConflictDetails {
  sessionId: string;
  sessionTitle: string;
  conflictsWith: {
    sessionId: string;
    sessionTitle: string;
    overlapMinutes: number;
  }[];
  severity: 'high' | 'medium' | 'low';
  suggestedAction?: string;
}

export interface ConflictCheckResult {
  hasConflicts: boolean;
  conflicts: ConflictDetails[];
  totalConflicts: number;
}

/**
 * Detect time conflicts between a new session and existing agenda items
 */
export function detectConflictsWithAgenda(
  newSession: Session,
  agendaItems: AgendaItem[]
): ConflictCheckResult {
  const conflicts: ConflictDetails[] = [];

  if (!newSession.startTime || !newSession.endTime) {
    return { hasConflicts: false, conflicts: [], totalConflicts: 0 };
  }

  const newStart = new Date(newSession.startTime);
  const newEnd = new Date(newSession.endTime);

  // Check each day's schedule
  for (const item of agendaItems) {
    if (item.type !== 'session' || !item.startTime || !item.endTime) {
      continue;
    }
    // Don't skip if IDs match - we want to detect when the same session is in both lists

    const itemStart = new Date(item.startTime);
    const itemEnd = new Date(item.endTime);

    // Check for overlap
    const hasOverlap = checkTimeOverlap(
      { start: newStart, end: newEnd },
      { start: itemStart, end: itemEnd }
    );

    if (hasOverlap) {
      const overlapMinutes = calculateOverlapMinutes(
        { start: newStart, end: newEnd },
        { start: itemStart, end: itemEnd }
      );

      // Find or create conflict details for this session
      let conflictDetail = conflicts.find(c => c.sessionId === newSession.id);
      if (!conflictDetail) {
        conflictDetail = {
          sessionId: newSession.id,
          sessionTitle: newSession.title,
          conflictsWith: [],
          severity: 'low',
          suggestedAction: undefined
        };
        conflicts.push(conflictDetail);
      }

      conflictDetail.conflictsWith.push({
        sessionId: item.id,
        sessionTitle: item.title,
        overlapMinutes
      });
    }
  }

  // Calculate severity and suggestions for each conflict
  for (const conflict of conflicts) {
    const maxOverlap = Math.max(...conflict.conflictsWith.map(c => c.overlapMinutes));

    if (maxOverlap >= 60) {
      conflict.severity = 'high';
      conflict.suggestedAction = 'This session completely overlaps with your agenda. Consider choosing one or the other.';
    } else if (maxOverlap >= 30) {
      conflict.severity = 'medium';
      conflict.suggestedAction = 'Significant overlap detected. You may need to leave one session early.';
    } else {
      conflict.severity = 'low';
      conflict.suggestedAction = 'Minor overlap. You might miss the beginning or end of a session.';
    }
  }

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
    totalConflicts: conflicts.reduce((sum, c) => sum + c.conflictsWith.length, 0)
  };
}

/**
 * Check if two time slots overlap
 */
export function checkTimeOverlap(slot1: TimeSlot, slot2: TimeSlot): boolean {
  return slot1.start < slot2.end && slot2.start < slot1.end;
}

/**
 * Calculate the number of minutes two time slots overlap
 */
export function calculateOverlapMinutes(slot1: TimeSlot, slot2: TimeSlot): number {
  if (!checkTimeOverlap(slot1, slot2)) {
    return 0;
  }

  const overlapStart = new Date(Math.max(slot1.start.getTime(), slot2.start.getTime()));
  const overlapEnd = new Date(Math.min(slot1.end.getTime(), slot2.end.getTime()));

  return Math.floor((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60));
}

/**
 * Get conflict details for a specific session
 */
export function getConflictDetails(
  sessionId: string,
  conflicts: ConflictDetails[]
): ConflictDetails | undefined {
  return conflicts.find(c => c.sessionId === sessionId);
}

/**
 * Convert Smart Agenda data structure to flat agenda items for conflict checking
 * This extracts just the session IDs, which we'll use to fetch full session data
 */
export async function flattenSmartAgenda(agendaData: any, prisma: any): Promise<AgendaItem[]> {
  const items: AgendaItem[] = [];
  const sessionIds: string[] = [];

  if (!agendaData?.days || !Array.isArray(agendaData.days)) {
    return items;
  }

  // First, collect all session IDs from the agenda
  for (const day of agendaData.days) {
    if (!day.schedule || !Array.isArray(day.schedule)) {
      continue;
    }

    for (const scheduleItem of day.schedule) {
      // Skip non-session items
      if (scheduleItem.type !== 'session') {
        continue;
      }

      // Extract session ID from nested 'item' property
      const sessionData = scheduleItem.item;
      if (sessionData && sessionData.id) {
        sessionIds.push(sessionData.id);
      }
    }
  }

  // If we have session IDs, fetch their full data from the database
  if (sessionIds.length > 0 && prisma) {
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: sessionIds }
      }
    });

    // Convert database sessions to agenda items
    for (const session of sessions) {
      if (session.startTime && session.endTime) {
        items.push({
          id: session.id,
          type: 'session',
          title: session.title || '',
          startTime: session.startTime,
          endTime: session.endTime,
          dayNumber: 1, // We'll need to determine this from the date
          location: session.location,
          track: session.track,
          format: session.format,
          description: session.description
        });
      }
    }
  }

  return items;
}

/**
 * Check if adding a session would create conflicts
 */
export async function checkSessionConflicts(
  session: Session,
  userAgenda: any,
  prisma: any
): Promise<ConflictCheckResult> {
  const agendaItems = await flattenSmartAgenda(userAgenda, prisma);
  return detectConflictsWithAgenda(session, agendaItems);
}

/**
 * Group conflicts by time slot for better visualization
 */
export function groupConflictsByTimeSlot(conflicts: ConflictDetails[]): Map<string, ConflictDetails[]> {
  const grouped = new Map<string, ConflictDetails[]>();

  for (const conflict of conflicts) {
    // Create a time slot key (you could customize this based on your needs)
    const timeKey = `${conflict.sessionId}`;

    if (!grouped.has(timeKey)) {
      grouped.set(timeKey, []);
    }

    grouped.get(timeKey)!.push(conflict);
  }

  return grouped;
}

/**
 * Suggest alternative sessions that don't conflict
 */
export function suggestAlternatives(
  conflictingSession: Session,
  allSessions: Session[],
  agendaItems: AgendaItem[]
): Session[] {
  const alternatives: Session[] = [];

  // Find sessions with similar topics/tracks that don't conflict
  for (const session of allSessions) {
    if (session.id === conflictingSession.id) continue;

    // Check if this session has similar content (you can customize this logic)
    const hasSimilarContent =
      session.track === conflictingSession.track ||
      session.format === conflictingSession.format ||
      (session.tags && conflictingSession.tags &&
        session.tags.some((tag: string) => conflictingSession.tags?.includes(tag)));

    if (hasSimilarContent) {
      const conflicts = detectConflictsWithAgenda(session, agendaItems);
      if (!conflicts.hasConflicts) {
        alternatives.push(session);
      }
    }
  }

  return alternatives.slice(0, 3); // Return top 3 alternatives
}