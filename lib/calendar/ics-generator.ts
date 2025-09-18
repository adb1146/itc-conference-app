/**
 * Utility to generate iCalendar (.ics) files for adding sessions to calendar
 */

interface CalendarEvent {
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  organizer?: string;
  uid?: string;
}

/**
 * Format date for iCalendar format (YYYYMMDDTHHMMSSZ)
 */
function formatDate(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
}

/**
 * Escape text for iCalendar format
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '');
}

/**
 * Generate a unique identifier for the event
 */
function generateUID(): string {
  const timestamp = new Date().getTime();
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}@itc.psadvisory.com`;
}

/**
 * Generate iCalendar content for a session
 */
export function generateICS(event: CalendarEvent): string {
  const uid = event.uid || generateUID();
  const timestamp = formatDate(new Date());

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//PS Advisory//ITC Conference App//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${timestamp}`,
    `DTSTART:${formatDate(event.startTime)}`,
    `DTEND:${formatDate(event.endTime)}`,
    `SUMMARY:${escapeText(event.title)}`,
  ];

  if (event.description) {
    // Wrap description at 75 characters for iCal format
    const desc = escapeText(event.description);
    const wrapped = desc.match(/.{1,74}/g) || [desc];
    lines.push(`DESCRIPTION:${wrapped.join('\r\n ')}`);
  }

  if (event.location) {
    lines.push(`LOCATION:${escapeText(event.location)}`);
  }

  if (event.organizer) {
    lines.push(`ORGANIZER:CN=${escapeText(event.organizer)}:MAILTO:noreply@itc.psadvisory.com`);
  }

  // Add conference-specific properties
  lines.push('STATUS:CONFIRMED');
  lines.push('TRANSP:OPAQUE');
  lines.push('X-MICROSOFT-CDO-BUSYSTATUS:BUSY');
  lines.push('BEGIN:VALARM');
  lines.push('TRIGGER:-PT15M'); // 15 minute reminder
  lines.push('ACTION:DISPLAY');
  lines.push('DESCRIPTION:Reminder');
  lines.push('END:VALARM');
  lines.push('END:VEVENT');
  lines.push('END:VCALENDAR');

  return lines.join('\r\n');
}

/**
 * Parse session time string and date to create Date objects
 */
export function parseSessionTime(date: string, time: string): { start: Date; end: Date } {
  // Parse date (e.g., "Oct 14" or "October 14")
  const year = 2025;
  const months: { [key: string]: number } = {
    'jan': 0, 'january': 0,
    'feb': 1, 'february': 1,
    'mar': 2, 'march': 2,
    'apr': 3, 'april': 3,
    'may': 4,
    'jun': 5, 'june': 5,
    'jul': 6, 'july': 6,
    'aug': 7, 'august': 7,
    'sep': 8, 'september': 8,
    'oct': 9, 'october': 9,
    'nov': 10, 'november': 10,
    'dec': 11, 'december': 11
  };

  const dateMatch = date.toLowerCase().match(/(\w+)\s+(\d+)/);
  if (!dateMatch) {
    throw new Error(`Invalid date format: ${date}`);
  }

  const monthStr = dateMatch[1];
  const day = parseInt(dateMatch[2]);
  const month = months[monthStr.substring(0, 3)];

  if (month === undefined) {
    throw new Error(`Invalid month: ${monthStr}`);
  }

  // Parse time (e.g., "9:00 AM", "2:30 PM", "9:00 AM - 10:30 AM")
  const timeMatch = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)(?:\s*-\s*(\d{1,2}):(\d{2})\s*(AM|PM))?/i);
  if (!timeMatch) {
    throw new Error(`Invalid time format: ${time}`);
  }

  let startHour = parseInt(timeMatch[1]);
  const startMinute = parseInt(timeMatch[2]);
  const startPeriod = timeMatch[3].toUpperCase();

  // Convert to 24-hour format
  if (startPeriod === 'PM' && startHour !== 12) {
    startHour += 12;
  } else if (startPeriod === 'AM' && startHour === 12) {
    startHour = 0;
  }

  // Create start time (Las Vegas is UTC-7 in October)
  const startDate = new Date(Date.UTC(year, month, day, startHour + 7, startMinute));

  // Calculate end time
  let endDate: Date;
  if (timeMatch[4]) {
    // End time is explicitly specified
    let endHour = parseInt(timeMatch[4]);
    const endMinute = parseInt(timeMatch[5]);
    const endPeriod = timeMatch[6].toUpperCase();

    if (endPeriod === 'PM' && endHour !== 12) {
      endHour += 12;
    } else if (endPeriod === 'AM' && endHour === 12) {
      endHour = 0;
    }

    endDate = new Date(Date.UTC(year, month, day, endHour + 7, endMinute));
  } else {
    // Default to 1 hour duration if end time not specified
    endDate = new Date(startDate.getTime() + 60 * 60 * 1000);
  }

  return { start: startDate, end: endDate };
}

/**
 * Generate calendar event from session data
 */
export function createSessionCalendarEvent(
  title: string,
  date: string,
  time: string,
  location?: string,
  description?: string,
  speakers?: string[]
): CalendarEvent {
  const { start, end } = parseSessionTime(date, time);

  let fullDescription = description || '';
  if (speakers && speakers.length > 0) {
    fullDescription += `\n\nSpeakers: ${speakers.join(', ')}`;
  }
  fullDescription += '\n\nITC Vegas 2025 Conference';
  fullDescription += '\n\nThis calendar invite was generated by the PS Advisory AI Demo App';

  return {
    title: `ITC Vegas: ${title}`,
    description: fullDescription,
    location: location || 'Mandalay Bay, Las Vegas',
    startTime: start,
    endTime: end,
    organizer: 'ITC Vegas 2025'
  };
}