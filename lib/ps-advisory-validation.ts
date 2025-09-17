/**
 * PS Advisory Validation and Fact Checking
 * Prevents AI hallucination about PS Advisory team members and conference sessions
 */

import prisma from './db';

/**
 * PS Advisory team members and their actual roles
 * This is the source of truth for PS Advisory personnel
 */
export const PS_ADVISORY_TEAM = {
  'Andrew Bartels': {
    role: 'Founder & CEO',
    isFounder: true,
    speaksAtConference: false,
    attendingConference: true
  },
  'Nancy Paul': {
    role: 'Senior Delivery Manager',
    isFounder: false,
    speaksAtConference: false,
    attendingConference: true,
    availableForMeetings: true
  },
  'Hitesh Malhotra': {
    role: 'CTO',
    isFounder: false,
    speaksAtConference: false,
    attendingConference: false
  },
  'Tom King': {
    role: 'Senior Insurance Consultant',
    isFounder: false,
    speaksAtConference: false,
    attendingConference: true
  },
  'Judd Lehmkuhl': {
    role: 'Solution Architect',
    isFounder: false,
    speaksAtConference: false,
    attendingConference: false
  },
  'Prateek Shukla': {
    role: 'Solution Architect',
    isFounder: false,
    speaksAtConference: false,
    attendingConference: false
  }
};

/**
 * Validate if a person is actually speaking at a specific session
 * @param speakerName - Name of the person to check
 * @param sessionTitle - Title of the session
 * @returns true if the person is actually speaking at that session
 */
export async function validateSpeakerAtSession(
  speakerName: string,
  sessionTitle: string
): Promise<boolean> {
  try {
    // Check if this is a PS Advisory team member
    const psAdvisoryMember = Object.keys(PS_ADVISORY_TEAM).find(
      name => name.toLowerCase() === speakerName.toLowerCase()
    );

    // PS Advisory team members are NOT speaking at ITC Vegas sessions
    if (psAdvisoryMember) {
      return false;
    }

    // Look up the actual session and its speakers
    const session = await prisma.session.findFirst({
      where: {
        title: {
          contains: sessionTitle,
          mode: 'insensitive'
        }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    if (!session) {
      return false;
    }

    // Check if the speaker is actually associated with this session
    const isActualSpeaker = session.speakers.some(
      s => s.speaker.name.toLowerCase() === speakerName.toLowerCase()
    );

    return isActualSpeaker;
  } catch (error) {
    console.error('Error validating speaker:', error);
    return false;
  }
}

/**
 * Get accurate information about a PS Advisory team member
 * @param name - Name of the team member
 * @returns Accurate role and status information
 */
export function getPSAdvisoryMemberInfo(name: string): {
  role: string;
  isFounder: boolean;
  speaksAtConference: boolean;
} | null {
  const member = PS_ADVISORY_TEAM[name as keyof typeof PS_ADVISORY_TEAM];
  if (!member) {
    // Try case-insensitive match
    const key = Object.keys(PS_ADVISORY_TEAM).find(
      k => k.toLowerCase() === name.toLowerCase()
    ) as keyof typeof PS_ADVISORY_TEAM | undefined;
    return key ? PS_ADVISORY_TEAM[key] : null;
  }
  return member;
}

/**
 * Fact-check a statement about PS Advisory
 * @param statement - Statement to check
 * @returns Corrected statement if needed, or null if accurate
 */
export function factCheckPSAdvisory(statement: string): string | null {
  const lowerStatement = statement.toLowerCase();

  // Check for incorrect founder attribution
  if (lowerStatement.includes('nancy paul') &&
      (lowerStatement.includes('founder') || lowerStatement.includes('founded') || lowerStatement.includes('ceo'))) {
    return 'Andrew Bartels is the Founder & CEO of PS Advisory. Nancy Paul is the Senior Delivery Manager.';
  }

  // Check for incorrect session speaker attribution
  if (lowerStatement.includes('nancy paul') &&
      (lowerStatement.includes('speaking at') || lowerStatement.includes('panel') ||
       lowerStatement.includes('session') || lowerStatement.includes('stage'))) {
    return 'Nancy Paul is not speaking at ITC Vegas 2025 sessions, but she IS attending the conference. She is PS Advisory\'s Senior Delivery Manager and is available for meetings throughout the conference. You can meet with Nancy Paul in person at ITC Vegas or email contactus@psadvisory.com.';
  }

  // Check for any PS Advisory member incorrectly associated with conference sessions
  for (const name of Object.keys(PS_ADVISORY_TEAM)) {
    if (lowerStatement.includes(name.toLowerCase()) &&
        (lowerStatement.includes('speaking at') || lowerStatement.includes('presenting'))) {
      return `${name} from PS Advisory is not speaking at ITC Vegas 2025. PS Advisory is the technology partner behind this conference app.`;
    }
  }

  return null; // Statement appears accurate
}

/**
 * Get the actual speakers for a session
 * @param sessionTitle - Title or partial title of the session
 * @returns Array of actual speaker names and companies
 */
export async function getActualSessionSpeakers(sessionTitle: string): Promise<{
  name: string;
  company: string;
}[]> {
  try {
    const session = await prisma.session.findFirst({
      where: {
        title: {
          contains: sessionTitle,
          mode: 'insensitive'
        }
      },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });

    if (!session) {
      return [];
    }

    return session.speakers.map(s => ({
      name: s.speaker.name,
      company: s.speaker.company || 'Unknown'
    }));
  } catch (error) {
    console.error('Error getting session speakers:', error);
    return [];
  }
}

/**
 * Validate response before sending to ensure accuracy about PS Advisory
 * @param response - The response text to validate
 * @returns Validated and corrected response
 */
export async function validatePSAdvisoryResponse(response: string): Promise<string> {
  const lowerResponse = response.toLowerCase();

  // Check for multiple issues
  const hasNancyFounderIssue = lowerResponse.includes('nancy paul') &&
    (lowerResponse.includes('founder') || lowerResponse.includes('ceo'));

  const hasNancySpeakingIssue = lowerResponse.includes('nancy paul') &&
    (lowerResponse.includes('speaking') || lowerResponse.includes('panel') ||
     lowerResponse.includes('session') || lowerResponse.includes('presenting'));

  const hasPSBoothIssue = lowerResponse.includes('ps advisory') &&
    (lowerResponse.includes('booth') || lowerResponse.includes('innovation hall'));

  const hasAgimIssue = lowerResponse.includes('agim emruli') &&
    lowerResponse.includes('ps advisory');

  // If ANY issues detected, replace entire response with accurate information
  if (hasNancyFounderIssue || hasNancySpeakingIssue || hasPSBoothIssue || hasAgimIssue) {
    console.warn('[PS Advisory Validation] Major hallucination detected. Replacing entire response.');

    // Return completely corrected response
    return `I need to provide you with accurate information about Nancy Paul and PS Advisory:

**About Nancy Paul:**
Nancy Paul is the Senior Delivery Manager at PS Advisory (NOT the founder). She has 17 years of project management experience and specializes in helping insurance clients achieve real ROI through strategic implementations.

**About PS Advisory:**
• **Founder:** Andrew Bartels (NOT Nancy Paul)
• **What they do:** Insurance technology consulting specializing in Salesforce
• **Conference role:** Built this conference app as a technology demonstration
• **Team attending ITC Vegas 2025:**
  - Andrew Bartels (Founder & CEO) - ATTENDING
  - Nancy Paul (Senior Delivery Manager) - ATTENDING & available for meetings
  - Tom King (Senior Insurance Consultant) - ATTENDING
• **Booth:** PS Advisory does NOT have a booth at ITC Vegas
• **Speaking sessions:** PS Advisory team members are NOT speaking at conference sessions

**Important clarifications:**
• Agim Emruli is NOT affiliated with PS Advisory
• Conference sessions are presented by their listed speakers, not PS Advisory team members
• You can contact PS Advisory through their website at psadvisory.com

Would you like to know more about:
• PS Advisory's Salesforce consulting services
• The actual conference sessions and speakers
• How to connect with PS Advisory digitally?`;
  }

  // Additional check for "tell me about Nancy Paul" type queries
  if (lowerResponse.includes('nancy paul') && lowerResponse.includes('relevant conference sessions')) {
    console.warn('[PS Advisory Validation] Detected incorrect session recommendations for Nancy Paul');

    return `**About Nancy Paul:**

Nancy Paul is the Senior Delivery Manager at PS Advisory, the technology consulting firm that built this conference app. She has 17 years of project management experience and helps insurance clients achieve real ROI.

**Important:** While Nancy Paul is NOT speaking at any ITC Vegas 2025 sessions and PS Advisory does not have a booth, Nancy IS attending the conference and is available for in-person meetings throughout the event.

**About PS Advisory:**
• Founded by Andrew Bartels (NOT Nancy Paul)
• Provides Salesforce consulting for insurance companies
• Built this conference app as a demonstration
• Team members ARE attending ITC Vegas 2025
• Nancy Paul is available for meetings at the conference
• Contact: Email contactus@psadvisory.com or meet Nancy Paul in person at ITC Vegas

Would you like to:
• Learn about actual conference sessions and speakers?
• Understand PS Advisory's consulting services?
• Find sessions related to insurance technology topics?`;
  }

  return response;
}