/**
 * Intelligent Query Interpreter
 * Understands compound topics and maps abstract queries to conference content
 */

export interface InterpretedQuery {
  originalQuery: string;
  interpretedTopics: string[];
  suggestedSearchTerms: string[];
  domainConnections: string[];
  conferenceContext: string;
  searchStrategy: 'direct' | 'expanded' | 'conceptual';
}

/**
 * Domain-specific topic mappings for insurance/insurtech
 */
const DOMAIN_MAPPINGS: Record<string, string[]> = {
  // AI + Weather/Climate = Risk Assessment
  'ai+weather': ['climate risk', 'catastrophe modeling', 'parametric insurance', 'weather derivatives', 'natural disaster prediction', 'risk analytics'],
  'ai+climate': ['climate change risk', 'ESG', 'sustainability', 'environmental modeling', 'carbon footprint', 'green insurance'],

  // AI + Specific Insurance Domains
  'ai+underwriting': ['automated underwriting', 'risk assessment', 'predictive modeling', 'pricing optimization', 'loss prediction'],
  'ai+claims': ['claims automation', 'fraud detection', 'damage assessment', 'computer vision', 'claims triage', 'straight-through processing'],
  'ai+fraud': ['fraud detection', 'anomaly detection', 'pattern recognition', 'behavioral analytics', 'investigation tools'],
  'ai+customer': ['chatbots', 'personalization', 'customer experience', 'NLP', 'virtual assistants', 'omnichannel'],

  // Data + Insurance
  'data+risk': ['risk analytics', 'predictive modeling', 'actuarial science', 'loss modeling', 'portfolio management'],
  'data+customer': ['customer analytics', 'segmentation', 'lifetime value', 'churn prediction', 'behavioral analytics'],

  // Blockchain + Insurance
  'blockchain+claims': ['smart contracts', 'automated claims', 'parametric triggers', 'transparency', 'distributed ledger'],
  'blockchain+fraud': ['immutable records', 'verification', 'identity management', 'audit trail', 'compliance'],

  // Cyber + Various
  'cyber+risk': ['cyber insurance', 'threat assessment', 'incident response', 'security posture', 'breach coverage'],
  'cyber+underwriting': ['cyber risk assessment', 'security scoring', 'vulnerability analysis', 'exposure modeling'],

  // IoT + Insurance
  'iot+auto': ['telematics', 'usage-based insurance', 'driver behavior', 'connected cars', 'real-time monitoring'],
  'iot+home': ['smart home insurance', 'preventive maintenance', 'water leak detection', 'security monitoring'],
  'iot+health': ['wearables', 'health monitoring', 'preventive care', 'wellness programs', 'activity tracking'],

  // Regulatory + Tech
  'regulation+technology': ['regtech', 'compliance automation', 'reporting', 'GDPR', 'data privacy', 'regulatory sandbox'],
  'regulation+ai': ['AI governance', 'ethical AI', 'bias detection', 'explainability', 'transparency', 'fairness'],

  // Innovation + Various
  'innovation+distribution': ['embedded insurance', 'API economy', 'partnerships', 'digital channels', 'insurtech ecosystems'],
  'innovation+products': ['parametric insurance', 'on-demand coverage', 'micro-insurance', 'usage-based', 'personalized products'],
};

/**
 * Concept expansion for abstract terms
 */
const CONCEPT_EXPANSIONS: Record<string, string[]> = {
  'future': ['trends', 'innovation', 'emerging technology', 'predictions', 'roadmap', 'transformation'],
  'disruption': ['innovation', 'transformation', 'new business models', 'challengers', 'insurtech startups'],
  'efficiency': ['automation', 'optimization', 'cost reduction', 'process improvement', 'digital transformation'],
  'growth': ['market expansion', 'customer acquisition', 'revenue optimization', 'scaling', 'business development'],
  'transformation': ['digitalization', 'modernization', 'cloud migration', 'legacy replacement', 'agile'],
  'strategy': ['roadmap', 'planning', 'competitive advantage', 'market positioning', 'business model'],
  'impact': ['ROI', 'business value', 'outcomes', 'results', 'benefits', 'case studies'],
  'challenges': ['obstacles', 'barriers', 'problems', 'pain points', 'solutions'],
  'opportunities': ['potential', 'growth areas', 'emerging markets', 'new products', 'partnerships'],
  'best practices': ['lessons learned', 'success stories', 'implementation guide', 'methodology', 'framework'],
};

/**
 * Insurance-specific terminology mapping
 */
const INSURANCE_TERMS: Record<string, string[]> = {
  'coverage': ['policy', 'protection', 'insurance products', 'limits', 'deductibles'],
  'risk': ['exposure', 'hazard', 'peril', 'loss', 'probability'],
  'premium': ['pricing', 'rate', 'cost', 'actuarial', 'underwriting'],
  'policy': ['contract', 'coverage', 'terms', 'conditions', 'endorsements'],
  'carrier': ['insurer', 'insurance company', 'underwriter', 'capacity'],
  'broker': ['agent', 'intermediary', 'distribution', 'advisor', 'MGA'],
  'reinsurance': ['retrocession', 'capacity', 'treaty', 'facultative', 'cat bonds'],
  'actuarial': ['pricing', 'reserving', 'modeling', 'statistics', 'risk assessment'],
};

/**
 * Intelligently interprets user queries to understand compound topics
 */
export function interpretQuery(query: string): InterpretedQuery {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/);

  const interpretedTopics: string[] = [];
  const suggestedSearchTerms: string[] = [];
  const domainConnections: string[] = [];

  // Check for compound topic patterns
  const compoundPatterns = detectCompoundTopics(lowerQuery);
  if (compoundPatterns.length > 0) {
    domainConnections.push(...compoundPatterns);
    compoundPatterns.forEach(pattern => {
      if (DOMAIN_MAPPINGS[pattern]) {
        suggestedSearchTerms.push(...DOMAIN_MAPPINGS[pattern]);
      }
    });
  }

  // Expand abstract concepts
  words.forEach(word => {
    if (CONCEPT_EXPANSIONS[word]) {
      interpretedTopics.push(...CONCEPT_EXPANSIONS[word]);
    }
    if (INSURANCE_TERMS[word]) {
      suggestedSearchTerms.push(...INSURANCE_TERMS[word]);
    }
  });

  // Detect question intent and add relevant search terms
  const questionIntent = detectQuestionIntent(lowerQuery);
  if (questionIntent) {
    interpretedTopics.push(questionIntent);
  }

  // Determine search strategy
  const searchStrategy = determineSearchStrategy(query, interpretedTopics, domainConnections);

  // Generate conference context
  const conferenceContext = generateConferenceContext(query, interpretedTopics, domainConnections);

  // Add original terms if not already included
  const originalTerms = extractKeyTerms(query);
  suggestedSearchTerms.push(...originalTerms);

  // Remove duplicates
  const uniqueTopics = [...new Set(interpretedTopics)];
  const uniqueSearchTerms = [...new Set(suggestedSearchTerms)];
  const uniqueDomainConnections = [...new Set(domainConnections)];

  return {
    originalQuery: query,
    interpretedTopics: uniqueTopics,
    suggestedSearchTerms: uniqueSearchTerms,
    domainConnections: uniqueDomainConnections,
    conferenceContext,
    searchStrategy
  };
}

/**
 * Detects compound topic patterns in the query
 */
function detectCompoundTopics(query: string): string[] {
  const patterns: string[] = [];

  // Check for AI combinations
  if (query.includes('ai') || query.includes('artificial intelligence')) {
    if (query.includes('weather') || query.includes('climate')) {
      patterns.push('ai+weather');
    }
    if (query.includes('claim')) {
      patterns.push('ai+claims');
    }
    if (query.includes('underwrit')) {
      patterns.push('ai+underwriting');
    }
    if (query.includes('fraud')) {
      patterns.push('ai+fraud');
    }
    if (query.includes('customer') || query.includes('client')) {
      patterns.push('ai+customer');
    }
  }

  // Check for blockchain combinations
  if (query.includes('blockchain') || query.includes('distributed ledger')) {
    if (query.includes('claim')) {
      patterns.push('blockchain+claims');
    }
    if (query.includes('fraud')) {
      patterns.push('blockchain+fraud');
    }
  }

  // Check for IoT combinations
  if (query.includes('iot') || query.includes('internet of things') || query.includes('connected')) {
    if (query.includes('auto') || query.includes('car') || query.includes('vehicle')) {
      patterns.push('iot+auto');
    }
    if (query.includes('home') || query.includes('property')) {
      patterns.push('iot+home');
    }
    if (query.includes('health') || query.includes('wellness')) {
      patterns.push('iot+health');
    }
  }

  // Check for cyber combinations
  if (query.includes('cyber')) {
    if (query.includes('risk')) {
      patterns.push('cyber+risk');
    }
    if (query.includes('underwrit')) {
      patterns.push('cyber+underwriting');
    }
  }

  // Check for data combinations
  if (query.includes('data') || query.includes('analytics')) {
    if (query.includes('risk')) {
      patterns.push('data+risk');
    }
    if (query.includes('customer') || query.includes('client')) {
      patterns.push('data+customer');
    }
  }

  return patterns;
}

/**
 * Detects the intent behind the question
 */
function detectQuestionIntent(query: string): string | null {
  if (query.includes('how') && query.includes('will')) {
    return 'future impact';
  }
  if (query.includes('what') && query.includes('trend')) {
    return 'emerging trends';
  }
  if (query.includes('should') || query.includes('best')) {
    return 'best practices';
  }
  if (query.includes('challenge') || query.includes('problem')) {
    return 'solutions';
  }
  if (query.includes('opportunit')) {
    return 'growth potential';
  }
  if (query.includes('implement') || query.includes('adopt')) {
    return 'implementation strategy';
  }
  return null;
}

/**
 * Extracts key terms from the original query
 */
function extractKeyTerms(query: string): string[] {
  // Remove common words and extract meaningful terms
  const stopWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'an', 'as', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'could', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'what', 'which', 'who', 'when', 'where', 'why', 'how'];

  const words = query.toLowerCase().split(/\s+/);
  const keyTerms = words.filter(word =>
    word.length > 2 &&
    !stopWords.includes(word) &&
    !word.match(/^\d+$/) // Not just numbers
  );

  return keyTerms;
}

/**
 * Determines the best search strategy based on the query
 */
function determineSearchStrategy(
  query: string,
  interpretedTopics: string[],
  domainConnections: string[]
): 'direct' | 'expanded' | 'conceptual' {
  // If we have domain connections, use expanded search
  if (domainConnections.length > 0) {
    return 'expanded';
  }

  // If we have many interpreted topics, use conceptual search
  if (interpretedTopics.length > 3) {
    return 'conceptual';
  }

  // For simple queries, use direct search
  if (query.split(' ').length < 5) {
    return 'direct';
  }

  return 'expanded';
}

/**
 * Generates conference-specific context for the query
 */
function generateConferenceContext(
  query: string,
  interpretedTopics: string[],
  domainConnections: string[]
): string {
  let context = 'For this query about ';

  if (domainConnections.length > 0) {
    // Handle compound topics
    const connections = domainConnections.map(conn => {
      const [topic1, topic2] = conn.split('+');
      return `${topic1} and ${topic2}`;
    }).join(', ');
    context += `the intersection of ${connections}, look for sessions covering: `;

    // Add specific session types based on domain connections
    domainConnections.forEach(conn => {
      if (conn.includes('ai+weather')) {
        context += 'climate risk modeling, catastrophe analytics, parametric insurance solutions, weather-based products, ';
      }
      if (conn.includes('ai+claims')) {
        context += 'claims automation, fraud detection, damage assessment technology, straight-through processing, ';
      }
      if (conn.includes('iot')) {
        context += 'telematics, connected devices, real-time data collection, preventive monitoring, ';
      }
    });
  } else if (interpretedTopics.length > 0) {
    // Handle interpreted topics
    context += `${interpretedTopics.slice(0, 3).join(', ')}, focus on sessions about `;
    context += interpretedTopics.join(', ') + ', ';
  } else {
    // Fallback to original query
    context += `"${query}", search for relevant `;
  }

  context += 'including keynotes, panels, workshops, and technical sessions. ';
  context += 'Connect the response to specific ITC Vegas 2025 sessions, speakers, and companies. ';
  context += 'Always provide actionable next steps and session recommendations.';

  return context;
}

/**
 * Generates an enhanced search query for better session matching
 */
export function generateEnhancedSearchQuery(interpretation: InterpretedQuery): string {
  const terms = [
    ...interpretation.suggestedSearchTerms.slice(0, 5),
    ...interpretation.interpretedTopics.slice(0, 3)
  ];

  // Remove duplicates and join
  const uniqueTerms = [...new Set(terms)];
  return uniqueTerms.join(' ');
}

/**
 * Creates guidance for the AI on how to respond to the interpreted query
 */
export function generateAIGuidance(interpretation: InterpretedQuery): string {
  let guidance = `\n## INTELLIGENT QUERY INTERPRETATION\n`;
  guidance += `User is asking about: "${interpretation.originalQuery}"\n\n`;

  if (interpretation.domainConnections.length > 0) {
    guidance += `### COMPOUND TOPIC DETECTED\n`;
    guidance += `This query involves the intersection of multiple domains:\n`;
    interpretation.domainConnections.forEach(conn => {
      const [topic1, topic2] = conn.split('+');
      guidance += `- ${topic1.toUpperCase()} + ${topic2.toUpperCase()}\n`;
    });
    guidance += `\nYou MUST find and recommend sessions that address these intersections, such as:\n`;

    // Add specific guidance based on domain connections
    interpretation.domainConnections.forEach(conn => {
      if (DOMAIN_MAPPINGS[conn]) {
        guidance += `- Sessions about: ${DOMAIN_MAPPINGS[conn].join(', ')}\n`;
      }
    });
  }

  if (interpretation.searchStrategy === 'conceptual') {
    guidance += `\n### CONCEPTUAL SEARCH REQUIRED\n`;
    guidance += `This is an abstract or conceptual query. Look beyond literal keyword matches.\n`;
    guidance += `Consider sessions that address the underlying concepts:\n`;
    interpretation.interpretedTopics.forEach(topic => {
      guidance += `- ${topic}\n`;
    });
  }

  guidance += `\n### RESPONSE REQUIREMENTS\n`;
  guidance += `1. ALWAYS connect the answer to specific conference sessions\n`;
  guidance += `2. Interpret the question intelligently - don't just match keywords\n`;
  guidance += `3. For compound topics, find sessions at the intersection\n`;
  guidance += `4. Provide 3-5 highly relevant session recommendations\n`;
  guidance += `5. Include speaker names and clickable links\n`;
  guidance += `6. Explain WHY each session is relevant to the query\n`;
  guidance += `7. If discussing trends or impacts, cite specific conference content\n`;
  guidance += `8. End with actionable next steps for the attendee\n\n`;

  guidance += interpretation.conferenceContext;

  return guidance;
}