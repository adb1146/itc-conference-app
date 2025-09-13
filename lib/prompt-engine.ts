/**
 * Advanced Prompt Engineering System
 * Enhances AI responses to match Claude Code-level sophistication
 */

export interface QueryContext {
  userMessage: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  userProfile?: any;
  sessionData?: any[];
  intent?: string;
  complexity?: 'simple' | 'moderate' | 'complex';
}

export interface EnhancedPrompt {
  systemPrompt: string;
  enhancedUserMessage: string;
  thinkingInstructions: string;
  responseGuidelines: string;
}

/**
 * Analyzes query complexity to determine enhancement level
 */
export function analyzeQueryComplexity(message: string): 'simple' | 'moderate' | 'complex' {
  const lowerMessage = message.toLowerCase();
  const wordCount = message.split(' ').length;
  
  // Simple queries: basic questions with straightforward answers
  const simplePatterns = [
    /^(what|when|where|who) (is|are|was|were)/,
    /^how many/,
    /^list/,
    /^show me/,
  ];
  
  if (simplePatterns.some(pattern => pattern.test(lowerMessage)) && wordCount < 10) {
    return 'simple';
  }
  
  // Complex queries: require analysis, comparison, or strategy
  const complexIndicators = [
    'recommend', 'suggest', 'analyze', 'compare', 'strategy',
    'should i', 'what if', 'how can i', 'optimize', 'best',
    'conflict', 'prioritize', 'evaluate', 'decide', 'plan'
  ];
  
  if (complexIndicators.some(indicator => lowerMessage.includes(indicator)) || 
      wordCount > 30 || 
      message.includes('?') && message.split('?').length > 2) {
    return 'complex';
  }
  
  return 'moderate';
}

/**
 * Generates thinking instructions based on query type
 */
export function generateThinkingInstructions(context: QueryContext): string {
  const complexity = context.complexity || analyzeQueryComplexity(context.userMessage);
  
  const baseThinking = `
THINKING PROCESS (Internal - Structure your reasoning):

1. UNDERSTAND THE QUERY:
   - What is being asked explicitly?
   - What implicit needs or concerns might exist?
   - What context is relevant from the conversation history?

2. ANALYZE THE SITUATION:
   - What are the key factors to consider?
   - Are there any constraints or limitations?
   - What assumptions am I making?
`;

  const moderateThinking = `
3. CONSIDER MULTIPLE PERSPECTIVES:
   - What are different ways to approach this?
   - What are potential pros and cons?
   - Are there non-obvious solutions?

4. IDENTIFY KEY INSIGHTS:
   - What's the most important information?
   - What patterns or connections exist?
   - What might the user not have considered?
`;

  const complexThinking = `
5. DEEP REASONING:
   - Break down the problem into components
   - Analyze relationships and dependencies
   - Consider edge cases and exceptions
   - Evaluate trade-offs systematically

6. SYNTHESIS AND STRATEGY:
   - Combine insights into coherent recommendations
   - Prioritize based on user's goals and context
   - Anticipate potential challenges or objections
   - Develop actionable implementation steps

7. VALIDATION:
   - Check reasoning for logical consistency
   - Ensure recommendations align with user needs
   - Verify factual accuracy
   - Consider if anything important was missed
`;

  let thinking = baseThinking;
  if (complexity === 'moderate' || complexity === 'complex') {
    thinking += moderateThinking;
  }
  if (complexity === 'complex') {
    thinking += complexThinking;
  }
  
  return thinking;
}

/**
 * Enhances the user's message with context and clarity
 */
export function enhanceUserMessage(context: QueryContext): string {
  const { userMessage, userProfile, sessionData } = context;
  
  let enhanced = `User Query: "${userMessage}"`;
  
  // Add context about what kind of response would be most helpful
  enhanced += `\n\nPlease provide a response that:`;
  
  const complexity = context.complexity || analyzeQueryComplexity(userMessage);
  
  if (complexity === 'simple') {
    enhanced += `
- Directly answers the question
- Includes specific relevant details
- Suggests logical next steps if applicable`;
  } else if (complexity === 'moderate') {
    enhanced += `
- Provides comprehensive information
- Explains the reasoning behind recommendations
- Includes practical examples or scenarios
- Anticipates follow-up questions`;
  } else {
    enhanced += `
- Demonstrates deep analysis and reasoning
- Considers multiple perspectives and trade-offs
- Provides strategic recommendations with justification
- Includes specific action items and implementation guidance
- Addresses potential challenges and solutions`;
  }
  
  // Add user context if available
  if (userProfile) {
    enhanced += `\n\nConsider the user's context:
- Role: ${userProfile.role || 'Not specified'}
- Interests: ${userProfile.interests?.join(', ') || 'Not specified'}
- Goals: ${userProfile.goals?.join(', ') || 'Not specified'}`;
  }
  
  return enhanced;
}

/**
 * Generates response guidelines for formatting and quality
 */
export function generateResponseGuidelines(context: QueryContext): string {
  const complexity = context.complexity || analyzeQueryComplexity(context.userMessage);
  
  let guidelines = `
RESPONSE STRUCTURE AND QUALITY:

1. CLARITY AND ORGANIZATION:
   - Start with the core answer or key insight
   - Use clear sections with markdown formatting
   - Progress from overview to details
   - Maintain logical flow throughout
`;

  if (complexity !== 'simple') {
    guidelines += `
2. DEMONSTRATE INTELLIGENCE:
   - Show your reasoning process naturally
   - Connect disparate pieces of information
   - Identify patterns and relationships
   - Provide insights beyond the obvious
   - Acknowledge uncertainty when appropriate

3. ACTIONABILITY:
   - Include specific, implementable recommendations
   - Provide clear next steps
   - Prioritize actions by importance
   - Consider resource constraints
`;
  }

  if (complexity === 'complex') {
    guidelines += `
4. STRATEGIC THINKING:
   - Address short-term and long-term considerations
   - Identify dependencies and prerequisites
   - Suggest metrics for success
   - Provide contingency options
   - Frame decisions in context of goals

5. ANTICIPATION:
   - Address likely follow-up questions proactively
   - Identify potential challenges before they arise
   - Suggest related areas to explore
   - Provide resources for deeper learning
`;
  }

  guidelines += `
IMPORTANT: 
- Be conversational but professional
- Use examples to illustrate complex points
- Admit limitations honestly
- Focus on practical value over theoretical completeness`;

  return guidelines;
}

/**
 * Main function to create an enhanced prompt
 */
export function createEnhancedPrompt(
  context: QueryContext,
  baseSystemPrompt: string
): EnhancedPrompt {
  // Analyze complexity
  const complexity = analyzeQueryComplexity(context.userMessage);
  context.complexity = complexity;
  
  // Generate components
  const thinkingInstructions = generateThinkingInstructions(context);
  const enhancedUserMessage = enhanceUserMessage(context);
  const responseGuidelines = generateResponseGuidelines(context);
  
  // Combine into master system prompt
  const systemPrompt = `
${baseSystemPrompt}

MASTER ENHANCEMENT INSTRUCTIONS:
=====================================

${thinkingInstructions}

${responseGuidelines}

REASONING FRAMEWORK:
- For simple queries: Provide clear, direct answers with relevant context
- For moderate queries: Show reasoning, provide examples, anticipate needs
- For complex queries: Deep analysis, multiple perspectives, strategic recommendations

Remember: Your goal is to provide responses that demonstrate genuine intelligence and understanding, similar to how a expert human consultant would approach the problem.

Current Query Complexity Level: ${complexity.toUpperCase()}
=====================================
`;

  return {
    systemPrompt,
    enhancedUserMessage,
    thinkingInstructions,
    responseGuidelines
  };
}

/**
 * Post-processes response to ensure quality
 */
export function validateResponseQuality(response: string, context: QueryContext): {
  isValid: boolean;
  suggestions?: string[];
} {
  const complexity = context.complexity || analyzeQueryComplexity(context.userMessage);
  const issues: string[] = [];
  
  // Check for minimum quality indicators
  if (response.length < 100 && complexity !== 'simple') {
    issues.push('Response may be too brief for the query complexity');
  }
  
  if (complexity === 'complex' && !response.includes('recommend')) {
    issues.push('Complex query should include recommendations');
  }
  
  if (!response.includes('\n') && response.length > 200) {
    issues.push('Long response should use formatting for readability');
  }
  
  // Check for actionability
  const actionWords = ['can', 'should', 'try', 'consider', 'recommend', 'suggest'];
  const hasActionability = actionWords.some(word => response.toLowerCase().includes(word));
  
  if (complexity !== 'simple' && !hasActionability) {
    issues.push('Response should include actionable guidance');
  }
  
  return {
    isValid: issues.length === 0,
    suggestions: issues.length > 0 ? issues : undefined
  };
}

/**
 * Adds a self-reflection pass for complex queries
 */
export function generateSelfReflectionPrompt(
  initialResponse: string,
  context: QueryContext
): string {
  return `
Review this response for the user's query: "${context.userMessage}"

Initial Response:
${initialResponse}

Please evaluate:
1. Does this fully address what was asked?
2. Is the reasoning clear and logical?
3. Are the recommendations practical and actionable?
4. Have I anticipated likely follow-up questions?
5. Is there anything important I've missed?

If you identify any gaps or improvements, provide an enhanced version. Otherwise, confirm the response is comprehensive.
`;
}