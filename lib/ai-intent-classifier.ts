/**
 * AI-Driven Intent Classification System
 * Uses OpenAI to intelligently classify user intent instead of keyword matching
 */

import OpenAI from 'openai';

// Intent types that the classifier can identify
export type IntentType =
  | 'information_seeking'  // User wants information about sessions, speakers, etc.
  | 'agenda_building'      // User explicitly wants an agenda created
  | 'profile_research'     // User explicitly wants profile research/personalization
  | 'local_recommendations' // User wants restaurant/venue recommendations
  | 'greeting'             // User is introducing themselves or saying hello
  | 'registration'         // User wants to register or sign up
  | 'general_chat'         // General conversation
  | 'preference_setting'   // User is providing preferences
  | 'practical_need'       // User has practical needs (tired, hungry, lost, etc.)
  | 'social_planning'      // User wants party/event information
  | 'navigation_help'      // User needs directions or location help
  | 'emotional_support';   // User is overwhelmed, anxious, or needs encouragement

export interface ExtractedEntities {
  name?: string;
  company?: string;
  title?: string;
  interests?: string[];
  timeframe?: string;
  location?: string;
  days?: string[];
}

export interface IntentClassification {
  primary_intent: IntentType;
  confidence: number;
  secondary_intents?: Array<{
    intent: IntentType;
    confidence: number;
  }>;
  extracted_entities?: ExtractedEntities;
  suggested_action: 'answer' | 'build_agenda' | 'research_profile' | 'recommend_local' | 'collect_preferences';
  reasoning?: string;
  requires_clarification?: boolean;
  clarification_prompt?: string;
}

export interface ConversationContext {
  history?: Array<{ role: string; content: string }>;
  userProfile?: any;
  lastIntent?: IntentType;
  agendaAlreadyBuilt?: boolean;
}

const INTENT_CLASSIFICATION_PROMPT = `You are an intent classifier for an AI conference assistant chatbot for ITC Vegas 2025.

CRITICAL RULES:
1. Recognize 'agenda_building' for both explicit creation requests AND help/assistance requests with schedules
2. Be VERY conservative with 'profile_research' - only use when user EXPLICITLY asks for profile research or LinkedIn lookup
3. Default to 'information_seeking' when user is asking questions or seeking information
4. Introductions without explicit requests should be 'greeting' not 'profile_research'
5. Questions like "what's happening" or "what sessions" are 'information_seeking' not 'agenda_building'

Intent Definitions:
- information_seeking: Questions about sessions, speakers, topics, schedules (but not building/helping with one)
- agenda_building: Requests to BUILD/CREATE a personalized agenda OR asking for HELP with their schedule/agenda
- profile_research: EXPLICIT requests to research their background or LinkedIn
- local_recommendations: Questions about restaurants, bars, venues, things to do in Vegas
- greeting: Introductions, hellos, stating who they are (without asking for anything specific)
- registration: Wanting to sign up, create account, save information
- general_chat: Casual conversation, thank you, feedback
- preference_setting: Providing interests, role, or preferences (usually in response to questions)
- practical_need: Expressing tiredness, hunger, being lost, need for coffee, WiFi, charging, etc.
- social_planning: Asking about parties, events, networking opportunities, what's happening tonight
- navigation_help: Asking for directions, where things are, how to get somewhere
- emotional_support: Feeling overwhelmed, anxious, bored, confused, needs encouragement

Examples:
"What's happening this morning?" → information_seeking (asking for info, not building agenda)
"I'm John Smith, CEO of Acme" → greeting (just introduction, no request)
"Build me an agenda" → agenda_building (explicit request)
"Help me with my schedule" → agenda_building (asking for help with schedule)
"Can you help me with my agenda?" → agenda_building (asking for assistance)
"I need help planning my schedule" → agenda_building (needs help with planning)
"Could you assist me with my conference schedule?" → agenda_building (assistance request)
"Help me figure out what sessions to attend" → agenda_building (help organizing sessions)
"Research my LinkedIn profile" → profile_research (explicit request)
"What sessions should I attend?" → information_seeking (asking for recommendations only)
"Create my personalized schedule" → agenda_building (explicit creation request)
"Any good restaurants nearby?" → local_recommendations
"I'm interested in AI and cybersecurity" → preference_setting (providing preferences)
"I'm exhausted" → practical_need (expressing tiredness)
"Where can I get coffee?" → practical_need (need for coffee)
"What's the party situation tonight?" → social_planning (asking about parties)
"How do I get to the Expo Floor?" → navigation_help (asking for directions)
"This is overwhelming" → emotional_support (feeling overwhelmed)
"I'm hungry" → practical_need (expressing hunger)
"Where's the action?" → social_planning (looking for exciting events)
"I'm lost" → navigation_help (needs help finding their way)`;

class AIIntentClassifier {
  private openai: OpenAI | null = null;
  private initialized = false;
  private initAttempted = false;

  constructor() {
    // Don't initialize in constructor - do it lazily
  }

  private initialize() {
    if (this.initAttempted) return;
    this.initAttempted = true;

    const apiKey = process.env.OPENAI_API_KEY;
    console.log('[AIIntentClassifier] Initializing with API key:', apiKey ? `${apiKey.substring(0, 20)}...` : 'NO KEY');

    // Check if it's a real key (not a placeholder)
    if (apiKey && apiKey.startsWith('sk-') && apiKey.length > 40 && !apiKey.includes('<')) {
      try {
        this.openai = new OpenAI({ apiKey });
        this.initialized = true;
        console.log('[AIIntentClassifier] OpenAI client initialized successfully');
      } catch (error) {
        console.log('[AIIntentClassifier] Failed to initialize OpenAI client:', error);
      }
    } else {
      console.log('[AIIntentClassifier] Invalid or missing API key, using fallback');
      if (apiKey) {
        console.log(`[AIIntentClassifier] Key check failed: starts=${apiKey.startsWith('sk-')}, length=${apiKey.length}, no-placeholder=${!apiKey.includes('<')}`);
      }
    }
  }

  /**
   * Classify user intent using AI
   */
  async classifyIntent(
    message: string,
    context?: ConversationContext
  ): Promise<IntentClassification> {
    // Initialize on first use
    if (!this.initAttempted) {
      this.initialize();
    }

    // Fallback to simple classification if OpenAI is not available
    if (!this.initialized || !this.openai) {
      return this.fallbackClassification(message);
    }

    try {
      // Build context string
      let contextInfo = '';
      if (context?.history && context.history.length > 0) {
        const recentHistory = context.history.slice(-3);
        contextInfo = '\nRecent conversation:\n' +
          recentHistory.map(h => `${h.role}: ${h.content}`).join('\n');
      }
      if (context?.agendaAlreadyBuilt) {
        contextInfo += '\nNote: An agenda has already been built for this user.';
      }

      const response = await this.openai.chat.completions.create({
        model: "gpt-4-turbo-preview",
        messages: [
          {
            role: "system",
            content: INTENT_CLASSIFICATION_PROMPT
          },
          {
            role: "user",
            content: `Classify the intent of this message:\n"${message}"${contextInfo}`
          }
        ],
        functions: [{
          name: "classify_intent",
          description: "Classify the user's intent and extract relevant information",
          parameters: {
            type: "object",
            properties: {
              primary_intent: {
                type: "string",
                enum: [
                  "information_seeking",
                  "agenda_building",
                  "profile_research",
                  "local_recommendations",
                  "greeting",
                  "registration",
                  "general_chat",
                  "preference_setting",
                  "practical_need",
                  "social_planning",
                  "navigation_help",
                  "emotional_support"
                ],
                description: "The primary intent of the message"
              },
              confidence: {
                type: "number",
                minimum: 0,
                maximum: 1,
                description: "Confidence in the classification (0-1)"
              },
              suggested_action: {
                type: "string",
                enum: ["answer", "build_agenda", "research_profile", "recommend_local", "collect_preferences"],
                description: "What action the system should take"
              },
              reasoning: {
                type: "string",
                description: "Brief explanation of why this intent was chosen"
              },
              extracted_entities: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Person's name if mentioned" },
                  company: { type: "string", description: "Company name if mentioned" },
                  title: { type: "string", description: "Job title if mentioned" },
                  interests: {
                    type: "array",
                    items: { type: "string" },
                    description: "Topics of interest mentioned"
                  },
                  timeframe: { type: "string", description: "Time references (morning, afternoon, Day 1, etc.)" },
                  location: { type: "string", description: "Location references" },
                  days: {
                    type: "array",
                    items: { type: "string" },
                    description: "Conference days mentioned"
                  }
                }
              },
              requires_clarification: {
                type: "boolean",
                description: "Whether the intent needs clarification"
              },
              clarification_prompt: {
                type: "string",
                description: "Question to ask for clarification if needed"
              }
            },
            required: ["primary_intent", "confidence", "suggested_action", "reasoning"]
          }
        }],
        function_call: { name: "classify_intent" },
        temperature: 0.3, // Lower temperature for more consistent classification
        max_tokens: 500
      });

      const functionCall = response.choices[0]?.message?.function_call;
      if (!functionCall || !functionCall.arguments) {
        return this.fallbackClassification(message);
      }

      const classification = JSON.parse(functionCall.arguments) as IntentClassification;

      // Post-process to ensure conservative agenda/profile triggering
      if (classification.primary_intent === 'agenda_building' && classification.confidence < 0.8) {
        classification.primary_intent = 'information_seeking';
        classification.suggested_action = 'answer';
        classification.reasoning = 'Reclassified to information_seeking due to low confidence in agenda building intent';
      }

      if (classification.primary_intent === 'profile_research' && classification.confidence < 0.9) {
        classification.primary_intent = 'greeting';
        classification.suggested_action = 'answer';
        classification.reasoning = 'Reclassified to greeting due to low confidence in profile research intent';
      }

      return classification;

    } catch (error) {
      console.error('AI intent classification failed:', error);
      return this.fallbackClassification(message);
    }
  }

  /**
   * Simple fallback classification when AI is not available
   */
  private fallbackClassification(message: string): IntentClassification {
    const lowerMessage = message.toLowerCase();

    // Check for agenda building requests (including help requests)
    if (
      lowerMessage.includes('build') && lowerMessage.includes('agenda') ||
      lowerMessage.includes('create') && lowerMessage.includes('schedule') ||
      lowerMessage.includes('make') && lowerMessage.includes('itinerary') ||
      lowerMessage.includes('help') && (lowerMessage.includes('schedule') || lowerMessage.includes('agenda')) ||
      lowerMessage.includes('assist') && (lowerMessage.includes('schedule') || lowerMessage.includes('agenda')) ||
      lowerMessage.includes('plan') && lowerMessage.includes('schedule') ||
      lowerMessage.includes('figure out') && lowerMessage.includes('sessions')
    ) {
      return {
        primary_intent: 'agenda_building',
        confidence: 0.9,
        suggested_action: 'build_agenda',
        reasoning: 'Agenda building or schedule assistance request detected'
      };
    }

    // Check for profile research requests
    if (
      lowerMessage.includes('research') && (lowerMessage.includes('linkedin') || lowerMessage.includes('profile') || lowerMessage.includes('background')) ||
      lowerMessage.includes('look up') && lowerMessage.includes('background')
    ) {
      return {
        primary_intent: 'profile_research',
        confidence: 0.85,
        suggested_action: 'research_profile',
        reasoning: 'Profile research request detected'
      };
    }

    // Check for practical needs
    if (
      lowerMessage === "i'm exhausted" || lowerMessage === "i'm tired" ||
      lowerMessage === "i'm hungry" || lowerMessage === "i'm starving" ||
      lowerMessage.includes('need coffee') || lowerMessage.includes('i need coffee') ||
      lowerMessage.includes('charge') && lowerMessage.includes('phone') ||
      lowerMessage.includes('wifi password') || lowerMessage.includes('wi-fi password')
    ) {
      return {
        primary_intent: 'practical_need',
        confidence: 0.85,
        suggested_action: 'answer',
        reasoning: 'Practical need expressed'
      };
    }

    // Check for emotional support
    if (
      lowerMessage.includes('overwhelming') || lowerMessage.includes('overwhelmed') ||
      lowerMessage.includes('anxious') || lowerMessage.includes('anxiety') ||
      lowerMessage === "i'm bored" || lowerMessage.includes('boring')
    ) {
      return {
        primary_intent: 'emotional_support',
        confidence: 0.85,
        suggested_action: 'answer',
        reasoning: 'Emotional support needed'
      };
    }

    // Check for navigation help
    if (
      lowerMessage === "i'm lost" || lowerMessage.includes("i am lost") ||
      lowerMessage.includes('how do i get to') || lowerMessage.includes('how to get to') ||
      lowerMessage.includes("where's the") || lowerMessage.includes("where is the") ||
      (lowerMessage.includes("where") && (lowerMessage.includes("main stage") || lowerMessage.includes("expo floor") || lowerMessage.includes("registration")))
    ) {
      return {
        primary_intent: 'navigation_help',
        confidence: 0.85,
        suggested_action: 'answer',
        reasoning: 'Navigation assistance requested'
      };
    }

    // Check for social planning
    if (
      lowerMessage.includes('party') || lowerMessage.includes('parties') ||
      lowerMessage.includes('reception') || lowerMessage.includes('happy hour') ||
      lowerMessage.includes('networking event') || lowerMessage.includes('meetup') ||
      lowerMessage.includes('tonight') && (lowerMessage.includes('what') || lowerMessage.includes('where')) ||
      lowerMessage.includes('action tonight') || lowerMessage.includes('evening event')
    ) {
      return {
        primary_intent: 'social_planning',
        confidence: 0.85,
        suggested_action: 'answer',
        reasoning: 'Social event inquiry detected'
      };
    }

    // Check for preference setting
    if (
      lowerMessage.includes("i'm interested in") || lowerMessage.includes("i am interested in") ||
      (lowerMessage.includes("i'm a") || lowerMessage.includes("i am a")) && (lowerMessage.includes('attending') || lowerMessage.includes('days'))
    ) {
      return {
        primary_intent: 'preference_setting',
        confidence: 0.8,
        suggested_action: 'collect_preferences',
        reasoning: 'User providing preferences'
      };
    }

    // Check for local recommendations
    if (
      lowerMessage.includes('restaurant') ||
      lowerMessage.includes('bar') ||
      lowerMessage.includes('food') ||
      lowerMessage.includes('eat') ||
      lowerMessage.includes('lunch') ||
      lowerMessage.includes('dinner') ||
      lowerMessage.includes('breakfast') ||
      lowerMessage.includes('drink') ||
      lowerMessage.includes('entertainment') && (lowerMessage.includes('options') || lowerMessage.includes('show')) ||
      lowerMessage.includes('coffee') && (lowerMessage.includes('where') || lowerMessage.includes('good'))
    ) {
      return {
        primary_intent: 'local_recommendations',
        confidence: 0.85,
        suggested_action: 'recommend_local',
        reasoning: 'Local venue request detected'
      };
    }

    // Check for greetings/introductions (more specific)
    if (
      (lowerMessage.startsWith("i'm ") || lowerMessage.startsWith("i am ")) && lowerMessage.includes('from') ||
      lowerMessage.startsWith("my name is") ||
      lowerMessage.startsWith("hello") ||
      lowerMessage.startsWith("hi ") && lowerMessage.length < 50
    ) {
      return {
        primary_intent: 'greeting',
        confidence: 0.8,
        suggested_action: 'answer',
        reasoning: 'Greeting or introduction detected'
      };
    }

    // Default to information seeking
    return {
      primary_intent: 'information_seeking',
      confidence: 0.7,
      suggested_action: 'answer',
      reasoning: 'Default classification for questions and information requests'
    };
  }

  /**
   * Check if an intent requires user confirmation
   */
  shouldConfirmIntent(classification: IntentClassification): boolean {
    // Require confirmation for high-impact actions with medium confidence
    if (
      (classification.primary_intent === 'agenda_building' && classification.confidence < 0.95) ||
      (classification.primary_intent === 'profile_research' && classification.confidence < 0.95)
    ) {
      return true;
    }
    return false;
  }

  /**
   * Generate a confirmation prompt for unclear intent
   */
  generateConfirmationPrompt(classification: IntentClassification): string {
    switch (classification.primary_intent) {
      case 'agenda_building':
        return "It sounds like you might want me to build a personalized agenda. Would you like me to create a custom schedule for you, or are you just looking for session information?";
      case 'profile_research':
        return "Would you like me to research your professional background to personalize recommendations, or would you prefer to just tell me about your interests?";
      default:
        return "I'm not quite sure what you're looking for. Could you clarify what you'd like help with?";
    }
  }
}

// Export singleton instance
export const intentClassifier = new AIIntentClassifier();

// Export helper function for easy use
export async function classifyUserIntent(
  message: string,
  context?: ConversationContext
): Promise<IntentClassification> {
  return intentClassifier.classifyIntent(message, context);
}