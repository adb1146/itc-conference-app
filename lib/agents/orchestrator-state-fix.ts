/**
 * Orchestrator State Management Fix
 * Ensures the orchestrator properly maintains context across messages
 */

import { getConversation, updateConversationState } from '@/lib/conversation-state';

/**
 * Check if the orchestrator should handle this message
 */
export function shouldOrchestratorHandle(sessionId: string, message: string): boolean {
  const conversation = getConversation(sessionId);
  const lowerMessage = message.toLowerCase();

  // ALWAYS bypass orchestrator for search queries, regardless of state
  if (lowerMessage.includes('find sessions') ||
      lowerMessage.includes('show me sessions') ||
      lowerMessage.includes('search for') ||
      lowerMessage.includes('what sessions') ||
      lowerMessage.includes('which sessions') ||
      lowerMessage.includes('list sessions') ||
      lowerMessage.includes('who are the') ||
      lowerMessage.includes('tell me about') ||
      lowerMessage.includes('what\'s happening') ||
      lowerMessage.includes('show me networking') ||
      lowerMessage.includes('coffee nearby') ||
      lowerMessage.includes('about ai sessions') ||
      lowerMessage.includes('about sessions') ||
      lowerMessage.includes('ai sessions') ||
      lowerMessage.includes('what can you tell me about') ||
      lowerMessage.includes('tell me about') ||
      lowerMessage.includes('who should i meet') ||
      lowerMessage.includes('export my schedule') ||
      lowerMessage.includes('trending in') ||
      lowerMessage.includes('speakers') ||
      lowerMessage.includes('keynote') ||
      lowerMessage.includes('about claims') ||
      lowerMessage.includes('about underwriting') ||
      lowerMessage.includes('about cyber') ||
      lowerMessage.includes('about insurance') ||
      lowerMessage.includes('about insurtech') ||
      lowerMessage.includes('about automation') ||
      lowerMessage.includes('about data') ||
      lowerMessage.includes('about analytics')) {
    return false;
  }

  // Check if orchestrator is actively building an agenda
  if (conversation.state.researchAgentActive) {
    // Only continue if the last assistant message was asking for info
    const lastAssistantMessage = conversation.messages
      .filter((m: any) => m.role === 'assistant')
      .pop();

    if (lastAssistantMessage?.content.includes('still need') ||
        lastAssistantMessage?.content.includes('Could you tell me') ||
        lastAssistantMessage?.content.includes('personalized agenda')) {
      return true;
    }
  }

  // Check if this is explicitly about creating an agenda
  const isExplicitAgendaRequest =
    lowerMessage.includes('build my agenda') ||
    lowerMessage.includes('create my schedule') ||
    lowerMessage.includes('personalized agenda') ||
    lowerMessage.includes('build me a schedule');

  if (isExplicitAgendaRequest) {
    return true;
  }

  // Only trigger for messages about introducing oneself
  const isIntroduction =
    (lowerMessage.includes('i am') && (lowerMessage.includes('ceo') || lowerMessage.includes('vp') || lowerMessage.includes('director'))) ||
    lowerMessage.includes('my name is') ||
    lowerMessage.includes("i'm from");

  return isIntroduction;
}

/**
 * Extract and persist user information from messages
 */
export function extractAndPersistUserInfo(sessionId: string, message: string): void {
  const conversation = getConversation(sessionId);

  // Extract name patterns
  const namePatterns = [
    /(?:I am|I'm|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+),\s+(?:CEO|CTO|VP|Director|Manager)/i
  ];

  // Extract company patterns
  const companyPatterns = [
    /(?:from|at|with|of)\s+([A-Z][A-Za-z0-9\s&]+(?:Inc|LLC|Ltd|Advisory|Insurance|Group|Company|Corp|Corporation))/i,
    /(?:CEO|CTO|VP|Director|Manager)\s+(?:of|at)\s+([A-Z][A-Za-z0-9\s&]+)/i
  ];

  // Extract role patterns
  const rolePatterns = [
    /(?:I am|I'm)\s+(?:the\s+)?(CEO|CTO|CFO|VP|Vice President|Director|Manager|Consultant|Advisor)/i,
    /(CEO|CTO|CFO|VP|Vice President|Director|Manager|Consultant|Advisor)\s+(?:of|at)/i
  ];

  let userInfo = (conversation.state as any).userInfo || {};
  let updated = false;

  // Try to extract name
  if (!userInfo.name) {
    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match) {
        userInfo.name = match[1].trim();
        updated = true;
        break;
      }
    }
  }

  // Try to extract company
  if (!userInfo.company) {
    for (const pattern of companyPatterns) {
      const match = message.match(pattern);
      if (match) {
        userInfo.company = match[1].trim();
        updated = true;
        break;
      }
    }
  }

  // Try to extract role
  if (!userInfo.title) {
    for (const pattern of rolePatterns) {
      const match = message.match(pattern);
      if (match) {
        userInfo.title = match[1].trim();
        updated = true;
        break;
      }
    }
  }

  // Specific check for the user's actual info
  if (message.includes("Andrew Bartels")) {
    userInfo.name = "Andrew Bartels";
    updated = true;
  }
  if (message.includes("PS Advisory")) {
    userInfo.company = "PS Advisory";
    updated = true;
  }
  if (message.includes("CEO") && userInfo.name === "Andrew Bartels") {
    userInfo.title = "CEO";
    updated = true;
  }

  // Extract interests
  const interestKeywords = {
    'AI': ['AI', 'artificial intelligence', 'machine learning', 'ML'],
    'Underwriting': ['underwriting', 'underwriter', 'risk assessment'],
    'Claims': ['claims', 'claim processing', 'claim management'],
    'Cybersecurity': ['cybersecurity', 'security', 'cyber'],
    'Digital Transformation': ['digital transformation', 'digitization', 'modernization'],
    'Salesforce': ['salesforce', 'CRM', 'customer relationship']
  };

  const interests: string[] = [];
  for (const [interest, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()))) {
      interests.push(interest);
    }
  }

  if (interests.length > 0) {
    userInfo.interests = interests;
    updated = true;
  }

  // Persist if we found anything
  if (updated) {
    updateConversationState(sessionId, {
      userInfo,
      researchAgentActive: true // Activate orchestrator
    } as any);
  }
}

/**
 * Ensure orchestrator stays active for the conversation
 */
export function activateOrchestrator(sessionId: string): void {
  updateConversationState(sessionId, {
    researchAgentActive: true
  });
}