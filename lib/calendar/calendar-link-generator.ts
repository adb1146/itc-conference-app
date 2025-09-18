/**
 * Generate calendar links for session display in chat
 */

interface SessionInfo {
  title: string;
  date: string;
  time: string;
  location?: string;
  description?: string;
  speakers?: string[];
}

/**
 * Encode text for URL parameter
 */
function encodeParam(text: string): string {
  return encodeURIComponent(text);
}

/**
 * Generate calendar link URL for a session
 */
export function generateCalendarLink(session: SessionInfo): string {
  const params = new URLSearchParams();

  params.append('title', session.title);
  params.append('date', session.date);
  params.append('time', session.time);

  if (session.location) {
    params.append('location', session.location);
  }

  if (session.description) {
    params.append('description', session.description);
  }

  if (session.speakers && session.speakers.length > 0) {
    params.append('speakers', session.speakers.join(','));
  }

  return `/api/calendar/add?${params.toString()}`;
}

/**
 * Generate markdown link for adding to calendar
 */
export function generateCalendarMarkdownLink(session: SessionInfo): string {
  const url = generateCalendarLink(session);
  return `[📅 Add to Calendar](${url})`;
}

/**
 * Format a session with calendar link for chat display
 */
export function formatSessionWithCalendar(
  title: string,
  date: string,
  time: string,
  location?: string,
  description?: string,
  speakers?: string[]
): string {
  let formatted = `### ${title}\n`;
  formatted += `**📍 Location:** ${location || 'TBD'}\n`;
  formatted += `**🕒 Time:** ${date}, ${time}\n`;

  if (speakers && speakers.length > 0) {
    formatted += `**🎤 Speakers:** ${speakers.join(', ')}\n`;
  }

  if (description) {
    formatted += `**📝 Description:** ${description}\n`;
  }

  // Add calendar link
  const calendarLink = generateCalendarMarkdownLink({
    title,
    date,
    time,
    location,
    description,
    speakers
  });

  formatted += `\n${calendarLink}\n`;

  return formatted;
}

/**
 * Add calendar links to existing session text
 */
export function addCalendarLinksToSessions(text: string): string {
  // Pattern to match session blocks
  const sessionPattern = /### (.+?)\n(?:.*?\n)*?\*\*🕒 Time:\*\* (.+?), (.+?)\n/g;

  return text.replace(sessionPattern, (match, title, date, time) => {
    // Extract location if present
    const locationMatch = match.match(/\*\*📍 Location:\*\* (.+?)\n/);
    const location = locationMatch ? locationMatch[1] : undefined;

    // Generate calendar link
    const calendarLink = generateCalendarMarkdownLink({
      title: title.trim(),
      date: date.trim(),
      time: time.trim(),
      location
    });

    // Add calendar link after the session info
    return match + `${calendarLink}\n`;
  });
}

/**
 * Format multiple sessions with calendar links
 */
export function formatSessionList(sessions: SessionInfo[]): string {
  return sessions.map(session => formatSessionWithCalendar(
    session.title,
    session.date,
    session.time,
    session.location,
    session.description,
    session.speakers
  )).join('\n---\n\n');
}