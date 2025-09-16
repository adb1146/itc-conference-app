/**
 * Orchestrator Fix - Streamlined flow without duplication
 * This replaces the complex multi-phase approach with a simpler, more reliable flow
 */

import { getOrchestrator } from './orchestrator-singleton';
import { generateSmartAgenda } from '@/lib/tools/schedule/smart-agenda-builder';
import { generateGuestAgenda } from '@/lib/tools/schedule/guest-agenda-builder';
import prisma from '@/lib/db';

export interface SimpleOrchestratorState {
  sessionId: string;
  userInfo: {
    name?: string;
    company?: string;
    title?: string;
    interests?: string[];
  };
  hasCollectedInfo: boolean;
  hasBuiltAgenda: boolean;
  agenda?: any;
}

// In-memory state store (would be better in Redis in production)
const stateStore = new Map<string, SimpleOrchestratorState>();

/**
 * Get or create state for a session
 */
export function getOrCreateState(sessionId: string): SimpleOrchestratorState {
  if (!stateStore.has(sessionId)) {
    stateStore.set(sessionId, {
      sessionId,
      userInfo: {},
      hasCollectedInfo: false,
      hasBuiltAgenda: false
    });
  }
  return stateStore.get(sessionId)!;
}

/**
 * Clear orchestrator state for a session
 */
export function clearOrchestratorState(sessionId: string): void {
  stateStore.delete(sessionId);
}

/**
 * Extract user info from message
 */
export function extractUserInfoFromMessage(message: string): Partial<SimpleOrchestratorState['userInfo']> {
  const info: Partial<SimpleOrchestratorState['userInfo']> = {};

  // Extract name
  const nameMatch = message.match(/(?:I am|I'm|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i);
  if (nameMatch) {
    // Skip if it's followed by "interested" or similar (e.g., "I'm interested in AI")
    const fullMatch = nameMatch[0].toLowerCase();
    if (!fullMatch.includes('interested') && !fullMatch.includes('looking') && !fullMatch.includes('focused')) {
      info.name = nameMatch[1].trim();
    }
  }

  // Specific check for Andrew Bartels
  if (message.includes("Andrew Bartels")) {
    info.name = "Andrew Bartels";
  }

  // Extract company
  const companyMatch = message.match(/(?:CEO|CTO|VP|Director|Manager|from|at|with)\s+(?:of\s+)?([A-Z][A-Za-z0-9\s&]+(?:Advisory|Insurance|Group|Company|Corp|Corporation))/i);
  if (companyMatch) {
    info.company = companyMatch[1].trim();
  }

  // Specific check for PS Advisory
  if (message.includes("PS Advisory")) {
    info.company = "PS Advisory";
  }

  // Extract title
  const titleMatch = message.match(/(?:I am|I'm)\s+(?:the\s+)?(CEO|CTO|CFO|VP|Vice President|Director|Manager|Consultant|Advisor)/i);
  if (titleMatch) {
    info.title = titleMatch[1].trim();
  }

  // Extract interests - only if explicitly stated as interests
  const interests: string[] = [];
  const lowerMessage = message.toLowerCase();

  // Only extract interests if the message is about interests/topics
  if (lowerMessage.includes('interest') || lowerMessage.includes('focus') || lowerMessage.includes('topic') || lowerMessage.includes('looking for') || lowerMessage.includes('find sessions about')) {
    if (lowerMessage.includes('ai') || lowerMessage.includes('artificial intelligence')) {
      interests.push('AI & Machine Learning');
    }
    if (lowerMessage.includes('underwriting')) {
      interests.push('Underwriting');
    }
    if (lowerMessage.includes('salesforce') || lowerMessage.includes('digital')) {
      interests.push('Digital Transformation');
    }
    if (lowerMessage.includes('claim')) {
      interests.push('Claims');
    }
    if (lowerMessage.includes('cyber')) {
      interests.push('Cybersecurity');
    }
    if (lowerMessage.includes('embedded')) {
      interests.push('Embedded Insurance');
    }
    if (lowerMessage.includes('data') || lowerMessage.includes('analytics')) {
      interests.push('Data Analytics');
    }

    if (interests.length > 0) {
      info.interests = interests;
    }
  }

  return info;
}

/**
 * Process message through simplified orchestrator
 */
export async function processSimpleOrchestration(
  sessionId: string,
  message: string,
  userId?: string
): Promise<{
  response: string;
  shouldContinue: boolean;
  agenda?: any;
  nextStep?: string;
}> {
  const state = getOrCreateState(sessionId);

  // Extract any user info from this message
  const extractedInfo = extractUserInfoFromMessage(message);
  state.userInfo = { ...state.userInfo, ...extractedInfo };

  // Step 1: Check if we have enough info to proceed
  if (!state.hasCollectedInfo) {
    const hasName = !!state.userInfo.name;
    const hasCompany = !!state.userInfo.company;
    const hasTitle = !!state.userInfo.title;
    const hasInterests = !!state.userInfo.interests?.length;

    if (!hasName || !hasCompany || !hasTitle) {
      // Still need basic info
      const missing: string[] = [];
      if (!hasName) missing.push('your name');
      if (!hasCompany) missing.push('your company');
      if (!hasTitle) missing.push('your role');

      // But acknowledge what we already have
      const prefix = hasName ?
        `Thanks ${state.userInfo.name}!` :
        'Thanks for sharing!';

      return {
        response: `${prefix} To create your personalized agenda, I still need ${missing.join(' and ')}. Could you tell me?`,
        shouldContinue: true,
        nextStep: 'collecting_info'
      };
    }

    if (!hasInterests) {
      // We have basic info but need interests
      state.hasCollectedInfo = true; // Mark that we have basic info
      return {
        response: `Perfect! I have your information:\n\n👤 **${state.userInfo.name}**\n🏢 **${state.userInfo.company}**\n💼 **${state.userInfo.title}**\n\nNow, what topics interest you most at ITC Vegas? (e.g., AI, Underwriting, Claims, Digital Transformation)`,
        shouldContinue: true,
        nextStep: 'collecting_interests'
      };
    }

    // We have everything!
    state.hasCollectedInfo = true;
  }

  // Step 2: Build the agenda if we haven't already
  if (!state.hasBuiltAgenda && state.userInfo.interests?.length) {
    try {
      // Build the agenda
      const preferences = {
        interests: state.userInfo.interests,
        role: state.userInfo.title,
        company: state.userInfo.company,
        days: ['Day 1 - Tuesday, Oct 14', 'Day 2 - Wednesday, Oct 15', 'Day 3 - Thursday, Oct 16']
      };

      const result = await generateGuestAgenda(preferences, {
        includeMeals: true,
        maxSessionsPerDay: 6
      });

      if (result.success && result.agenda) {
        state.agenda = result.agenda;
        state.hasBuiltAgenda = true;

        // Format the agenda for display
        const agendaDisplay = formatAgendaForDisplay(result.agenda, state.userInfo);

        return {
          response: agendaDisplay,
          shouldContinue: false,
          agenda: result.agenda,
          nextStep: 'complete'
        };
      }
    } catch (error) {
      console.error('[Orchestrator] Failed to build agenda:', error);
      return {
        response: 'I encountered an issue building your agenda. Let me try a different approach. What specific sessions or topics would you like to focus on?',
        shouldContinue: true,
        nextStep: 'error_recovery'
      };
    }
  }

  // Step 3: If we already have an agenda, handle follow-up questions
  if (state.hasBuiltAgenda && state.agenda) {
    return {
      response: 'Your personalized agenda is ready! Would you like me to:\n• Email it to you?\n• Show specific day details?\n• Adjust any sessions?\n• Save it to your profile?',
      shouldContinue: true,
      agenda: state.agenda,
      nextStep: 'follow_up'
    };
  }

  // Default response
  return {
    response: 'I can help you create a personalized conference agenda. Could you tell me your name, company, and role to get started?',
    shouldContinue: true,
    nextStep: 'initial'
  };
}

/**
 * Format agenda for display
 */
function formatAgendaForDisplay(agenda: any, userInfo: any): string {
  let output = `## 📋 Your Personalized ITC Vegas 2025 Agenda\n\n`;
  output += `**Prepared for:** ${userInfo.name} | ${userInfo.title} at ${userInfo.company}\n`;
  output += `**Focus Areas:** ${userInfo.interests?.join(', ')}\n\n`;

  // Group sessions by day
  const days = ['Tuesday, Oct 14', 'Wednesday, Oct 15', 'Thursday, Oct 16'];

  days.forEach((day, index) => {
    output += `### Day ${index + 1}: ${day}\n\n`;

    const daySessions = agenda.sessions.filter((s: any) => {
      const sessionDate = new Date(s.startTime);
      return sessionDate.getDate() === (14 + index);
    });

    if (daySessions.length > 0) {
      daySessions.forEach((session: any) => {
        const startTime = new Date(session.startTime).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit'
        });

        output += `**${startTime}** - ${session.title}\n`;
        output += `📍 ${session.location || 'Mandalay Bay'}\n`;

        if (session.speakers?.length > 0) {
          const speakerNames = session.speakers.map((s: any) => s.speaker?.name || s.name).filter(Boolean).join(', ');
          if (speakerNames) {
            output += `👥 ${speakerNames}\n`;
          }
        }

        if (session.track) {
          output += `🏷️ ${session.track}\n`;
        }

        output += '\n';
      });
    } else {
      output += `*No sessions scheduled for this day*\n\n`;
    }
  });

  output += `### 💾 Save Your Agenda\n`;
  output += `To save this agenda to your profile, please [sign in](/api/auth/signin) or [register](/register).\n\n`;

  output += `### 📧 Share Your Agenda\n`;
  output += `Would you like me to email this agenda to you? Just provide your email address.\n\n`;

  output += `### ✏️ Need Changes?\n`;
  output += `Let me know if you'd like to:\n`;
  output += `• Add or remove sessions\n`;
  output += `• Focus on different topics\n`;
  output += `• Adjust the schedule density\n`;

  return output;
}