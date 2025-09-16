/**
 * Agenda Redirect Handler
 * Redirects users to the Smart Agenda page instead of building agendas in chat
 */

import { User } from '@prisma/client';

export interface AgendaRedirectResponse {
  type: 'redirect';
  message: string;
  requiresAuth: boolean;
  requiresProfile: boolean;
}

/**
 * Generate appropriate redirect message based on user state
 */
export function generateAgendaRedirectMessage(
  user: User | null,
  userEmail?: string
): AgendaRedirectResponse {
  // Case 1: User not authenticated
  if (!user && !userEmail) {
    return {
      type: 'redirect',
      requiresAuth: true,
      requiresProfile: true,
      message: `## 📅 Ready to Build Your Personalized Agenda!

I'd love to help you create a customized ITC Vegas 2025 schedule! To use our Smart Agenda Builder, you'll need to:

**1. Create a free account** 🆕
   Click "Sign Up" in the top navigation or [create an account here](/auth/signin)

**2. Complete your profile** 👤
   Tell us about:
   • Your role (Executive, Developer, Product Manager, etc.)
   • Your company and industry type
   • Topics that interest you (AI, Cybersecurity, Claims Tech, etc.)
   • Your conference goals

**3. Access the Smart Agenda Builder** 🎯
   Once your profile is set up, visit the [Smart Agenda page](/smart-agenda) to:
   • Get AI-powered session recommendations
   • Build a personalized day-by-day schedule
   • Optimize for your interests and networking goals
   • Save and modify your agenda anytime

**Why create an account?**
• Save your personalized agenda
• Get recommendations based on your interests
• Track favorite sessions and speakers
• Access your schedule on any device

💡 **Quick Tip:** The Smart Agenda Builder uses AI to analyze all 295+ sessions and match them to your specific interests and goals, ensuring you don't miss the most relevant content!

Ready to get started? [Sign up now](/auth/signin) - it only takes a minute!`
    };
  }

  // Case 2: User authenticated but profile incomplete
  if (user) {
    const profileComplete = user.role && user.company && user.interests && user.interests.length > 0;

    if (!profileComplete) {
      const missingItems = [];
      if (!user.role) missingItems.push('• Your professional role');
      if (!user.company) missingItems.push('• Your company name');
      if (!user.interests || user.interests.length === 0) missingItems.push('• Your topics of interest');

      return {
        type: 'redirect',
        requiresAuth: false,
        requiresProfile: true,
        message: `## 📋 Complete Your Profile First!

Hi ${user.name || 'there'}! To build your personalized agenda, I need to know more about you.

**Your profile is missing:**
${missingItems.join('\n')}

**Next steps:**
1. **[Complete your profile](/profile)** with the missing information
2. **[Visit the Smart Agenda Builder](/smart-agenda)** to create your personalized schedule

The Smart Agenda Builder will:
• Analyze all 295+ sessions based on your interests
• Create an optimized day-by-day schedule
• Highlight must-attend sessions for your role
• Include networking opportunities
• Balance technical and business content

🎯 **[Update your profile now](/profile)** to unlock personalized recommendations!`
      };
    }

    // Case 3: User authenticated with complete profile - ready to use Smart Agenda
    return {
      type: 'redirect',
      requiresAuth: false,
      requiresProfile: false,
      message: `## 🚀 Let's Build Your Personalized Agenda!

Great news, ${user.name || 'there'}! You're all set to create your customized ITC Vegas 2025 schedule.

**Your Profile:**
• **Role:** ${user.role}
• **Company:** ${user.company}
• **Interests:** ${user.interests?.join(', ') || 'Not specified'}

**[Click here to open the Smart Agenda Builder](/smart-agenda)** 🎯

The Smart Agenda Builder will:
• Create a personalized 3-day schedule
• Match sessions to your ${user.interests?.length || 0} areas of interest
• Optimize for ${user.role} professionals
• Include networking events and breaks
• Allow you to customize and save your schedule

**What happens next:**
1. Click the link above to go to the Smart Agenda page
2. Review AI-recommended sessions
3. Customize your schedule as needed
4. Save and access it anytime

💡 **Tip:** The Smart Agenda page lets you filter by day, track, and time - plus you can always modify your saved agenda!

**[Open Smart Agenda Builder →](/smart-agenda)**`
    };
  }

  // Fallback case
  return {
    type: 'redirect',
    requiresAuth: true,
    requiresProfile: true,
    message: `## 📅 Build Your Conference Schedule

To create a personalized agenda for ITC Vegas 2025, please:

1. **[Sign in or create an account](/auth/signin)**
2. **Complete your profile** with your interests and goals
3. **Visit the [Smart Agenda page](/smart-agenda)** to build your schedule

The Smart Agenda Builder will help you:
• Discover relevant sessions
• Optimize your time at the conference
• Never miss important content
• Plan networking opportunities

[Get started now →](/auth/signin)`
  };
}

/**
 * Check if a message is asking about building an agenda
 */
export function isAgendaRequest(message: string): boolean {
  const agendaKeywords = [
    'build.*agenda',
    'create.*schedule',
    'personalized.*agenda',
    'my.*agenda',
    'conference.*schedule',
    'build.*schedule',
    'create.*agenda',
    'plan.*day',
    'what should i attend',
    'sessions.*for me',
    'recommend.*sessions',
    'personalize.*schedule'
  ];

  const lowerMessage = message.toLowerCase();
  return agendaKeywords.some(pattern => {
    const regex = new RegExp(pattern, 'i');
    return regex.test(lowerMessage);
  });
}