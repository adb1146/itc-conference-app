/**
 * PS Advisory Response Filter
 * Ensures PS Advisory content is never presented as conference sessions
 */

/**
 * Filter out any PS Advisory "sessions" from search results
 * These are not real conference sessions and should never be shown
 */
export function filterOutPSAdvisoryFakeSessions(sessions: any[]): any[] {
  if (!sessions || sessions.length === 0) return sessions;

  // Keywords that indicate fake PS Advisory content
  const psAdvisoryIndicators = [
    'PS Advisory Leadership Team',
    'PS Advisory Company Facts',
    'Nancy Paul - Senior Delivery Manager',
    'Andrew Bartels - Founder',
    'PS Advisory Conference Presence',
    'People NOT Affiliated',
    'PS Advisory Services',
    'PS Advisory Facts',
    'PS Advisory - Technology Consulting',
    'PS Advisory Information',
    'PS Advisory - Deep Insurance',
    'PS Advisory - Insurance-Focused',
    'PS Advisory - Certified Salesforce',
    'PS Advisory Headquarters',
    'PS Advisory Mission',
    'PS Advisory Story'
  ];

  // Filter out any sessions that are actually PS Advisory knowledge base content
  return sessions.filter(session => {
    const title = session.title?.toLowerCase() || '';
    const track = session.track?.toLowerCase() || '';
    const location = session.location?.toLowerCase() || '';

    // Check if this is PS Advisory content masquerading as a session
    const isPSAdvisoryContent =
      psAdvisoryIndicators.some(indicator =>
        title.includes(indicator.toLowerCase())
      ) ||
      track.includes('ps advisory') ||
      location.includes('psadvisory.com') ||
      session.isPSAdvisoryContent === true ||
      session.sessionType === 'PSADVISORY' ||
      session.sessionType === 'PSADVISORY_FACTS';

    // Return false to filter out PS Advisory content
    return !isPSAdvisoryContent;
  });
}

/**
 * Clean up response text that incorrectly lists PS Advisory as sessions
 */
export function cleanPSAdvisoryFromResponse(response: string): string {
  // Remove any numbered lists that include PS Advisory as sessions
  const lines = response.split('\n');
  const cleanedLines: string[] = [];
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lowerLine = line.toLowerCase();

    // Skip lines that mention PS Advisory as sessions
    if (lowerLine.includes('[1] ps advisory') ||
        lowerLine.includes('[2] ps advisory') ||
        lowerLine.includes('[3] ps advisory') ||
        lowerLine.includes('ps advisory leadership team') ||
        lowerLine.includes('ps advisory company facts')) {
      skipNext = true;
      continue;
    }

    // Skip description lines after PS Advisory mentions
    if (skipNext && (line.startsWith('   ') || line.trim() === '')) {
      skipNext = false;
      continue;
    }

    cleanedLines.push(line);
  }

  let cleaned = cleanedLines.join('\n');

  // If we removed everything, return a helpful message
  if (cleaned.trim().length < 50) {
    return `I can help you find relevant conference sessions at ITC Vegas 2025.

Please note: PS Advisory is the technology consulting firm that built this conference app. They do not have sessions or a booth at the conference.

What specific topics or sessions are you interested in learning about?`;
  }

  return cleaned;
}

/**
 * Check if a response incorrectly presents PS Advisory as conference content
 */
export function responseHasPSAdvisoryAsSession(response: string): boolean {
  const lowerResponse = response.toLowerCase();

  // Check for patterns that indicate PS Advisory is being presented as a session
  const problematicPatterns = [
    /\[[\d]+\]\s*ps advisory/i,  // [1] PS Advisory...
    /sessions?.*ps advisory leadership/i,
    /ps advisory.*session.*available/i,
    /relevant.*sessions.*ps advisory/i
  ];

  return problematicPatterns.some(pattern => pattern.test(response));
}