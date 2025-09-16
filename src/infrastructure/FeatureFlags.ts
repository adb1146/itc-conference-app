/**
 * Feature Flags Service
 * Controls gradual rollout of new features
 */

export interface FeatureFlagOptions {
  userId?: string;
  percentage?: number;
  enabled?: boolean;
}

export class FeatureFlags {
  private flags: Map<string, FeatureFlagConfig> = new Map();

  constructor() {
    this.initializeFlags();
  }

  private initializeFlags() {
    // Initialize from environment variables or config
    this.flags.set('new-chat-service', {
      name: 'new-chat-service',
      description: 'Use new ChatService instead of legacy handler',
      enabled: process.env.ENABLE_NEW_CHAT_SERVICE === 'true',
      percentage: parseInt(process.env.NEW_CHAT_SERVICE_PERCENTAGE || '0'),
      whitelist: process.env.NEW_CHAT_SERVICE_WHITELIST?.split(',') || [],
      blacklist: []
    });

    this.flags.set('new-search-service', {
      name: 'new-search-service',
      description: 'Use new SearchService with strategy pattern',
      enabled: process.env.ENABLE_NEW_SEARCH_SERVICE === 'true',
      percentage: parseInt(process.env.NEW_SEARCH_SERVICE_PERCENTAGE || '0'),
      whitelist: [],
      blacklist: []
    });

    this.flags.set('use-repository-pattern', {
      name: 'use-repository-pattern',
      description: 'Use repository pattern for data access',
      enabled: process.env.ENABLE_REPOSITORY_PATTERN === 'true',
      percentage: parseInt(process.env.REPOSITORY_PATTERN_PERCENTAGE || '0'),
      whitelist: [],
      blacklist: []
    });
  }

  /**
   * Check if a feature is enabled for a specific context
   */
  async isEnabled(flagName: string, options: FeatureFlagOptions = {}): Promise<boolean> {
    const flag = this.flags.get(flagName);
    
    if (!flag) {
      console.warn(`Feature flag '${flagName}' not found`);
      return false;
    }

    // Check if globally disabled
    if (!flag.enabled && flag.percentage === 0) {
      return false;
    }

    // Check if globally enabled
    if (flag.enabled && flag.percentage === 100) {
      return true;
    }

    // Check whitelist
    if (options.userId && flag.whitelist.includes(options.userId)) {
      return true;
    }

    // Check blacklist
    if (options.userId && flag.blacklist.includes(options.userId)) {
      return false;
    }

    // Check percentage rollout
    if (options.percentage !== undefined) {
      return this.isInPercentage(options.userId || 'anonymous', options.percentage);
    }

    if (flag.percentage > 0) {
      return this.isInPercentage(options.userId || 'anonymous', flag.percentage);
    }

    return flag.enabled;
  }

  /**
   * Determine if a user is in the percentage rollout
   */
  private isInPercentage(userId: string, percentage: number): boolean {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Create a deterministic hash from userId
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }

    // Map to 0-100 range
    const userPercentage = Math.abs(hash) % 100;
    return userPercentage < percentage;
  }

  /**
   * Update a feature flag configuration
   */
  updateFlag(flagName: string, config: Partial<FeatureFlagConfig>): void {
    const existing = this.flags.get(flagName);
    if (existing) {
      this.flags.set(flagName, { ...existing, ...config });
    }
  }

  /**
   * Get all feature flags
   */
  getAllFlags(): FeatureFlagConfig[] {
    return Array.from(this.flags.values());
  }

  /**
   * Enable a feature for specific percentage of users
   */
  async rollout(flagName: string, percentage: number): Promise<void> {
    this.updateFlag(flagName, { 
      enabled: true, 
      percentage: Math.min(100, Math.max(0, percentage)) 
    });
    
    console.log(`Feature '${flagName}' rolled out to ${percentage}% of users`);
  }

  /**
   * Rollback a feature immediately
   */
  async rollback(flagName: string): Promise<void> {
    this.updateFlag(flagName, { 
      enabled: false, 
      percentage: 0 
    });
    
    console.log(`Feature '${flagName}' rolled back`);
  }
}

interface FeatureFlagConfig {
  name: string;
  description: string;
  enabled: boolean;
  percentage: number;
  whitelist: string[];
  blacklist: string[];
}

// Singleton instance
export const featureFlags = new FeatureFlags();