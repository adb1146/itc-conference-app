/**
 * Valid Conference Tracks
 * This file contains the authoritative list of tracks at ITC Vegas 2025
 * IMPORTANT: AI systems should ONLY reference tracks from this list
 */

export const VALID_CONFERENCE_TRACKS = [
  "AI Track",
  "Agents",
  "Brokers",
  "Expo",
  "General",
  "Golf Tournament",
  "Keynote",
  "LATAM",
  "Masterclass",
  "Networking",
  "Summit",
  "WIISE"
] as const;

export type ConferenceTrack = typeof VALID_CONFERENCE_TRACKS[number];

/**
 * Track descriptions and AI guidance
 */
export const TRACK_DESCRIPTIONS = {
  "AI Track": "Artificial intelligence, machine learning, and AI applications in insurance",
  "Agents": "Agent-focused sessions, distribution strategies, and agent technology",
  "Brokers": "Broker-specific content, wholesale distribution, and broker platforms",
  "Expo": "Exhibition hall, vendor demonstrations, and technology showcases",
  "General": "General sessions applicable to all attendees",
  "Golf Tournament": "ITC Golf Tournament and related networking events",
  "Keynote": "Main stage keynote presentations and major announcements",
  "LATAM": "Latin America focused sessions and regional insurance topics",
  "Masterclass": "In-depth educational sessions and workshops",
  "Networking": "Networking events, social gatherings, and meetups",
  "Summit": "Executive summit sessions and leadership discussions",
  "WIISE": "Women in Insurance and InsurTech sessions and events"
};

/**
 * AI GUIDANCE FOR TRACK REFERENCES
 *
 * IMPORTANT RULES:
 * 1. ONLY use tracks from VALID_CONFERENCE_TRACKS list above
 * 2. AI-related sessions are in "AI Track"
 * 3. Distribution content is in "Agents" or "Brokers" tracks, NOT "Distribution Track"
 * 4. Never create compound track names or tracks that don't exist
 * 5. Always verify track names against VALID_CONFERENCE_TRACKS
 *
 * COMMON MISTAKES TO AVOID:
 * - "Distribution Track" - DOES NOT EXIST (use "Agents" or "Brokers")
 * - "Innovation Track" - DOES NOT EXIST (use "AI Track" for tech/innovation)
 * - "Technology Track" - DOES NOT EXIST (use "AI Track" for tech content)
 * - "Claims Track" - DOES NOT EXIST (sessions may be in "General" or other tracks)
 * - "Underwriting Track" - DOES NOT EXIST (sessions may be in "General" or other tracks)
 * - "Customer Experience Track" - DOES NOT EXIST
 * - "Strategy Track" - DOES NOT EXIST (use "Summit" for executive content)
 */

/**
 * Helper function to validate if a track name exists
 */
export function isValidTrack(trackName: string): boolean {
  return VALID_CONFERENCE_TRACKS.includes(trackName as ConferenceTrack);
}

/**
 * Helper function to find relevant tracks for a topic
 */
export function findRelevantTracks(topic: string): string[] {
  const topicLower = topic.toLowerCase();
  const relevantTracks: string[] = [];

  if (topicLower.includes('ai') || topicLower.includes('artificial intelligence') ||
      topicLower.includes('machine learning') || topicLower.includes('automation')) {
    relevantTracks.push('AI Track');
  }
  if (topicLower.includes('agent') || topicLower.includes('distribution') ||
      topicLower.includes('agency')) {
    relevantTracks.push('Agents');
  }
  if (topicLower.includes('broker') || topicLower.includes('wholesale') ||
      topicLower.includes('brokerage')) {
    relevantTracks.push('Brokers');
  }
  if (topicLower.includes('women') || topicLower.includes('diversity') ||
      topicLower.includes('inclusion')) {
    relevantTracks.push('WIISE');
  }
  if (topicLower.includes('latin') || topicLower.includes('latam') ||
      topicLower.includes('mexico') || topicLower.includes('brazil')) {
    relevantTracks.push('LATAM');
  }
  if (topicLower.includes('executive') || topicLower.includes('leadership') ||
      topicLower.includes('ceo') || topicLower.includes('strategy')) {
    relevantTracks.push('Summit');
  }
  if (topicLower.includes('education') || topicLower.includes('training') ||
      topicLower.includes('workshop') || topicLower.includes('masterclass')) {
    relevantTracks.push('Masterclass');
  }
  if (topicLower.includes('keynote') || topicLower.includes('main stage')) {
    relevantTracks.push('Keynote');
  }
  if (topicLower.includes('vendor') || topicLower.includes('exhibition') ||
      topicLower.includes('expo')) {
    relevantTracks.push('Expo');
  }

  // Default to General if no specific track found
  if (relevantTracks.length === 0) {
    relevantTracks.push('General');
  }

  return [...new Set(relevantTracks)]; // Remove duplicates
}