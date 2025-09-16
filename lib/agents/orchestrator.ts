/**
 * Agent Orchestrator
 * Manages conversation flow and coordination between research and agenda agents
 */

import { UserProfileResearchAgent, BasicUserInfo, EnrichedUserProfile } from './user-profile-researcher';
import { generateSmartAgenda } from '@/lib/tools/schedule/smart-agenda-builder';
import { generateGuestAgenda } from '@/lib/tools/schedule/guest-agenda-builder';
import {
  savePersonalizedAgenda,
  getActiveAgenda,
  hasExistingAgenda,
  updatePersonalizedAgenda
} from '@/lib/services/agenda-storage-service';
import prisma from '@/lib/db';
import { AI_CONFIG } from '@/lib/ai-config';
import { getConversation, updateConversationState as updateConvState } from '@/lib/conversation-state';
import { Agent } from './agent-types';

export type ConversationPhase =
  | 'greeting'
  | 'checking_existing'  // New phase to check for existing agenda
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
  hasExistingAgenda?: boolean;
  existingAgendaId?: string;
  userWantsUpdate?: boolean;  // Track if user wants to update vs replace
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
type OrchestratorInput = { sessionId: string; message: string; userId?: string };

export class AgentOrchestrator implements Agent<OrchestratorInput, OrchestratorResponse> {
  private researchAgent: UserProfileResearchAgent;

  constructor() {
    this.researchAgent = new UserProfileResearchAgent({
      inferenceDepth: 'detailed',
      includeLinkedIn: true,
      includeCompanyNews: true
    });
  }

  describe(): string {
    return 'Agent Orchestrator: guides user through research → confirmation → agenda building.';
  }

  async invoke(input: OrchestratorInput): Promise<OrchestratorResponse> {
    return this.processMessage(input.sessionId, input.message, input.userId);
  }

  /**
   * Retrieve orchestrator state from central conversation state
   */
  private getState(sessionId: string): ConversationState {
    const conversation = getConversation(sessionId);
    const state = (conversation.state.orchestrator as ConversationState | undefined);
    return state || this.createNewState();
  }

  /**
   * Persist orchestrator state into central conversation state
   */
  private setState(sessionId: string, state: ConversationState): void {
    updateConvState(sessionId, { orchestrator: state });
  }

  /**
   * Process user message and orchestrate response
   */
  async processMessage(
    sessionId: string,
    message: string,
    userId?: string
  ): Promise<OrchestratorResponse> {
    // Get or create conversation state (from central store)
    let state = this.getState(sessionId);

    // If userId is provided and we haven't fetched user info yet, get it from database
    if (userId && state.phase === 'greeting' && Object.keys(state.userInfo).length === 0) {
      try {
        const user = await prisma.user.findUnique({
          where: { email: userId },
          select: {
            name: true,
            email: true,
            company: true,
            role: true,
            interests: true,
            goals: true
          }
        });

        if (user && user.name) {
          // Pre-populate user info from database
          state.userInfo = {
            name: user.name,
            company: user.company || '',
            title: user.role || ''
          };
          console.log(`[Orchestrator] Loaded existing user profile for ${user.name}`);
        }
      } catch (error) {
        console.error('[Orchestrator] Error fetching user profile:', error);
      }
    }

    // Check for existing agenda if userId provided and not yet checked
    if (userId && state.phase === 'greeting' && !state.hasExistingAgenda) {
      const hasAgenda = await hasExistingAgenda(userId);
      if (hasAgenda) {
        state.hasExistingAgenda = true;
        state.phase = 'checking_existing';
      }
    }

    // Add message to orchestrator-local history (optional; central store also tracks full convo)
    state.messages.push({ role: 'user', content: message });

    // Process based on current phase
    const handlers: Record<ConversationPhase, () => Promise<OrchestratorResponse>> = {
      greeting: () => this.handleGreeting(state, message),
      checking_existing: () => this.handleExistingAgenda(state, message, userId),
      collecting_info: () => this.handleInfoCollection(state, message),
      researching: () => this.handleResearching(state),
      confirming_profile: () => this.handleProfileConfirmation(state, message),
      building_agenda: () => this.handleAgendaBuilding(state, userId),
      complete: () => this.handleComplete(state, message)
    };

    let response: OrchestratorResponse;
    const handler = handlers[state.phase];
    if (handler) {
      response = await handler();
    } else {
      response = {
        message: "I'm not sure how to help with that. Would you like me to build you a personalized agenda?",
        nextAction: 'collect_info'
      };
    }

    // Update state
    state.messages.push({ role: 'assistant', content: response.message });
    this.setState(sessionId, state);

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
   * Handle existing agenda check
   */
  private async handleExistingAgenda(
    state: ConversationState,
    message: string,
    userId?: string
  ): Promise<OrchestratorResponse> {
    if (!userId) {
      state.phase = 'collecting_info';
      return this.handleInfoCollection(state, message);
    }

    const existingAgenda = await getActiveAgenda(userId);

    if (!existingAgenda) {
      // No active agenda found, continue with normal flow
      state.phase = 'collecting_info';
      return this.handleInfoCollection(state, message);
    }

    // Parse user response
    const wantsView = message.toLowerCase().includes('view') ||
                     message.toLowerCase().includes('show') ||
                     message.toLowerCase().includes('see');
    const wantsUpdate = message.toLowerCase().includes('update') ||
                       message.toLowerCase().includes('modify') ||
                       message.toLowerCase().includes('change');
    const wantsNew = message.toLowerCase().includes('new') ||
                    message.toLowerCase().includes('replace') ||
                    message.toLowerCase().includes('create');

    if (wantsView) {
      // Show existing agenda
      state.phase = 'complete';
      return {
        message: `Here's your existing agenda created on ${existingAgenda.createdAt.toLocaleDateString()}:\n\n${this.formatAgendaResponse(existingAgenda.agendaData)}\n\nWould you like to update it or create a new one?`,
        agenda: existingAgenda.agendaData,
        nextAction: 'complete',
        metadata: {
          phase: 'complete',
          confidence: 1.0,
          dataCompleteness: 100
        }
      };
    } else if (wantsUpdate) {
      // Mark for update and continue
      state.userWantsUpdate = true;
      state.existingAgendaId = existingAgenda.id;
      state.phase = 'collecting_info';
      return {
        message: `I'll update your existing agenda. Let me gather some additional information to refine it.\n\nWhat specific changes would you like to make? Or shall I research your latest profile to update recommendations?`,
        nextAction: 'collect_info',
        metadata: {
          phase: 'collecting_info',
          confidence: 1.0,
          dataCompleteness: 50
        }
      };
    } else if (wantsNew) {
      // Create new agenda
      state.phase = 'collecting_info';
      return {
        message: `I'll create a fresh agenda for you. Let me start by gathering your information.\n\nCould you tell me your full name, company, and role?`,
        nextAction: 'collect_info',
        metadata: {
          phase: 'collecting_info',
          confidence: 1.0,
          dataCompleteness: 0
        }
      };
    }

    // First time asking
    return {
      message: `I found your existing personalized agenda from ${existingAgenda.createdAt.toLocaleDateString()}.\n\nWould you like to:\n📋 **View** your current agenda\n🔄 **Update** it with new preferences\n✨ **Create** a completely new one\n\nWhat would you prefer?`,
      nextAction: 'collect_info',
      metadata: {
        phase: 'checking_existing',
        confidence: 1.0,
        dataCompleteness: 100
      }
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
      const extractedInfo = await this.extractUserInfo(message, state.userInfo);
      if (Object.keys(extractedInfo).length > 0) {
        state.userInfo = { ...state.userInfo, ...extractedInfo };
      }

      // Check what information we have
      const hasName = !!state.userInfo.name;
      const hasCompany = !!state.userInfo.company;
      const hasTitle = !!state.userInfo.title;

      // If we have all info (logged-in user), skip to research
      if (hasName && hasCompany && hasTitle) {
        state.phase = 'researching';
        return {
          message: `Great! I see you're **${state.userInfo.name}** from **${state.userInfo.company}**${state.userInfo.title ? `, ${state.userInfo.title}` : ''}.\n\nLet me research your background and the conference sessions to build you a personalized agenda. This will just take a moment...`,
          nextAction: 'research',
          metadata: {
            phase: 'researching',
            confidence: 1.0,
            dataCompleteness: 100
          }
        };
      }

      // Ask for what's missing
      const missing: string[] = [];
      if (!hasName) missing.push('your full name');
      if (!hasCompany) missing.push('your company');
      if (!hasTitle) missing.push('your role/title');

      if (missing.length > 0) {
        // Customize message based on whether user is logged in
        const prefix = hasName ?
          `Hi ${state.userInfo.name}! I'd love to create a personalized agenda for you.` :
          `I'd love to create a personalized agenda for you! I can research your background to make intelligent recommendations.`;

        return {
          message: `${prefix}\n\nTo get started, could you tell me ${missing.join(', ')}?\n\nFor example: "I'm John Smith, VP of Innovation at Acme Insurance"`,
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
    // Parse user information from message (only if we don't have it already)
    const extractedInfo = await this.extractUserInfo(message, state.userInfo);

    // Update user info
    state.userInfo = { ...state.userInfo, ...extractedInfo };

    // Check what's missing
    const missing: string[] = [];
    if (!state.userInfo.name) missing.push('name');
    if (!state.userInfo.company) missing.push('company');
    if (!state.userInfo.title) missing.push('role/title');

    if (missing.length > 0) {
      // Ask for missing information
      const messagePrefix = state.userInfo.name ?
        `Thanks ${state.userInfo.name}!` :
        `Thanks!`;

      return {
        message: `${messagePrefix} I still need your ${missing.join(' and ')}. Could you provide ${missing.length > 1 ? 'these' : 'this'}?`,
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

    // Check if this is a logged-in user who already had complete info
    const wasPrePopulated = Object.keys(extractedInfo).length === 0 &&
                           state.userInfo.name &&
                           state.userInfo.company;

    const confirmationMessage = wasPrePopulated ?
      `Great! I have your profile information:\n\n👤 **${state.userInfo.name}**\n🏢 **${state.userInfo.company}**\n💼 **${state.userInfo.title || 'Professional'}**\n\nLet me research current conference sessions that match your interests...` :
      `Perfect! I have your information:\n\n👤 **${state.userInfo.name}**\n🏢 **${state.userInfo.company}**\n💼 **${state.userInfo.title}**\n\nLet me research your background to personalize your conference experience. This will take just a moment...`;

    return {
      message: confirmationMessage,
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
        // Save or update the agenda in database
        if (userId) {
          try {
            if (state.userWantsUpdate && state.existingAgendaId) {
              // Update existing agenda
              await updatePersonalizedAgenda(
                state.existingAgendaId,
                agenda,
                {
                  createVersion: true,
                  changeDescription: 'Updated via AI agent with new preferences',
                  changedBy: 'ai_agent'
                }
              );
            } else {
              // Save new agenda
              await savePersonalizedAgenda(userId, agenda, {
                researchProfile: state.researchProfile,
                generatedBy: 'ai_agent',
                title: `Conference Schedule - ${new Date().toLocaleDateString()}`,
                description: 'AI-generated personalized conference agenda'
              });
            }
          } catch (error) {
            console.error('[Orchestrator] Failed to save agenda:', error);
          }
        }

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
  private async extractUserInfo(
    message: string,
    previousInfo?: Partial<BasicUserInfo>
  ): Promise<Partial<BasicUserInfo>> {
    try {
      // Use Claude to intelligently extract information
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          // Use fast, cost-efficient model for extraction
          model: AI_CONFIG.validateModel('claude-3-haiku-20240307')
            ? 'claude-3-haiku-20240307'
            : AI_CONFIG.FALLBACK_MODEL,
          max_tokens: 200,
          temperature: 0,
          messages: [{
            role: 'user',
            content: `Extract the person's name, company, and job title/role from this message. Return ONLY a JSON object with keys "name", "company", and "title". If any information is not mentioned, use null for that field.

Message: "${message}"

Previous context from conversation:
- Name: ${previousInfo?.name || 'not yet provided'}
- Company: ${previousInfo?.company || 'not yet provided'}
- Title: ${previousInfo?.title || 'not yet provided'}

Examples:
"I'm Nancy Paul from PS Advisory" → {"name": "Nancy Paul", "company": "PS Advisory", "title": null}
"I work at a major insurance company" → {"name": null, "company": "a major insurance company", "title": null}
"I am the Managing Partner" → {"name": null, "company": null, "title": "Managing Partner"}
"My role is CEO" → {"name": null, "company": null, "title": "CEO"}

Return ONLY the JSON object, no other text.`
          }]
        }),
        signal: controller.signal
      });
      clearTimeout(timeout);

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

    // Check if we have actual agenda data
    if (!agenda || !agenda.days || typeof agenda.days !== 'object') {
      return message + '\n❌ Unable to generate agenda at this time. Please try again.';
    }

    // Statistics
    let totalSessions = 0;
    let favoriteSessions = 0;
    for (const day of Object.values(agenda.days)) {
      const daySchedule = day as any;
      totalSessions += daySchedule.sessions?.filter((s: any) => s.type === 'session').length || 0;
      favoriteSessions += daySchedule.sessions?.filter((s: any) => s.type === 'session' && s.isFavorite).length || 0;
    }

    message += `📊 **Schedule Overview**\n`;
    message += `• Total Sessions: ${totalSessions}\n`;
    if (favoriteSessions > 0) {
      message += `• ⭐ Favorite Sessions Included: ${favoriteSessions}\n`;
    }
    message += `\n`;

    // Format each day
    const dayNames = ['Day 1 - Tuesday, Oct 15', 'Day 2 - Wednesday, Oct 16', 'Day 3 - Thursday, Oct 17'];

    for (const [dayKey, daySchedule] of Object.entries(agenda.days)) {
      const dayNum = parseInt(dayKey.replace('day', '')) - 1;
      const dayName = dayNames[dayNum] || `Day ${dayNum + 1}`;
      const schedule = daySchedule as any;

      message += `## ${dayName}\n\n`;

      if (!schedule.sessions || schedule.sessions.length === 0) {
        message += `*No sessions scheduled*\n\n`;
        continue;
      }

      for (const item of schedule.sessions) {
        if (item.type === 'meal') {
          message += `🍴 **${item.time}** - ${item.title}\n\n`;
        } else if (item.type === 'session') {
          // Highlight favorites with star
          const favoriteIcon = item.isFavorite ? '⭐ ' : '';
          const priorityBadge = item.priority >= 100 ? ' **[MUST ATTEND]**' :
                               item.priority >= 85 ? ' *[Highly Recommended]*' : '';

          message += `${favoriteIcon}**${item.time}** - ${item.title}${priorityBadge}\n`;

          if (item.location) {
            message += `   📍 ${item.location}\n`;
          }

          if (item.speakers && item.speakers.length > 0) {
            message += `   👤 ${item.speakers.join(', ')}\n`;
          }

          if (item.reason) {
            message += `   💡 *${item.reason}*\n`;
          }

          if (item.conflictInfo && item.conflictInfo.hasConflict) {
            message += `   ⚠️ *Conflict resolved - chose over: ${item.conflictInfo.conflictsWith}*\n`;
          }

          message += '\n';
        }
      }
    }

    // Add recommendations if available
    if (profile?.recommendations) {
      message += `## 🤝 Networking Recommendations\n\n`;

      if (profile.recommendations.networkingTargets?.length > 0) {
        message += `**Key People to Meet:**\n`;
        profile.recommendations.networkingTargets.slice(0, 5).forEach(target => {
          message += `• ${target}\n`;
        });
        message += '\n';
      }

      if (profile.recommendations.vendorsToMeet?.length > 0) {
        message += `**Vendors to Visit:**\n`;
        profile.recommendations.vendorsToMeet.slice(0, 5).forEach(vendor => {
          message += `• ${vendor}\n`;
        });
        message += '\n';
      }
    }

    // Add footer with save prompt
    message += `\n---\n`;
    message += `✨ This personalized agenda was created based on:\n`;
    if (favoriteSessions > 0) {
      message += `• Your ${favoriteSessions} favorited sessions (all included!)\n`;
    }
    if (profile) {
      message += `• Your professional profile and interests\n`;
      message += `• AI analysis of session relevance\n`;
    }
    message += `\n💾 **Would you like to save this agenda to your account?**`;

    return message;
  }

  /**
   * Clear conversation state for a session
   */
  clearSession(sessionId: string): void {
    updateConvState(sessionId, { orchestrator: undefined, researchAgentActive: false, researchPhase: undefined });
  }
}
