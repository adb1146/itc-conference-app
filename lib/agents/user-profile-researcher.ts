/**
 * User Profile Research Agent
 * Following best practices: Complete workflow agent that researches users and generates enriched profiles
 */

import { WebSearchResult, performWebSearch } from './research/web-researcher';
import { inferProfileFromResearch, ProfileInference } from './research/profile-inference';
import { generateEmbedding } from '@/lib/vector-db';
import prisma from '@/lib/db';

export interface BasicUserInfo {
  name: string;
  company: string;
  title: string;
  email?: string;
}

export interface ResearchContext {
  linkedInSummary?: string;
  companyFocus?: string;
  recentProjects?: string[];
  industryContext?: string;
  professionalBackground?: string;
  expertise?: string[];
}

export interface EnrichedUserProfile {
  basicInfo: BasicUserInfo;
  inferred: ProfileInference;
  research: ResearchContext;
  recommendations: {
    mustAttendSessions: string[];
    networkingTargets: string[];
    vendorsToMeet: string[];
    learningPaths: string[];
  };
  metadata: {
    researchConfidence: number;
    dataCompleteness: number;
    lastUpdated: Date;
  };
}

export interface ResearchAgentOptions {
  maxSearchResults?: number;
  includeLinkedIn?: boolean;
  includeCompanyNews?: boolean;
  inferenceDepth?: 'basic' | 'detailed' | 'comprehensive';
}

const DEFAULT_OPTIONS: ResearchAgentOptions = {
  maxSearchResults: 5,
  includeLinkedIn: true,
  includeCompanyNews: true,
  inferenceDepth: 'detailed'
};

/**
 * Main research agent class - completes entire user profiling workflow
 */
export class UserProfileResearchAgent {
  private options: ResearchAgentOptions;

  constructor(options: Partial<ResearchAgentOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Complete workflow: Research user and generate enriched profile
   */
  async researchUser(userInfo: BasicUserInfo): Promise<EnrichedUserProfile> {
    console.log('[ProfileAgent] Starting research for:', userInfo.name);

    // Step 1: Perform comprehensive web research
    const researchResults = await this.performResearch(userInfo);

    // Step 2: Extract and structure research context
    const researchContext = await this.extractResearchContext(researchResults, userInfo);

    // Step 3: Infer profile characteristics using AI
    const inferredProfile = await inferProfileFromResearch({
      userInfo,
      researchContext,
      depth: this.options.inferenceDepth!
    });

    // Step 4: Generate personalized recommendations
    const recommendations = await this.generateRecommendations(
      userInfo,
      inferredProfile,
      researchContext
    );

    // Step 5: Calculate metadata
    const metadata = this.calculateMetadata(researchContext, inferredProfile);

    // Return complete enriched profile
    return {
      basicInfo: userInfo,
      inferred: inferredProfile,
      research: researchContext,
      recommendations,
      metadata
    };
  }

  /**
   * Perform comprehensive web research about the user
   */
  private async performResearch(userInfo: BasicUserInfo): Promise<WebSearchResult[]> {
    const searchQueries = this.buildSearchQueries(userInfo);

    // Run all searches in parallel with timeout
    const searchPromises = searchQueries.map(query =>
      this.performSearchWithTimeout(query, 5000) // 5 second timeout per search
    );

    // Wait for all searches to complete (or timeout)
    const searchResults = await Promise.allSettled(searchPromises);

    // Flatten and filter successful results
    const results: WebSearchResult[] = [];
    for (const result of searchResults) {
      if (result.status === 'fulfilled' && result.value) {
        results.push(...result.value);
      } else if (result.status === 'rejected') {
        console.error('[ProfileAgent] Search failed:', result.reason);
      }
    }

    console.log(`[ProfileAgent] Completed ${searchResults.filter(r => r.status === 'fulfilled').length}/${searchQueries.length} searches`);
    return results;
  }

  /**
   * Perform a single search with timeout
   */
  private async performSearchWithTimeout(
    query: string,
    timeoutMs: number
  ): Promise<WebSearchResult[]> {
    return Promise.race([
      performWebSearch(query, this.options.maxSearchResults!),
      new Promise<WebSearchResult[]>((_, reject) =>
        setTimeout(() => reject(new Error(`Search timeout: ${query}`)), timeoutMs)
      )
    ]);
  }

  /**
   * Build targeted search queries for comprehensive research
   */
  private buildSearchQueries(userInfo: BasicUserInfo): string[] {
    const queries: string[] = [];

    // ESSENTIAL SEARCH 1: Combined professional profile search (reduced from 2 searches)
    if (this.options.includeLinkedIn) {
      queries.push(`"${userInfo.name}" "${userInfo.company}" "${userInfo.title}" LinkedIn insurance profile`);
    }

    // ESSENTIAL SEARCH 2: Combined company and technology context (reduced from 2 searches)
    queries.push(`${userInfo.company} insurance technology "${userInfo.title}" digital transformation initiatives`);

    // OPTIONAL SEARCH 3: Industry trends (only if news enabled and limit to 1)
    if (this.options.includeCompanyNews) {
      queries.push(`${userInfo.title} insurance industry trends 2025 technology`);
    }

    console.log(`[ProfileAgent] Generated ${queries.length} search queries (reduced from 6-8)`);
    return queries;
  }

  /**
   * Extract structured context from research results
   */
  private async extractResearchContext(
    results: WebSearchResult[],
    userInfo: BasicUserInfo
  ): Promise<ResearchContext> {
    const context: ResearchContext = {};

    // Look for LinkedIn profile information
    const linkedInResult = results.find(r =>
      r.url.includes('linkedin.com') &&
      r.snippet.toLowerCase().includes(userInfo.name.toLowerCase())
    );

    if (linkedInResult) {
      context.linkedInSummary = linkedInResult.snippet;
      context.professionalBackground = this.extractProfessionalBackground(linkedInResult);
    }

    // Extract company focus
    const companyResults = results.filter(r =>
      r.snippet.toLowerCase().includes(userInfo.company.toLowerCase())
    );

    if (companyResults.length > 0) {
      context.companyFocus = this.extractCompanyFocus(companyResults);
      context.recentProjects = this.extractProjects(companyResults);
    }

    // Extract industry context
    const industryResults = results.filter(r =>
      r.snippet.includes('insurance') ||
      r.snippet.includes('insurtech')
    );

    if (industryResults.length > 0) {
      context.industryContext = this.synthesizeIndustryContext(industryResults);
    }

    // Extract expertise areas
    context.expertise = this.extractExpertiseAreas(results, userInfo);

    return context;
  }

  /**
   * Generate personalized recommendations based on research
   */
  private async generateRecommendations(
    userInfo: BasicUserInfo,
    inferred: ProfileInference,
    research: ResearchContext
  ): Promise<EnrichedUserProfile['recommendations']> {
    const recommendations: EnrichedUserProfile['recommendations'] = {
      mustAttendSessions: [],
      networkingTargets: [],
      vendorsToMeet: [],
      learningPaths: []
    };

    // Generate session recommendations based on interests
    if (inferred.interests.length > 0) {
      const sessions = await this.findRelevantSessions(inferred.interests);
      recommendations.mustAttendSessions = sessions.slice(0, 5).map(s => s.title);
    }

    // Generate networking recommendations based on role
    recommendations.networkingTargets = this.generateNetworkingTargets(
      userInfo.title,
      inferred.goals
    );

    // Generate vendor recommendations based on company initiatives
    if (research.companyFocus) {
      recommendations.vendorsToMeet = this.identifyRelevantVendors(
        research.companyFocus,
        inferred.focusAreas
      );
    }

    // Generate learning paths based on experience level
    recommendations.learningPaths = this.createLearningPaths(
      inferred.experienceLevel,
      inferred.interests
    );

    return recommendations;
  }

  /**
   * Find relevant sessions using vector search
   */
  private async findRelevantSessions(interests: string[]): Promise<any[]> {
    try {
      // Create a query from interests
      const query = interests.join(', ');

      // Use vector search to find semantically similar sessions
      const sessions = await prisma.session.findMany({
        where: {
          OR: interests.map(interest => ({
            OR: [
              { title: { contains: interest, mode: 'insensitive' } },
              { description: { contains: interest, mode: 'insensitive' } },
              { tags: { has: interest } }
            ]
          }))
        },
        take: 10,
        orderBy: { startTime: 'asc' }
      });

      return sessions;
    } catch (error) {
      console.error('[ProfileAgent] Error finding sessions:', error);
      return [];
    }
  }

  /**
   * Helper methods for extracting specific information
   */
  private extractProfessionalBackground(result: WebSearchResult): string {
    // Extract professional summary from LinkedIn-like content
    const snippet = result.snippet;
    const sentences = snippet.split('.').filter(s => s.trim().length > 20);
    return sentences.slice(0, 2).join('. ') + '.';
  }

  private extractCompanyFocus(results: WebSearchResult[]): string {
    // Synthesize company focus from multiple sources
    const focuses = results
      .map(r => r.snippet)
      .filter(s => s.includes('focus') || s.includes('initiative') || s.includes('transform'))
      .slice(0, 3);

    return focuses.join(' ').substring(0, 300);
  }

  private extractProjects(results: WebSearchResult[]): string[] {
    // Extract specific projects or initiatives
    const projects: string[] = [];
    const projectKeywords = ['launch', 'implement', 'deploy', 'initiative', 'program'];

    results.forEach(result => {
      projectKeywords.forEach(keyword => {
        if (result.snippet.toLowerCase().includes(keyword)) {
          const sentences = result.snippet.split('.');
          const projectSentence = sentences.find(s =>
            s.toLowerCase().includes(keyword)
          );
          if (projectSentence && projectSentence.length > 20) {
            projects.push(projectSentence.trim());
          }
        }
      });
    });

    return [...new Set(projects)].slice(0, 5);
  }

  private synthesizeIndustryContext(results: WebSearchResult[]): string {
    // Create a summary of industry context
    const contexts = results
      .map(r => r.snippet)
      .filter(s => s.length > 50)
      .slice(0, 3);

    return contexts.join(' ').substring(0, 400);
  }

  private extractExpertiseAreas(results: WebSearchResult[], userInfo: BasicUserInfo): string[] {
    const expertise: Set<string> = new Set();
    const techKeywords = [
      'AI', 'machine learning', 'blockchain', 'cloud', 'digital', 'automation',
      'data', 'analytics', 'cyber', 'API', 'platform', 'transformation'
    ];

    results.forEach(result => {
      techKeywords.forEach(keyword => {
        if (result.snippet.toLowerCase().includes(keyword.toLowerCase())) {
          expertise.add(keyword);
        }
      });
    });

    // Add role-based expertise
    const titleLower = userInfo.title.toLowerCase();
    if (titleLower.includes('chief') || titleLower.includes('head')) {
      expertise.add('Leadership');
      expertise.add('Strategy');
    }
    if (titleLower.includes('tech') || titleLower.includes('it')) {
      expertise.add('Technology');
    }
    if (titleLower.includes('product')) {
      expertise.add('Product Management');
    }

    return Array.from(expertise);
  }

  private generateNetworkingTargets(title: string, goals: string[]): string[] {
    const targets: string[] = [];

    // Role-based networking
    if (title.toLowerCase().includes('chief') || title.toLowerCase().includes('vp')) {
      targets.push('Other insurance executives');
      targets.push('Innovation leaders');
    }

    if (title.toLowerCase().includes('tech') || title.toLowerCase().includes('it')) {
      targets.push('Technology vendors');
      targets.push('Digital transformation experts');
    }

    // Goal-based networking
    if (goals.includes('Find solution providers')) {
      targets.push('InsurTech startups');
      targets.push('Technology consultants');
    }

    if (goals.includes('Learn about new technologies')) {
      targets.push('AI/ML experts');
      targets.push('Innovation lab leaders');
    }

    return targets;
  }

  private identifyRelevantVendors(companyFocus: string, focusAreas: string[]): string[] {
    const vendors: string[] = [];

    // Map focus areas to vendor categories
    if (focusAreas.includes('AI & Automation')) {
      vendors.push('AI platform providers');
      vendors.push('Automation solution vendors');
    }

    if (focusAreas.includes('Cybersecurity')) {
      vendors.push('Security solution providers');
      vendors.push('Risk assessment platforms');
    }

    if (companyFocus.includes('digital') || companyFocus.includes('transform')) {
      vendors.push('Digital platform providers');
      vendors.push('Cloud infrastructure vendors');
    }

    return vendors;
  }

  private createLearningPaths(experienceLevel: string, interests: string[]): string[] {
    const paths: string[] = [];

    if (experienceLevel === 'Entry') {
      paths.push('Insurance Fundamentals → Digital Basics → Innovation Trends');
    } else if (experienceLevel === 'Mid') {
      paths.push('Advanced ' + interests[0] + ' → Implementation Strategies → Best Practices');
    } else {
      paths.push('Strategic ' + interests[0] + ' → Industry Leadership → Future Trends');
    }

    return paths;
  }

  private calculateMetadata(
    research: ResearchContext,
    inferred: ProfileInference
  ): EnrichedUserProfile['metadata'] {
    // Calculate research confidence based on data availability
    let dataPoints = 0;
    let filledPoints = 0;

    const researchFields = Object.keys(research);
    dataPoints += 6; // Total possible research fields
    filledPoints += researchFields.filter(f => research[f as keyof ResearchContext]).length;

    const inferredFields = Object.keys(inferred);
    dataPoints += 5; // Total possible inferred fields
    filledPoints += inferredFields.filter(f => {
      const value = inferred[f as keyof ProfileInference];
      return value && (Array.isArray(value) ? value.length > 0 : true);
    }).length;

    const dataCompleteness = (filledPoints / dataPoints) * 100;
    const researchConfidence = dataCompleteness > 70 ? 0.9 :
                               dataCompleteness > 50 ? 0.7 : 0.5;

    return {
      researchConfidence,
      dataCompleteness: Math.round(dataCompleteness),
      lastUpdated: new Date()
    };
  }
}