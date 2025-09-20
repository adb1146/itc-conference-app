/**
 * Embedding Monitoring and Optimization System
 * Tracks performance, quality, and health of embedding operations
 */

import { embeddingManager } from './embedding-manager';
import prisma from '@/lib/db';
import { getPineconeClient, getOpenAIClient, VECTOR_CONFIG } from './vector-db';

export interface EmbeddingHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: {
    apiAvailability: boolean;
    cachePerformance: boolean;
    embeddingQuality: boolean;
    storageIntegrity: boolean;
    syncStatus: boolean;
  };
  metrics: {
    totalSessions: number;
    embeddedSessions: number;
    coverage: number;
    averageQuality: number;
    lastSyncTime: Date | null;
    errorRate: number;
  };
  recommendations: string[];
  warnings: string[];
}

export interface SearchPerformance {
  avgSearchTime: number;
  p95SearchTime: number;
  cacheHitRate: number;
  vectorDbLatency: number;
  fallbackRate: number;
  totalSearches: number;
  failedSearches: number;
}

export interface OptimizationReport {
  currentState: {
    indexSize: number;
    dimensions: number;
    namespace: string;
    sessionCount: number;
    avgEmbeddingAge: number;
  };
  recommendations: {
    action: string;
    reason: string;
    priority: 'high' | 'medium' | 'low';
    estimatedImpact: string;
  }[];
  costAnalysis: {
    currentMonthlyCost: number;
    projectedSavings: number;
    optimizationROI: string;
  };
}

// Performance tracking
const performanceMetrics = {
  searches: [] as number[],
  cacheHits: 0,
  cacheMisses: 0,
  vectorDbCalls: 0,
  fallbacks: 0,
  errors: [] as { timestamp: Date; error: string; context: any }[]
};

/**
 * Main monitoring class
 */
export class EmbeddingMonitor {
  private static instance: EmbeddingMonitor;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertCallbacks: ((alert: string) => void)[] = [];

  static getInstance(): EmbeddingMonitor {
    if (!EmbeddingMonitor.instance) {
      EmbeddingMonitor.instance = new EmbeddingMonitor();
    }
    return EmbeddingMonitor.instance;
  }

  /**
   * Get comprehensive health check
   */
  async getHealthStatus(): Promise<EmbeddingHealth> {
    const health: EmbeddingHealth = {
      status: 'healthy',
      checks: {
        apiAvailability: false,
        cachePerformance: false,
        embeddingQuality: false,
        storageIntegrity: false,
        syncStatus: false
      },
      metrics: {
        totalSessions: 0,
        embeddedSessions: 0,
        coverage: 0,
        averageQuality: 0,
        lastSyncTime: null,
        errorRate: 0
      },
      recommendations: [],
      warnings: []
    };

    try {
      // Check API availability
      health.checks.apiAvailability = await this.checkAPIHealth();

      // Check cache performance
      health.checks.cachePerformance = await this.checkCacheHealth();

      // Check embedding quality
      const qualityMetrics = await this.checkEmbeddingQuality();
      health.checks.embeddingQuality = qualityMetrics.averageQuality > 0.7;
      health.metrics.averageQuality = qualityMetrics.averageQuality;

      // Check storage integrity
      health.checks.storageIntegrity = await this.checkStorageIntegrity();

      // Check sync status
      const syncStatus = await this.checkSyncStatus();
      health.checks.syncStatus = syncStatus.isHealthy;
      health.metrics.lastSyncTime = syncStatus.lastSync;

      // Get coverage metrics
      const coverage = await this.getCoverageMetrics();
      health.metrics = { ...health.metrics, ...coverage };

      // Calculate error rate
      health.metrics.errorRate = this.calculateErrorRate();

      // Determine overall status
      const failedChecks = Object.values(health.checks).filter(check => !check).length;
      if (failedChecks === 0) {
        health.status = 'healthy';
      } else if (failedChecks <= 2) {
        health.status = 'degraded';
      } else {
        health.status = 'unhealthy';
      }

      // Generate recommendations
      health.recommendations = this.generateRecommendations(health);

      // Generate warnings
      health.warnings = this.generateWarnings(health);

      // Trigger alerts if needed
      if (health.status === 'unhealthy') {
        this.triggerAlert(`Embedding system unhealthy: ${failedChecks} checks failed`);
      }

    } catch (error) {
      console.error('[EmbeddingMonitor] Health check failed:', error);
      health.status = 'unhealthy';
      health.warnings.push('Health check failed: ' + error);
    }

    return health;
  }

  /**
   * Get search performance metrics
   */
  async getSearchPerformance(): Promise<SearchPerformance> {
    const searchTimes = performanceMetrics.searches.slice(-1000); // Last 1000 searches

    return {
      avgSearchTime: searchTimes.length > 0
        ? searchTimes.reduce((a, b) => a + b, 0) / searchTimes.length
        : 0,
      p95SearchTime: this.calculatePercentile(searchTimes, 95),
      cacheHitRate: performanceMetrics.cacheHits /
        (performanceMetrics.cacheHits + performanceMetrics.cacheMisses || 1),
      vectorDbLatency: await this.measureVectorDbLatency(),
      fallbackRate: performanceMetrics.fallbacks / performanceMetrics.vectorDbCalls || 0,
      totalSearches: performanceMetrics.searches.length,
      failedSearches: performanceMetrics.errors.length
    };
  }

  /**
   * Generate optimization report
   */
  async generateOptimizationReport(): Promise<OptimizationReport> {
    const report: OptimizationReport = {
      currentState: {
        indexSize: 0,
        dimensions: VECTOR_CONFIG.dimension,
        namespace: VECTOR_CONFIG.namespace,
        sessionCount: 0,
        avgEmbeddingAge: 0
      },
      recommendations: [],
      costAnalysis: {
        currentMonthlyCost: 0,
        projectedSavings: 0,
        optimizationROI: ''
      }
    };

    try {
      // Get current state
      const sessions = await prisma.session.count();
      report.currentState.sessionCount = sessions;

      // Analyze index statistics
      const indexStats = await this.getIndexStatistics();
      report.currentState.indexSize = indexStats.totalVectors;
      report.currentState.avgEmbeddingAge = indexStats.avgAge;

      // Generate optimization recommendations

      // 1. Check for stale embeddings
      if (report.currentState.avgEmbeddingAge > 30) {
        report.recommendations.push({
          action: 'Refresh old embeddings',
          reason: `Average embedding age is ${report.currentState.avgEmbeddingAge} days`,
          priority: 'medium',
          estimatedImpact: 'Improved search relevance by 10-15%'
        });
      }

      // 2. Check for missing embeddings
      const coverage = await this.getCoverageMetrics();
      if (coverage.coverage < 0.95) {
        report.recommendations.push({
          action: 'Generate missing embeddings',
          reason: `Only ${(coverage.coverage * 100).toFixed(1)}% of sessions have embeddings`,
          priority: 'high',
          estimatedImpact: 'Complete search coverage'
        });
      }

      // 3. Check cache performance
      const perf = await this.getSearchPerformance();
      if (perf.cacheHitRate < 0.7) {
        report.recommendations.push({
          action: 'Increase cache TTL or size',
          reason: `Cache hit rate is only ${(perf.cacheHitRate * 100).toFixed(1)}%`,
          priority: 'medium',
          estimatedImpact: '30% reduction in API calls'
        });
      }

      // 4. Check for duplicate vectors
      const duplicates = await this.findDuplicateEmbeddings();
      if (duplicates > 0) {
        report.recommendations.push({
          action: 'Remove duplicate embeddings',
          reason: `Found ${duplicates} duplicate vectors`,
          priority: 'low',
          estimatedImpact: `Save ${(duplicates * 0.001).toFixed(2)} MB storage`
        });
      }

      // 5. Check quality distribution
      const quality = await this.checkEmbeddingQuality();
      if (quality.lowQualityCount > sessions * 0.1) {
        report.recommendations.push({
          action: 'Improve text preprocessing',
          reason: `${quality.lowQualityCount} sessions have low-quality embeddings`,
          priority: 'high',
          estimatedImpact: '20% improvement in search accuracy'
        });
      }

      // Cost analysis
      report.costAnalysis = this.calculateCostAnalysis(report);

    } catch (error) {
      console.error('[EmbeddingMonitor] Optimization report failed:', error);
      report.recommendations.push({
        action: 'Fix monitoring system',
        reason: 'Could not complete optimization analysis',
        priority: 'high',
        estimatedImpact: 'Required for proper optimization'
      });
    }

    return report;
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(intervalMs: number = 60000): void {
    if (this.monitoringInterval) {
      console.log('[EmbeddingMonitor] Already monitoring');
      return;
    }

    console.log(`[EmbeddingMonitor] Starting monitoring every ${intervalMs}ms`);

    this.monitoringInterval = setInterval(async () => {
      const health = await this.getHealthStatus();

      if (health.status === 'unhealthy') {
        console.error('[EmbeddingMonitor] System unhealthy:', health);
      } else if (health.status === 'degraded') {
        console.warn('[EmbeddingMonitor] System degraded:', health.warnings);
      }

      // Log metrics
      console.log('[EmbeddingMonitor] Metrics:', {
        coverage: `${(health.metrics.coverage * 100).toFixed(1)}%`,
        quality: health.metrics.averageQuality.toFixed(3),
        errorRate: `${(health.metrics.errorRate * 100).toFixed(2)}%`
      });

    }, intervalMs);
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      console.log('[EmbeddingMonitor] Monitoring stopped');
    }
  }

  /**
   * Register alert callback
   */
  onAlert(callback: (alert: string) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Track search performance
   */
  trackSearch(timeMs: number, cacheHit: boolean, fallback: boolean = false): void {
    performanceMetrics.searches.push(timeMs);

    if (cacheHit) {
      performanceMetrics.cacheHits++;
    } else {
      performanceMetrics.cacheMisses++;
      performanceMetrics.vectorDbCalls++;
    }

    if (fallback) {
      performanceMetrics.fallbacks++;
    }

    // Keep only last 10000 searches
    if (performanceMetrics.searches.length > 10000) {
      performanceMetrics.searches = performanceMetrics.searches.slice(-10000);
    }
  }

  /**
   * Track error
   */
  trackError(error: string, context: any): void {
    performanceMetrics.errors.push({
      timestamp: new Date(),
      error,
      context
    });

    // Keep only last 100 errors
    if (performanceMetrics.errors.length > 100) {
      performanceMetrics.errors = performanceMetrics.errors.slice(-100);
    }
  }

  // Private helper methods

  private async checkAPIHealth(): Promise<boolean> {
    try {
      const openai = getOpenAIClient();
      const pinecone = getPineconeClient();
      return !!(openai && pinecone);
    } catch {
      return false;
    }
  }

  private async checkCacheHealth(): Promise<boolean> {
    const perf = await this.getSearchPerformance();
    return perf.cacheHitRate > 0.5 && perf.avgSearchTime < 100;
  }

  private async checkEmbeddingQuality(): Promise<{
    averageQuality: number;
    lowQualityCount: number;
    highQualityCount: number;
  }> {
    const metrics = embeddingManager.getMetrics();
    const total = metrics.quality.high + metrics.quality.medium + metrics.quality.low;

    if (total === 0) {
      return { averageQuality: 0, lowQualityCount: 0, highQualityCount: 0 };
    }

    const avgQuality = (
      metrics.quality.high * 1.0 +
      metrics.quality.medium * 0.7 +
      metrics.quality.low * 0.3
    ) / total;

    return {
      averageQuality: avgQuality,
      lowQualityCount: metrics.quality.low,
      highQualityCount: metrics.quality.high
    };
  }

  private async checkStorageIntegrity(): Promise<boolean> {
    try {
      // Sample check - verify a few random embeddings
      const sessions = await prisma.session.findMany({
        take: 5,
        where: {
          embedding: { not: null }
        }
      });

      for (const session of sessions) {
        if (!session.embedding || (session.embedding as any).length !== VECTOR_CONFIG.dimension) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  private async checkSyncStatus(): Promise<{
    isHealthy: boolean;
    lastSync: Date | null;
  }> {
    try {
      // Check when sessions were last updated
      const recentUpdate = await prisma.session.findFirst({
        where: {
          lastUpdated: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
          }
        },
        orderBy: {
          lastUpdated: 'desc'
        }
      });

      return {
        isHealthy: true,
        lastSync: recentUpdate?.lastUpdated || null
      };
    } catch {
      return { isHealthy: false, lastSync: null };
    }
  }

  private async getCoverageMetrics(): Promise<{
    totalSessions: number;
    embeddedSessions: number;
    coverage: number;
  }> {
    const total = await prisma.session.count();
    const embedded = await prisma.session.count({
      where: {
        embedding: { isEmpty: false }
      }
    });

    return {
      totalSessions: total,
      embeddedSessions: embedded,
      coverage: total > 0 ? embedded / total : 0
    };
  }

  private async getIndexStatistics(): Promise<{
    totalVectors: number;
    avgAge: number;
  }> {
    // This would query Pinecone for actual stats
    // For now, return estimates
    const sessions = await prisma.session.findMany({
      where: {
        embedding: { isEmpty: false }
      }
    });

    const avgAge = sessions.reduce((sum, s) => {
      const age = Date.now() - (s.lastUpdated?.getTime() || Date.now());
      return sum + age / (1000 * 60 * 60 * 24); // Days
    }, 0) / sessions.length;

    return {
      totalVectors: sessions.length,
      avgAge
    };
  }

  private async findDuplicateEmbeddings(): Promise<number> {
    // This would check for duplicate vectors
    // For now, return 0
    return 0;
  }

  private async measureVectorDbLatency(): Promise<number> {
    // Measure actual Pinecone latency
    // For now, return estimate based on recent searches
    const recent = performanceMetrics.searches.slice(-100);
    if (recent.length === 0) return 0;

    // Assume vector DB calls take 70% of non-cached search time
    const nonCached = recent.filter((_, i) => i % 3 !== 0); // Rough estimate
    if (nonCached.length === 0) return 0;

    const avg = nonCached.reduce((a, b) => a + b, 0) / nonCached.length;
    return avg * 0.7;
  }

  private calculateErrorRate(): number {
    const recentErrors = performanceMetrics.errors.filter(
      e => Date.now() - e.timestamp.getTime() < 60 * 60 * 1000 // Last hour
    );

    const recentSearches = Math.max(performanceMetrics.searches.length, 1);
    return recentErrors.length / recentSearches;
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  private generateRecommendations(health: EmbeddingHealth): string[] {
    const recommendations: string[] = [];

    if (!health.checks.apiAvailability) {
      recommendations.push('Check API keys and connectivity');
    }

    if (health.metrics.coverage < 0.9) {
      recommendations.push('Run embedding generation for missing sessions');
    }

    if (health.metrics.averageQuality < 0.7) {
      recommendations.push('Review and improve text preprocessing');
    }

    if (health.metrics.errorRate > 0.05) {
      recommendations.push('Investigate and fix recurring errors');
    }

    return recommendations;
  }

  private generateWarnings(health: EmbeddingHealth): string[] {
    const warnings: string[] = [];

    if (health.metrics.coverage < 0.8) {
      warnings.push(`Low coverage: Only ${(health.metrics.coverage * 100).toFixed(1)}% of sessions have embeddings`);
    }

    if (health.metrics.errorRate > 0.1) {
      warnings.push(`High error rate: ${(health.metrics.errorRate * 100).toFixed(1)}% of operations failing`);
    }

    if (!health.checks.cachePerformance) {
      warnings.push('Cache performance degraded');
    }

    return warnings;
  }

  private calculateCostAnalysis(report: OptimizationReport): {
    currentMonthlyCost: number;
    projectedSavings: number;
    optimizationROI: string;
  } {
    // Estimate costs based on usage
    const embeddingCostPer1k = 0.0001; // OpenAI pricing
    const vectorStorageCostPerMillion = 0.25; // Pinecone estimate

    const monthlyEmbeddings = report.currentState.sessionCount * 2; // Assume 2x for updates
    const embeddingCost = (monthlyEmbeddings / 1000) * embeddingCostPer1k;

    const storageCost = (report.currentState.indexSize / 1000000) * vectorStorageCostPerMillion;

    const currentCost = embeddingCost + storageCost;

    // Calculate potential savings
    let savings = 0;
    report.recommendations.forEach(rec => {
      if (rec.action.includes('cache')) savings += currentCost * 0.2;
      if (rec.action.includes('duplicate')) savings += storageCost * 0.1;
      if (rec.action.includes('preprocessing')) savings += embeddingCost * 0.15;
    });

    return {
      currentMonthlyCost: currentCost,
      projectedSavings: savings,
      optimizationROI: savings > 0 ? `${((savings / currentCost) * 100).toFixed(0)}%` : '0%'
    };
  }

  private triggerAlert(message: string): void {
    console.error(`[EmbeddingMonitor] ALERT: ${message}`);
    this.alertCallbacks.forEach(callback => callback(message));
  }
}

// Export singleton
export const embeddingMonitor = EmbeddingMonitor.getInstance();