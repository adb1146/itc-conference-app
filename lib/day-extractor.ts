/**
 * Extract conference day from user query
 */

export interface DayInfo {
  dayRequested: string | null;
  dateFilter: string | null;
}

export function extractDayFromQuery(query: string): DayInfo {
  const lowerQuery = query.toLowerCase();

  // Conference dates mapping
  const dayMappings: Record<string, string> = {
    'monday': '2025-10-13',
    'tuesday': '2025-10-14',
    'wednesday': '2025-10-15',
    'thursday': '2025-10-16',
    'oct 13': '2025-10-13',
    'oct 14': '2025-10-14',
    'oct 15': '2025-10-15',
    'oct 16': '2025-10-16',
    'october 13': '2025-10-13',
    'october 14': '2025-10-14',
    'october 15': '2025-10-15',
    'october 16': '2025-10-16',
    '10/13': '2025-10-13',
    '10/14': '2025-10-14',
    '10/15': '2025-10-15',
    '10/16': '2025-10-16',
  };

  // Day names for response
  const dayNames: Record<string, string> = {
    '2025-10-13': 'Monday, Oct 13',
    '2025-10-14': 'Tuesday, Oct 14',
    '2025-10-15': 'Wednesday, Oct 15',
    '2025-10-16': 'Thursday, Oct 16',
  };

  // Check for day references
  for (const [pattern, date] of Object.entries(dayMappings)) {
    if (lowerQuery.includes(pattern)) {
      return {
        dayRequested: dayNames[date],
        dateFilter: date
      };
    }
  }

  // Check for relative day references
  const today = new Date().toISOString().split('T')[0];

  if (lowerQuery.includes('today')) {
    // For demo/testing, assume "today" means the first day of the conference
    return {
      dayRequested: 'Tuesday, Oct 14',
      dateFilter: '2025-10-14'
    };
  }

  if (lowerQuery.includes('tomorrow')) {
    // For demo/testing, assume "tomorrow" means the second day
    return {
      dayRequested: 'Wednesday, Oct 15',
      dateFilter: '2025-10-15'
    };
  }

  // Check for day-specific event references
  if (lowerQuery.includes('kickoff') || lowerQuery.includes('opening')) {
    return {
      dayRequested: 'Tuesday, Oct 14',
      dateFilter: '2025-10-14'
    };
  }

  if (lowerQuery.includes('closing') || lowerQuery.includes('goo goo dolls')) {
    return {
      dayRequested: 'Thursday, Oct 16',
      dateFilter: '2025-10-16'
    };
  }

  return {
    dayRequested: null,
    dateFilter: null
  };
}

/**
 * Filter sessions by date
 */
export function filterSessionsByDate(sessions: any[], dateFilter: string): any[] {
  return sessions.filter(session => {
    if (!session.startTime) return false;

    // Handle both metadata and direct session objects
    const startTime = session.metadata?.startTime || session.startTime;
    const sessionDate = typeof startTime === 'string'
      ? startTime.split('T')[0]
      : startTime.toISOString().split('T')[0];

    return sessionDate === dateFilter;
  });
}