/**
 * In-Chat Registration Handler
 * Manages the conversational registration flow within the chat interface
 */

import { ConversationContext } from '@/lib/conversation-state';
import { SmartAgenda } from '@/lib/tools/schedule/types';
import { savePersonalizedAgenda } from '@/lib/services/agenda-storage-service';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/db';

export type RegistrationState =
  | 'offer_save'
  | 'collect_email'
  | 'collect_password'
  | 'confirm_password'
  | 'collect_name'
  | 'collect_company'
  | 'collect_role'
  | 'collect_interests'
  | 'creating_account'
  | 'complete'
  | 'error';

export interface RegistrationData {
  email?: string;
  password?: string;
  confirmPassword?: string;
  name?: string;
  company?: string;
  role?: string;
  interests?: string[];
  organizationType?: string;
}

export interface RegistrationResponse {
  message: string;
  nextStep?: RegistrationState;
  requiresInput: boolean;
  inputType?: 'text' | 'password' | 'email' | 'select' | 'multi-select';
  options?: string[];
  validation?: {
    required?: boolean;
    minLength?: number;
    pattern?: string;
    errorMessage?: string;
  };
  success?: boolean;
  userId?: string;
  sessionsSaved?: number;
}

const INTERESTS_OPTIONS = [
  'AI & Automation',
  'Claims Technology',
  'Cybersecurity',
  'Embedded Insurance',
  'Digital Distribution',
  'Customer Experience',
  'Underwriting',
  'Data Analytics'
];

const ROLES_OPTIONS = [
  'Executive',
  'Product Manager',
  'Developer',
  'Data Scientist',
  'Underwriter',
  'Claims Manager',
  'Sales/BD',
  'Startup Founder',
  'Investor',
  'Consultant',
  'Other'
];

/**
 * Main registration handler class
 */
export class InChatRegistrationHandler {
  private registrationData: RegistrationData = {};
  private currentState: RegistrationState = 'offer_save';
  private pendingAgenda?: SmartAgenda;

  constructor(agenda?: SmartAgenda) {
    this.pendingAgenda = agenda;
  }

  /**
   * Process user input based on current registration state
   */
  async processInput(
    input: string,
    state: RegistrationState,
    data: RegistrationData
  ): Promise<RegistrationResponse> {
    this.registrationData = { ...this.registrationData, ...data };
    this.currentState = state;

    switch (state) {
      case 'offer_save':
        return this.handleSaveOffer(input);

      case 'collect_email':
        return this.handleEmailCollection(input);

      case 'collect_password':
        return this.handlePasswordCollection(input);

      case 'confirm_password':
        return this.handlePasswordConfirmation(input);

      case 'collect_name':
        return this.handleNameCollection(input);

      case 'collect_company':
        return this.handleCompanyCollection(input);

      case 'collect_role':
        return this.handleRoleCollection(input);

      case 'collect_interests':
        return this.handleInterestsCollection(input);

      case 'creating_account':
        return await this.createAccount();

      default:
        return {
          message: "I'm not sure what to do next. Would you like to save your agenda?",
          nextStep: 'offer_save',
          requiresInput: true
        };
    }
  }

  /**
   * Handle initial save offer
   */
  private handleSaveOffer(input: string): RegistrationResponse {
    const positive = ['yes', 'yeah', 'sure', 'ok', 'save', 'please', 'definitely', 'absolutely'];
    const negative = ['no', 'nope', 'later', 'skip', 'not now', 'maybe later'];

    const lowerInput = input.toLowerCase();

    if (positive.some(word => lowerInput.includes(word))) {
      return {
        message: "Great! Let's create your account to save this agenda. What's your email address?",
        nextStep: 'collect_email',
        requiresInput: true,
        inputType: 'email',
        validation: {
          required: true,
          pattern: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$',
          errorMessage: 'Please enter a valid email address'
        }
      };
    } else if (negative.some(word => lowerInput.includes(word))) {
      return {
        message: "No problem! Your agenda is ready to use. You can always create an account later if you'd like to save it. Is there anything else I can help you with?",
        requiresInput: false,
        success: true
      };
    } else {
      return {
        message: "Would you like to save this agenda to your profile? Just say 'yes' to create an account, or 'no' to continue without saving.",
        nextStep: 'offer_save',
        requiresInput: true
      };
    }
  }

  /**
   * Handle email collection
   */
  private handleEmailCollection(input: string): RegistrationResponse {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(input.trim())) {
      return {
        message: "That doesn't look like a valid email address. Please enter your email in the format: name@company.com",
        nextStep: 'collect_email',
        requiresInput: true,
        inputType: 'email'
      };
    }

    this.registrationData.email = input.trim().toLowerCase();

    return {
      message: "Perfect! Now, please choose a password (at least 8 characters):",
      nextStep: 'collect_password',
      requiresInput: true,
      inputType: 'password',
      validation: {
        required: true,
        minLength: 8,
        errorMessage: 'Password must be at least 8 characters'
      }
    };
  }

  /**
   * Handle password collection
   */
  private handlePasswordCollection(input: string): RegistrationResponse {
    if (input.length < 8) {
      return {
        message: "Password needs to be at least 8 characters for security. Please try a longer password:",
        nextStep: 'collect_password',
        requiresInput: true,
        inputType: 'password'
      };
    }

    this.registrationData.password = input;

    return {
      message: "Please confirm your password by entering it again:",
      nextStep: 'confirm_password',
      requiresInput: true,
      inputType: 'password'
    };
  }

  /**
   * Handle password confirmation
   */
  private handlePasswordConfirmation(input: string): RegistrationResponse {
    if (input !== this.registrationData.password) {
      return {
        message: "Passwords don't match. Let's try again. Please enter your password:",
        nextStep: 'collect_password',
        requiresInput: true,
        inputType: 'password'
      };
    }

    this.registrationData.confirmPassword = input;

    return {
      message: "Great! What's your full name?",
      nextStep: 'collect_name',
      requiresInput: true,
      inputType: 'text',
      validation: {
        required: true,
        minLength: 2,
        errorMessage: 'Please enter your full name'
      }
    };
  }

  /**
   * Handle name collection
   */
  private handleNameCollection(input: string): RegistrationResponse {
    if (input.trim().length < 2) {
      return {
        message: "Please enter your full name:",
        nextStep: 'collect_name',
        requiresInput: true,
        inputType: 'text'
      };
    }

    this.registrationData.name = input.trim();

    return {
      message: "What company do you work for?",
      nextStep: 'collect_company',
      requiresInput: true,
      inputType: 'text'
    };
  }

  /**
   * Handle company collection
   */
  private handleCompanyCollection(input: string): RegistrationResponse {
    this.registrationData.company = input.trim();

    return {
      message: `What's your role at ${this.registrationData.company}? You can choose from: ${ROLES_OPTIONS.join(', ')}`,
      nextStep: 'collect_role',
      requiresInput: true,
      inputType: 'select',
      options: ROLES_OPTIONS
    };
  }

  /**
   * Handle role collection
   */
  private handleRoleCollection(input: string): RegistrationResponse {
    // Try to match input to available roles
    const matchedRole = ROLES_OPTIONS.find(role =>
      role.toLowerCase().includes(input.toLowerCase()) ||
      input.toLowerCase().includes(role.toLowerCase())
    );

    this.registrationData.role = matchedRole || input.trim();

    return {
      message: `Last question! What are your main interests for the conference? Choose any that apply:\n\n${INTERESTS_OPTIONS.map((interest, i) => `${i+1}. ${interest}`).join('\n')}\n\nYou can list multiple interests separated by commas, or just say 'skip' to finish.`,
      nextStep: 'collect_interests',
      requiresInput: true,
      inputType: 'multi-select',
      options: INTERESTS_OPTIONS
    };
  }

  /**
   * Handle interests collection
   */
  private handleInterestsCollection(input: string): RegistrationResponse {
    if (input.toLowerCase() === 'skip') {
      this.registrationData.interests = [];
    } else {
      // Parse interests from input
      const interests: string[] = [];

      // Check for numbered selections (1, 2, 3 or 1,2,3)
      const numbers = input.match(/\d+/g);
      if (numbers) {
        numbers.forEach(num => {
          const index = parseInt(num) - 1;
          if (index >= 0 && index < INTERESTS_OPTIONS.length) {
            interests.push(INTERESTS_OPTIONS[index]);
          }
        });
      }

      // Also check for text matches
      INTERESTS_OPTIONS.forEach(interest => {
        if (input.toLowerCase().includes(interest.toLowerCase())) {
          if (!interests.includes(interest)) {
            interests.push(interest);
          }
        }
      });

      this.registrationData.interests = interests.length > 0 ? interests : ['Digital Transformation'];
    }

    return {
      message: "Perfect! I'm creating your account now...",
      nextStep: 'creating_account',
      requiresInput: false
    };
  }

  /**
   * Create the user account and save agenda
   */
  private async createAccount(): Promise<RegistrationResponse> {
    try {
      // Check if email already exists
      const existingUser = await prisma.user.findUnique({
        where: { email: this.registrationData.email! }
      });

      if (existingUser) {
        return {
          message: `This email is already registered. Would you like to:\n1. Sign in to your existing account\n2. Use a different email\n\nJust type '1' or '2', or tell me what you'd prefer.`,
          nextStep: 'collect_email',
          requiresInput: true
        };
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(this.registrationData.password!, 10);

      // Create user
      const user = await prisma.user.create({
        data: {
          email: this.registrationData.email!,
          password: hashedPassword,
          name: this.registrationData.name!,
          company: this.registrationData.company,
          role: this.registrationData.role,
          interests: this.registrationData.interests || []
        }
      });

      // Save agenda if present
      let sessionsSaved = 0;
      if (this.pendingAgenda) {
        sessionsSaved = await this.saveAgendaToProfile(user.id, this.pendingAgenda);
      }

      return {
        message: `✅ **Account created successfully!**\n\n${
          sessionsSaved > 0
            ? `🎯 I've saved your personalized agenda with **${sessionsSaved} sessions** to your profile.\n\n`
            : ''
        }You can now:\n• View your saved sessions in the Favorites section\n• Export your schedule to your calendar\n• Get personalized recommendations\n• Access your agenda from any device\n\nWould you like me to show you more sessions that match your interests in **${this.registrationData.interests?.join(', ')}**?`,
        nextStep: 'complete',
        requiresInput: false,
        success: true,
        userId: user.id,
        sessionsSaved
      };

    } catch (error) {
      console.error('[RegistrationHandler] Account creation error:', error);

      return {
        message: "I encountered an issue creating your account. Let's try again with a different email address:",
        nextStep: 'collect_email',
        requiresInput: true,
        inputType: 'email'
      };
    }
  }

  /**
   * Save agenda sessions to user's profile
   */
  private async saveAgendaToProfile(userId: string, agenda: SmartAgenda): Promise<number> {
    let savedCount = 0;

    try {
      // Save the complete agenda using our storage service
      await savePersonalizedAgenda(userId, agenda, {
        generatedBy: 'ai_agent',
        title: `ITC Vegas 2025 - ${new Date().toLocaleDateString()}`,
        description: 'Your personalized conference agenda created during registration'
      });

      // Count sessions in the agenda
      for (const day of Object.values(agenda.days)) {
        savedCount += day.sessions?.filter((s: any) => s.type === 'session').length || 0;
      }

      // Also save individual sessions as favorites if they were marked
      const favoriteSessionIds: string[] = [];
      for (const day of Object.values(agenda.days)) {
        for (const item of day.sessions || []) {
          if (item.type === 'session' && item.isFavorite && item.sessionId) {
            favoriteSessionIds.push(item.sessionId);
          }
        }
      }

      // Save favorites
      for (const sessionId of favoriteSessionIds) {
        try {
          await prisma.favorite.create({
            data: {
              userId,
              sessionId,
              type: 'session'
            }
          });
        } catch (error) {
          // Ignore duplicate favorites
          console.log(`Session ${sessionId} might already be favorited`);
        }
      }

      // Log success
      console.log(`[Registration] Saved agenda with ${savedCount} sessions for user ${userId}`);

    } catch (error) {
      console.error('[RegistrationHandler] Error saving agenda:', error);
    }

    return savedCount;
  }

  /**
   * Get current registration data
   */
  getRegistrationData(): RegistrationData {
    return this.registrationData;
  }

  /**
   * Get current state
   */
  getCurrentState(): RegistrationState {
    return this.currentState;
  }

  /**
   * Reset registration flow
   */
  reset(): void {
    this.registrationData = {};
    this.currentState = 'offer_save';
  }
}