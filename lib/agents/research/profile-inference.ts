/**
 * Profile Inference Engine
 * Uses AI to infer user characteristics from research data
 */

import Anthropic from '@anthropic-ai/sdk';
import { BasicUserInfo, ResearchContext } from '../user-profile-researcher';

export interface ProfileInference {
  interests: string[];
  experienceLevel: 'Entry' | 'Mid' | 'Senior' | 'Executive';
  focusAreas: string[];
  goals: string[];
  companyInitiatives: string[];
  technicalProficiency: 'Basic' | 'Intermediate' | 'Advanced';
  networkingPreferences: string[];
  learningStyle: 'Hands-on' | 'Strategic' | 'Technical' | 'Mixed';
}

export interface InferenceOptions {
  userInfo: BasicUserInfo;
  researchContext: ResearchContext;
  depth: 'basic' | 'detailed' | 'comprehensive';
}

/**
 * Use AI to infer profile characteristics from research
 */
export async function inferProfileFromResearch(
  options: InferenceOptions
): Promise<ProfileInference> {
  // Check if we have API key for AI inference
  const hasAnthropicAPI = process.env.ANTHROPIC_API_KEY &&
                          !process.env.ANTHROPIC_API_KEY.includes('<your');

  if (hasAnthropicAPI) {
    try {
      return await performAIInference(options);
    } catch (error) {
      console.error('[ProfileInference] AI inference failed:', error);
      // Fall back to rule-based inference
    }
  }

  // Fallback to rule-based inference
  return performRuleBasedInference(options);
}

/**
 * AI-powered inference using Claude
 */
async function performAIInference(options: InferenceOptions): Promise<ProfileInference> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY || ''
  });

  const prompt = buildInferencePrompt(options);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-haiku-20240307', // Fast model for inference
      max_tokens: 1000,
      temperature: 0.3, // Lower temperature for consistent inference
      messages: [{
        role: 'user',
        content: prompt
      }]
    });

    const content = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    return parseAIResponse(content);
  } catch (error) {
    console.error('[ProfileInference] Claude API error:', error);
    throw error;
  }
}

/**
 * Build prompt for AI inference
 */
function buildInferencePrompt(options: InferenceOptions): string {
  const { userInfo, researchContext, depth } = options;

  return `You are an expert at analyzing professional profiles for conference personalization.

Based on the following information about a user, infer their professional characteristics:

USER INFORMATION:
- Name: ${userInfo.name}
- Company: ${userInfo.company}
- Title: ${userInfo.title}

RESEARCH FINDINGS:
${researchContext.linkedInSummary ? `LinkedIn: ${researchContext.linkedInSummary}` : ''}
${researchContext.companyFocus ? `Company Focus: ${researchContext.companyFocus}` : ''}
${researchContext.professionalBackground ? `Background: ${researchContext.professionalBackground}` : ''}
${researchContext.expertise ? `Expertise: ${researchContext.expertise.join(', ')}` : ''}
${researchContext.recentProjects ? `Projects: ${researchContext.recentProjects.join('; ')}` : ''}

Please infer the following characteristics. Be specific and relevant to the insurance industry conference context.
Return your response in JSON format with these exact fields:

{
  "interests": ["5-8 specific technology/business interests relevant to insurance"],
  "experienceLevel": "Entry|Mid|Senior|Executive",
  "focusAreas": ["3-5 specific areas they likely focus on"],
  "goals": ["3-5 likely conference goals"],
  "companyInitiatives": ["2-4 initiatives their company is likely pursuing"],
  "technicalProficiency": "Basic|Intermediate|Advanced",
  "networkingPreferences": ["2-3 types of people they'd want to meet"],
  "learningStyle": "Hands-on|Strategic|Technical|Mixed"
}

${depth === 'comprehensive' ? 'Provide detailed, nuanced inferences with strong justification.' : ''}
${depth === 'basic' ? 'Provide quick, high-level inferences.' : ''}

Focus on:
- Insurance industry relevance
- Current technology trends (AI, automation, cyber, embedded insurance)
- Role-appropriate interests
- Company-aligned initiatives`;
}

/**
 * Parse AI response into structured inference
 */
function parseAIResponse(response: string): ProfileInference {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return validateInference(parsed);
    }
  } catch (error) {
    console.error('[ProfileInference] Failed to parse AI response:', error);
  }

  // Return default if parsing fails
  return getDefaultInference();
}

/**
 * Rule-based inference fallback
 */
function performRuleBasedInference(options: InferenceOptions): ProfileInference {
  const { userInfo, researchContext } = options;
  const titleLower = userInfo.title.toLowerCase();
  const companyInfo = researchContext.companyFocus?.toLowerCase() || '';

  const inference: ProfileInference = {
    interests: [],
    experienceLevel: 'Mid',
    focusAreas: [],
    goals: [],
    companyInitiatives: [],
    technicalProficiency: 'Intermediate',
    networkingPreferences: [],
    learningStyle: 'Mixed'
  };

  // Infer experience level from title
  if (titleLower.includes('chief') || titleLower.includes('president') ||
      titleLower.includes('evp') || titleLower.includes('head of')) {
    inference.experienceLevel = 'Executive';
  } else if (titleLower.includes('senior') || titleLower.includes('director') ||
             titleLower.includes('vp') || titleLower.includes('principal')) {
    inference.experienceLevel = 'Senior';
  } else if (titleLower.includes('junior') || titleLower.includes('associate') ||
             titleLower.includes('analyst') || titleLower.includes('coordinator')) {
    inference.experienceLevel = 'Entry';
  }

  // Infer interests based on title and research
  if (titleLower.includes('tech') || titleLower.includes('it') ||
      titleLower.includes('digital') || titleLower.includes('innovation')) {
    inference.interests.push('AI & Automation', 'Digital Transformation', 'Cloud Technology');
    inference.technicalProficiency = 'Advanced';
    inference.learningStyle = 'Technical';
  }

  if (titleLower.includes('product')) {
    inference.interests.push('Product Innovation', 'Customer Experience', 'Digital Products');
    inference.learningStyle = 'Mixed';
  }

  if (titleLower.includes('data') || titleLower.includes('analytics')) {
    inference.interests.push('Data & Analytics', 'AI & Machine Learning', 'Predictive Modeling');
    inference.technicalProficiency = 'Advanced';
  }

  if (titleLower.includes('cyber') || titleLower.includes('security')) {
    inference.interests.push('Cybersecurity', 'Risk Management', 'Compliance');
  }

  if (titleLower.includes('claims')) {
    inference.interests.push('Claims Technology', 'Automation', 'Customer Experience');
    inference.focusAreas.push('Claims Modernization', 'Fraud Detection');
  }

  if (titleLower.includes('underwriting')) {
    inference.interests.push('Underwriting Innovation', 'Risk Assessment', 'AI & Automation');
    inference.focusAreas.push('Automated Underwriting', 'Risk Modeling');
  }

  // Add company-based initiatives
  if (companyInfo.includes('digital') || companyInfo.includes('transform')) {
    inference.companyInitiatives.push('Digital Transformation');
  }
  if (companyInfo.includes('ai') || companyInfo.includes('automation')) {
    inference.companyInitiatives.push('AI Implementation');
  }
  if (companyInfo.includes('customer') || companyInfo.includes('experience')) {
    inference.companyInitiatives.push('Customer Experience Enhancement');
  }

  // Infer goals based on role
  if (inference.experienceLevel === 'Executive') {
    inference.goals.push(
      'Strategic partnerships',
      'Industry trends',
      'Innovation strategies',
      'Competitive insights'
    );
    inference.networkingPreferences.push('Other executives', 'Strategic partners');
    inference.learningStyle = 'Strategic';
  } else if (inference.experienceLevel === 'Senior') {
    inference.goals.push(
      'Best practices',
      'Implementation strategies',
      'Vendor evaluation',
      'Team development'
    );
    inference.networkingPreferences.push('Solution providers', 'Industry peers');
  } else {
    inference.goals.push(
      'Learn new technologies',
      'Skill development',
      'Career growth',
      'Industry knowledge'
    );
    inference.networkingPreferences.push('Mentors', 'Peers', 'Recruiters');
    inference.learningStyle = 'Hands-on';
  }

  // Add default focus areas if none identified
  if (inference.focusAreas.length === 0) {
    inference.focusAreas.push(
      'Innovation',
      'Digital Transformation',
      'Operational Excellence'
    );
  }

  // Ensure we have at least some interests
  if (inference.interests.length === 0) {
    inference.interests.push(
      'InsurTech Innovation',
      'Digital Transformation',
      'Industry Trends'
    );
  }

  return inference;
}

/**
 * Validate and clean inference data
 */
function validateInference(data: any): ProfileInference {
  const validated: ProfileInference = {
    interests: Array.isArray(data.interests) ? data.interests.slice(0, 8) : [],
    experienceLevel: ['Entry', 'Mid', 'Senior', 'Executive'].includes(data.experienceLevel)
      ? data.experienceLevel
      : 'Mid',
    focusAreas: Array.isArray(data.focusAreas) ? data.focusAreas.slice(0, 5) : [],
    goals: Array.isArray(data.goals) ? data.goals.slice(0, 5) : [],
    companyInitiatives: Array.isArray(data.companyInitiatives)
      ? data.companyInitiatives.slice(0, 4)
      : [],
    technicalProficiency: ['Basic', 'Intermediate', 'Advanced'].includes(data.technicalProficiency)
      ? data.technicalProficiency
      : 'Intermediate',
    networkingPreferences: Array.isArray(data.networkingPreferences)
      ? data.networkingPreferences.slice(0, 3)
      : [],
    learningStyle: ['Hands-on', 'Strategic', 'Technical', 'Mixed'].includes(data.learningStyle)
      ? data.learningStyle
      : 'Mixed'
  };

  // Ensure minimum data
  if (validated.interests.length === 0) {
    validated.interests = ['InsurTech Innovation', 'Digital Transformation'];
  }
  if (validated.goals.length === 0) {
    validated.goals = ['Learn about new technologies', 'Network with peers'];
  }

  return validated;
}

/**
 * Get default inference when all else fails
 */
function getDefaultInference(): ProfileInference {
  return {
    interests: [
      'InsurTech Innovation',
      'Digital Transformation',
      'AI & Automation',
      'Customer Experience'
    ],
    experienceLevel: 'Mid',
    focusAreas: [
      'Innovation',
      'Technology Adoption',
      'Process Improvement'
    ],
    goals: [
      'Learn about new technologies',
      'Network with peers',
      'Discover best practices',
      'Find solution providers'
    ],
    companyInitiatives: [
      'Digital Transformation',
      'Customer Experience'
    ],
    technicalProficiency: 'Intermediate',
    networkingPreferences: [
      'Industry peers',
      'Solution providers'
    ],
    learningStyle: 'Mixed'
  };
}