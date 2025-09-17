/**
 * PS Advisory Team Member Link Formatter
 * Automatically detects PS Advisory team member names in text and converts them to clickable links
 */

// PS Advisory team members with their speaker IDs
export const PS_ADVISORY_SPEAKER_IDS = {
  'Andrew Bartels': 'cmfobe84k0000jyiq2insuqgc',
  'Nancy Paul': 'cmfobe84r0001jyiq78m8nhzi',
  'Tom King': 'cmfobe84t0002jyiqnhlytzpl'
};

/**
 * Formats PS Advisory team member names as clickable links in markdown
 * @param text - The text to format
 * @returns Text with PS Advisory names formatted as links
 */
export function formatPSAdvisoryLinks(text: string): string {
  let formattedText = text;

  // Replace each team member's name with a markdown link
  Object.entries(PS_ADVISORY_SPEAKER_IDS).forEach(([name, speakerId]) => {
    // Create regex to match the name (case insensitive, word boundaries)
    const regex = new RegExp(`\\b${name}\\b`, 'gi');

    // Replace with markdown link format
    formattedText = formattedText.replace(regex, (match) => {
      // Preserve the original casing
      return `[${match}](/speakers/${speakerId})`;
    });
  });

  return formattedText;
}

/**
 * Checks if text contains PS Advisory team member names
 * @param text - The text to check
 * @returns True if any PS Advisory team member names are found
 */
export function containsPSAdvisoryMembers(text: string): boolean {
  const lowerText = text.toLowerCase();
  return Object.keys(PS_ADVISORY_SPEAKER_IDS).some(name =>
    lowerText.includes(name.toLowerCase())
  );
}

/**
 * Get speaker ID for a PS Advisory team member
 * @param name - The name to look up
 * @returns Speaker ID or null if not found
 */
export function getPSAdvisorySpeakerId(name: string): string | null {
  // Try exact match first
  if (PS_ADVISORY_SPEAKER_IDS[name]) {
    return PS_ADVISORY_SPEAKER_IDS[name];
  }

  // Try case-insensitive match
  const normalizedName = name.trim();
  const entry = Object.entries(PS_ADVISORY_SPEAKER_IDS).find(
    ([key]) => key.toLowerCase() === normalizedName.toLowerCase()
  );

  return entry ? entry[1] : null;
}

/**
 * Format a response with PS Advisory member links
 * Also handles related speaker names if they're in the database
 */
export function formatResponseWithSpeakerLinks(
  text: string,
  additionalSpeakers?: { name: string; id: string }[]
): string {
  // First format PS Advisory team members
  let formattedText = formatPSAdvisoryLinks(text);

  // Then format any additional speakers passed in
  if (additionalSpeakers && additionalSpeakers.length > 0) {
    additionalSpeakers.forEach(({ name, id }) => {
      // Skip if it's already a PS Advisory member (avoid double-linking)
      if (!PS_ADVISORY_SPEAKER_IDS[name]) {
        const regex = new RegExp(`\\b${name}\\b`, 'g');
        formattedText = formattedText.replace(regex, `[${name}](/speakers/${id})`);
      }
    });
  }

  return formattedText;
}