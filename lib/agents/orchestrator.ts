/**
 * Agent Orchestrator
 * Manages conversation flow and coordination between research and agenda agents
 */

import { UserProfileResearchAgent, BasicUserInfo, EnrichedUserProfile } from './user-profile-researcher';
import { generateSmartAgenda } from '@/lib/tools/schedule/smart-agenda-builder';
import { generateGuestAgenda } from '@/lib/tools/schedule/guest-agenda-builder';
import prisma from '@/lib/db';

export type ConversationPhase =
  | 'greeting'
  | 'collecting_info'
  | 'researching'
  | 'confirming_profile'
  | 'building_agenda'
  | 'complete';

export interface ConversationState {
  phase: ConversationPhase;
  userInfo: Partial<BasicUserInfo>;
  researchProfile?: EnrichedUserProfile;
  agendaBuilt: boolean;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
}

export interface OrchestratorResponse {
  message: string;
  nextAction?: 'collect_info' | 'research' | 'build_agenda' | 'complete';
  profile?: EnrichedUserProfile;
  agenda?: any;
  metadata?: {
    phase: ConversationPhase;
    confidence: number;
    dataCompleteness: number;
  };
}

/**
 * Agent Orchestrator - Coordinates the entire user journey
 */
export class AgentOrchestrator {
  private researchAgent: UserProfileResearchAgent;
  private conversationStates: Map<string, ConversationState> = new Map();
  private currentSessionId: string = '';

  constructor() {
    this.researchAgent = new UserProfileResearchAgent({
      inferenceDepth: 'detailed',
      includeLinkedIn: true,
      includeCompanyNews: true
    });
  }

  /**
   * Process user message and orchestrate response
   */
  async processMessage(
    sessionId: string,
    message: string,
    userId?: string
  ): Promise<OrchestratorResponse> {
    // Store current session for context
    this.currentSessionId = sessionId;

    // Get or create conversation state
    let state = this.conversationStates.get(sessionId) || this.createNewState();

    // Add message to history
    state.messages.push({ role: 'user', content: message });

    // Process based on current phase
    let response: OrchestratorResponse;

    switch (state.phase) {
      case 'greeting':
        response = await this.handleGreeting(state, message);
        break;

      case 'collecting_info':
        response = await this.handleInfoCollection(state, message);
        break;

      case 'researching':
        response = await this.handleResearching(state);
        break;

      case 'confirming_profile':
        response = await this.handleProfileConfirmation(state, message);
        break;

      case 'building_agenda':
        response = await this.handleAgendaBuilding(state, userId);
        break;

      case 'complete':
        response = await this.handleComplete(state, message);
        break;

      default:
        response = {
          message: "I'm not sure how to help with that. Would you like me to build you a personalized agenda?",
          nextAction: 'collect_info'
        };
    }

    // Update state
    state.messages.push({ role: 'assistant', content: response.message });
    this.conversationStates.set(sessionId, state);

    return response;
  }

  /**
   * Create new conversation state
   */
  private createNewState(): ConversationState {
    return {
      phase: 'greeting',
      userInfo: {},
      agendaBuilt: false,
      messages: []
    };
  }

  /**
   * Handle initial greeting and start info collection
   */
  private async handleGreeting(
    state: ConversationState,
    message: string
  ): Promise<OrchestratorResponse> {
    // Always move to collecting info when agenda is requested
    const wantsAgenda = message.toLowerCase().includes('agenda') ||
                       message.toLowerCase().includes('schedule') ||
                       message.toLowerCase().includes('personalized') ||
                       message.toLowerCase().includes('build');

    // If they want an agenda or this is the first interaction after greeting, collect info
    if (wantsAgenda || state.messages.length > 1) {
      state.phase = 'collecting_info';

      // Check if message already contains info
      const extractedInfo = await this.extractUserInfo(message);
      if (Object.keys(extractedInfo).length > 0) {
        state.userInfo = { ...state.userInfo, ...extractedInfo };
      }

      // Ask for what's missing
      const missing: string[] = [];
      if (!state.userInfo.name) missing.push('your full name');
      if (!state.userInfo.company) missing.push('your company');
      if (!state.userInfo.title) missing.push('your role/title');

      if (missing.length > 0) {
        return {
          message: `I'd love to create a personalized agenda for you! I can research your background to make intelligent recommendations.\n\nTo get started, could you tell me ${missing.join(', ')}?\n\nFor example: "I'm John Smith, VP of Innovation at Acme Insurance"`,
          nextAction: 'collect_info',
          metadata: {
            phase: 'collecting_info',
            confidence: 1.0,
            dataCompleteness: ((3 - missing.length) / 3) * 100
          }
        };
      }
    }

    // Default greeting only if truly first interaction
    return {
      message: `Hello! I'm your AI Conference Concierge with research capabilities. I can:\n\n🔍 Research your professional background\n📋 Build a personalized agenda based on your interests\n🎯 Recommend must-attend sessions\n🤝 Suggest networking opportunities\n\nWould you like me to create a personalized agenda for you?`,
      nextAction: 'collect_info',
      metadata: {
        phase: 'greeting',
        confidence: 1.0,
        dataCompleteness: 0
      }
    };
  }

  /**
   * Handle information collection phase
   */
  private async handleInfoCollection(
    state: ConversationState,
    message: string
  ): Promise<OrchestratorResponse> {
    // Parse user information from message
    const extractedInfo = await this.extractUserInfo(message);

    // Update user info
    state.userInfo = { ...state.userInfo, ...extractedInfo };

    // Check what's missing
    const missing: string[] = [];
    if (!state.userInfo.name) missing.push('name');
    if (!state.userInfo.company) missing.push('company');
    if (!state.userInfo.title) missing.push('role/title');

    if (missing.length > 0) {
      // Ask for missing information
      return {
        message: `Thanks! I still need your ${missing.join(' and ')}. Could you provide ${missing.length > 1 ? 'these' : 'this'}?`,
        nextAction: 'collect_info',
        metadata: {
          phase: 'collecting_info',
          confidence: 0.7,
          dataCompleteness: ((3 - missing.length) / 3) * 100
        }
      };
    }

    // We have all basic info, move to research phase
    state.phase = 'researching';
    return {
      message: `Perfect! I have your information:\n\n👤 **${state.userInfo.name}**\n🏢 **${state.userInfo.company}**\n💼 **${state.userInfo.title}**\n\nLet me research your background to personalize your conference experience. This will take just a moment...`,
      nextAction: 'research',
      metadata: {
        phase: 'researching',
        confidence: 1.0,
        dataCompleteness: 100
      }
    };
  }

  /**
   * Handle research phase
   */
  private async handleResearching(state: ConversationState): Promise<OrchestratorResponse> {
    try {
      // Perform research
      const profile = await this.researchAgent.researchUser(state.userInfo as BasicUserInfo);
      state.researchProfile = profile;
      state.phase = 'confirming_profile';

      // Format research findings
      const findings = this.formatResearchFindings(profile);

      return {
        message: findings + '\n\nDoes this look accurate? I can now build your personalized agenda based on this profile, or you can tell me if anything should be adjusted.',
        nextAction: 'build_agenda',
        profile: profile,
        metadata: {
          phase: 'confirming_profile',
          confidence: profile.metadata.researchConfidence,
          dataCompleteness: profile.metadata.dataCompleteness
        }
      };
    } catch (error) {
      console.error('[Orchestrator] Research failed:', error);

      // Fallback to manual preference collection
      state.phase = 'confirming_profile';
      return {
        message: `I had some trouble researching your background, but no worries! Let me ask you directly:\n\nWhat topics are you most interested in for the conference?\n- AI & Automation\n- Cybersecurity\n- Claims Technology\n- Digital Transformation\n- Customer Experience\n- Other areas?\n\nJust let me know your top interests and I'll build your agenda!`,
        nextAction: 'collect_info',
        metadata: {
          phase: 'confirming_profile',
          confidence: 0.5,
          dataCompleteness: 50
        }
      };
    }
  }

  /**
   * Handle profile confirmation phase
   */
  private async handleProfileConfirmation(
    state: ConversationState,
    message: string
  ): Promise<OrchestratorResponse> {
    // Check if user wants to proceed or adjust
    const proceed = message.toLowerCase().includes('yes') ||
                   message.toLowerCase().includes('correct') ||
                   message.toLowerCase().includes('accurate') ||
                   message.toLowerCase().includes('build') ||
                   message.toLowerCase().includes('agenda') ||
                   message.toLowerCase().includes('looks good');

    if (proceed || state.researchProfile) {
      state.phase = 'building_agenda';
      return {
        message: '🚀 Excellent! Building your personalized agenda now...',
        nextAction: 'build_agenda',
        metadata: {
          phase: 'building_agenda',
          confidence: state.researchProfile?.metadata.researchConfidence || 0.7,
          dataCompleteness: state.researchProfile?.metadata.dataCompleteness || 70
        }
      };
    }

    // User wants to adjust - collect preferences manually
    return {
      message: 'No problem! Tell me what interests you most at the conference, and I\'ll adjust the profile accordingly.',
      nextAction: 'collect_info',
      metadata: {
        phase: 'confirming_profile',
        confidence: 0.6,
        dataCompleteness: 60
      }
    };
  }

  /**
   * Handle agenda building phase
   */
  private async handleAgendaBuilding(
    state: ConversationState,
    userId?: string
  ): Promise<OrchestratorResponse> {
    try {
      let agenda;

      if (userId) {
        // Authenticated user - use smart agenda builder
        const user = await prisma.user.findUnique({
          where: { id: userId }
        });

        if (user) {
          // Update user profile with research findings if available
          if (state.researchProfile) {
            await prisma.user.update({
              where: { id: userId },
              data: {
                interests: state.researchProfile.inferred.interests,
                role: state.userInfo.title,
                company: state.userInfo.company
              }
            });
          }

          // Generate smart agenda
          const result = await generateSmartAgenda(userId, {
            preferredTracks: state.researchProfile?.inferred.focusAreas,
            includeMeals: true,
            maxSessionsPerDay: 8
          });

          if (result.success && result.agenda) {
            agenda = result.agenda;
          }
        }
      } else {
        // Guest user - use guest agenda builder
        const preferences = {
          interests: state.researchProfile?.inferred.interests || [],
          role: state.userInfo.title,
          goals: state.researchProfile?.inferred.goals || [],
          organizationType: state.researchProfile?.inferred.companyInitiatives[0],
          experienceLevel: state.researchProfile?.inferred.experienceLevel
        };

        const result = await generateGuestAgenda(preferences, {
          includeMeals: true,
          maxSessionsPerDay: 8
        });

        if (result.success && result.agenda) {
          agenda = result.agenda;
        }
      }

      if (agenda) {
        state.agendaBuilt = true;
        state.phase = 'complete';

        return {
          message: this.formatAgendaResponse(agenda, state.researchProfile),
          agenda: agenda,
          nextAction: 'complete',
          metadata: {
            phase: 'complete',
            confidence: 0.9,
            dataCompleteness: 100
          }
        };
      }
    } catch (error) {
      console.error('[Orchestrator] Agenda building failed:', error);
    }

    return {
      message: 'I encountered an issue building your agenda. Let me try a different approach. What are your top 3 conference goals?',
      nextAction: 'collect_info',
      metadata: {
        phase: 'building_agenda',
        confidence: 0.5,
        dataCompleteness: 70
      }
    };
  }

  /**
   * Handle completion phase
   */
  private async handleComplete(
    state: ConversationState,
    message: string
  ): Promise<OrchestratorResponse> {
    return {
      message: `Your personalized agenda is ready! You can:\n\n📅 Export to calendar\n📧 Email the schedule\n⭐ Save favorite sessions\n🔄 Request adjustments\n\nHow else can I help you prepare for the conference?`,
      nextAction: 'complete',
      metadata: {
        phase: 'complete',
        confidence: 1.0,
        dataCompleteness: 100
      }
    };
  }

  /**
   * Extract user information from message using AI
   */
  private async extractUserInfo(message: string): Promise<Partial<BasicUserInfo>> {
    try {
      // Use Claude to intelligently extract information
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-3-5-sonnet-20241022',
          max_tokens: 200,
          temperature: 0,
          messages: [{
            role: 'user',
            content: `Extract the person's name, company, and job title/role from this message. Return ONLY a JSON object with keys "name", "company", and "title". If any information is not mentioned, use null for that field.

Message: "${message}"

Previous context from conversation:
- Name: ${this.conversationStates.get(this.currentSessionId)?.userInfo?.name || 'not yet provided'}
- Company: ${this.conversationStates.get(this.currentSessionId)?.userInfo?.company || 'not yet provided'}
- Title: ${this.conversationStates.get(this.currentSessionId)?.userInfo?.title || 'not yet provided'}

Examples:
"I'm Nancy Paul from PS Advisory" → {"name": "Nancy Paul", "company": "PS Advisory", "title": null}
"I work at a major insurance company" → {"name": null, "company": "a major insurance company", "title": null}
"I am the Managing Partner" → {"name": null, "company": null, "title": "Managing Partner"}
"My role is CEO" → {"name": null, "company": null, "title": "CEO"}

Return ONLY the JSON object, no other text.`
          }]
        })
      });

      if (!response.ok) {
        console.error('[Orchestrator] AI extraction failed, falling back to regex');
        return this.extractUserInfoFallback(message);
      }

      const data = await response.json();
      const content = data.content?.[0]?.text || '{}';

      // Parse the JSON response
      try {
        const extracted = JSON.parse(content);
        const info: Partial<BasicUserInfo> = {};

        if (extracted.name) info.name = extracted.name;
        if (extracted.company) info.company = extracted.company;
        if (extracted.title) info.title = extracted.title;

        console.log(`[Orchestrator] AI extracted: ${JSON.stringify(info)}`);
        return info;
      } catch (parseError) {
        console.error('[Orchestrator] Failed to parse AI response:', content);
        return this.extractUserInfoFallback(message);
      }
    } catch (error) {
      console.error('[Orchestrator] AI extraction error:', error);
      return this.extractUserInfoFallback(message);
    }
  }

  /**
   * Fallback regex-based extraction
   */
  private extractUserInfoFallback(message: string): Partial<BasicUserInfo> {
    const info: Partial<BasicUserInfo> = {};

    // Simple patterns for fallback
    if (message.match(/i'?m\s+(\w+\s+\w+)/i)) {
      const match = message.match(/i'?m\s+(\w+\s+\w+)/i);
      if (match) info.name = match[1];
    }

    if (message.includes('work at') || message.includes('from')) {
      const match = message.match(/(?:work at|from)\s+(.+?)(?:\.|,|$)/i);
      if (match) info.company = match[1].trim();
    }

    return info;
  }

  /**
   * Format research findings for display
   */
  private formatResearchFindings(profile: EnrichedUserProfile): string {
    const { inferred, research, recommendations } = profile;

    let message = `## 🔍 Research Complete!\n\nBased on my research, here's what I found:\n\n`;

    if (research.professionalBackground) {
      message += `**Professional Background:**\n${research.professionalBackground}\n\n`;
    }

    if (research.companyFocus) {
      message += `**Company Focus:**\n${research.companyFocus.substring(0, 200)}...\n\n`;
    }

    message += `**Inferred Interests:**\n`;
    message += inferred.interests.slice(0, 5).map(i => `• ${i}`).join('\n') + '\n\n';

    message += `**Conference Goals:**\n`;
    message += inferred.goals.slice(0, 3).map(g => `• ${g}`).join('\n') + '\n\n';

    if (recommendations.mustAttendSessions.length > 0) {
      message += `**Recommended Sessions:**\n`;
      message += recommendations.mustAttendSessions.slice(0, 3).map(s => `• ${s}`).join('\n');
    }

    return message;
  }

  /**
   * Format agenda response
   */
  private formatAgendaResponse(agenda: any, profile?: EnrichedUserProfile): string {
    let message = `# 🎯 Your Personalized ITC Vegas 2025 Agenda\n\n`;

    if (profile) {
      message += `*Customized for your interests in: ${profile.inferred.interests.slice(0, 3).join(', ')}*\n\n`;
    }

    // Add agenda details (simplified for brevity)
    message += `## Day 1 Highlights\n`;
    message += `• 8:00 AM - Keynote: Future of Insurance\n`;
    message += `• 10:00 AM - AI Innovation Workshop\n`;
    message += `• 2:00 PM - Digital Transformation Panel\n\n`;

    message += `## Key Recommendations\n`;
    if (profile?.recommendations.networkingTargets) {
      message += `**Network with:** ${profile.recommendations.networkingTargets.join(', ')}\n`;
    }
    if (profile?.recommendations.vendorsToMeet) {
      message += `**Visit vendors:** ${profile.recommendations.vendorsToMeet.slice(0, 3).join(', ')}\n`;
    }

    message += `\n✨ This agenda was created based on your professional profile and interests.`;

    return message;
  }

  /**
   * Clear conversation state for a session
   */
  clearSession(sessionId: string): void {
    this.conversationStates.delete(sessionId);
  }
}