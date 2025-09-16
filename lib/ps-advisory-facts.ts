/**
 * PS Advisory Facts - Source of Truth
 * CRITICAL: These are the ONLY facts about PS Advisory that should be shared
 */

export const PS_ADVISORY_FACTS = {
  // Company Facts
  company: {
    name: 'PS Advisory',
    founder: 'Andrew Bartels', // NOT Nancy Paul
    foundedBy: 'Andrew Bartels is the Founder and CEO',
    description: 'Insurance technology consulting firm specializing in Salesforce solutions',
    headquarters: 'Baltimore, Maryland',
    website: 'psadvisory.com',
    role: 'Technology partner that built this conference app'
  },

  // Team Members - Their ACTUAL roles
  team: {
    'Andrew Bartels': {
      title: 'Founder & CEO',
      isFounder: true,
      speaksAtITC: false
    },
    'Nancy Paul': {
      title: 'Senior Delivery Manager', // NOT founder, NOT CEO
      isFounder: false,
      speaksAtITC: false,
      description: '17 years of project management experience, helps insurance clients achieve ROI'
    },
    'Hitesh Malhotra': {
      title: 'CTO',
      isFounder: false,
      speaksAtITC: false
    },
    'Tom King': {
      title: 'Director of Strategy',
      isFounder: false,
      speaksAtITC: false
    },
    'Judd Lehmkuhl': {
      title: 'Solution Architect',
      isFounder: false,
      speaksAtITC: false
    },
    'Prateek Shukla': {
      title: 'Solution Architect',
      isFounder: false,
      speaksAtITC: false
    }
  },

  // What PS Advisory DOES NOT have at ITC Vegas
  doesNotHave: [
    'PS Advisory does NOT have a booth at ITC Vegas',
    'PS Advisory team members are NOT speaking at any conference sessions',
    'PS Advisory is NOT presenting at any panels',
    'PS Advisory is NOT hosting any events at the conference',
    'PS Advisory is NOT in the Innovation Hall',
    'PS Advisory does NOT have a physical presence at the conference'
  ],

  // What PS Advisory ACTUALLY does
  actualRole: [
    'PS Advisory built this conference app as a demonstration',
    'PS Advisory is a technology consulting firm, not a conference participant',
    'PS Advisory provides Salesforce solutions for insurance companies',
    'PS Advisory team members can be contacted through their website, not at the conference'
  ],

  // People who are NOT affiliated with PS Advisory
  notAffiliated: [
    'Agim Emruli - NOT affiliated with PS Advisory',
    'Clive Thompson - NOT affiliated with PS Advisory',
    'Conference speakers are NOT PS Advisory employees unless explicitly stated'
  ],

  // Contact Information
  contact: {
    website: 'psadvisory.com',
    email: 'contactus@psadvisory.com',
    phone: '443-424-2857',
    calendly: 'https://calendly.com/npaul-psadvisory/connection',
    note: 'Contact is through digital channels, NOT at a conference booth'
  }
};

/**
 * Get strict facts about PS Advisory to prevent hallucination
 */
export function getPSAdvisoryStrictFacts(): string {
  return `
CRITICAL PS ADVISORY FACTS (DO NOT DEVIATE FROM THESE):

1. FOUNDER: Andrew Bartels is the Founder & CEO (NOT Nancy Paul)
2. NANCY PAUL: Senior Delivery Manager (NOT founder, NOT CEO)
3. CONFERENCE PRESENCE: PS Advisory has NO booth, NO speaking sessions, NO physical presence at ITC Vegas
4. ROLE: PS Advisory built this app as a technology demonstration
5. TEAM: No PS Advisory team members are speaking at the conference
6. AGIM EMRULI: NOT affiliated with PS Advisory in any way

PS Advisory is the technology consulting firm that created this app, but they are NOT exhibiting or speaking at the conference.`;
}

/**
 * Check if a statement about PS Advisory is factually correct
 */
export function isPSAdvisoryFactCorrect(statement: string): {
  isCorrect: boolean;
  correction?: string;
} {
  const lower = statement.toLowerCase();

  // Check for founder mistakes
  if (lower.includes('nancy paul') && (lower.includes('founder') || lower.includes('ceo'))) {
    return {
      isCorrect: false,
      correction: 'Andrew Bartels is the Founder & CEO. Nancy Paul is the Senior Delivery Manager.'
    };
  }

  // Check for booth claims
  if (lower.includes('ps advisory') && (lower.includes('booth') || lower.includes('exhibit'))) {
    return {
      isCorrect: false,
      correction: 'PS Advisory does NOT have a booth at ITC Vegas. They are the technology partner that built this app.'
    };
  }

  // Check for speaking claims
  if ((lower.includes('nancy paul') || lower.includes('ps advisory')) &&
      (lower.includes('speaking') || lower.includes('presenting') || lower.includes('panel'))) {
    return {
      isCorrect: false,
      correction: 'PS Advisory team members are NOT speaking at ITC Vegas. They built this conference app.'
    };
  }

  // Check for Agim Emruli association
  if (lower.includes('agim emruli') && lower.includes('ps advisory')) {
    return {
      isCorrect: false,
      correction: 'Agim Emruli is NOT affiliated with PS Advisory.'
    };
  }

  return { isCorrect: true };
}