#!/usr/bin/env npx tsx

/**
 * Embedding Management CLI
 * Comprehensive tool for managing, monitoring, and optimizing embeddings
 */

// Load environment variables from .env.local
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { embeddingManager, embeddingAutoSync } from '../lib/embedding-manager';
import { embeddingMonitor } from '../lib/embedding-monitor';
import prisma from '../lib/db';
import { program } from 'commander';
import Table from 'cli-table3';

// Helper function for formatted output
const log = {
  success: (msg: string) => console.log('✅ ' + msg),
  error: (msg: string) => console.log('❌ ' + msg),
  warning: (msg: string) => console.log('⚠️  ' + msg),
  info: (msg: string) => console.log('ℹ️  ' + msg),
  header: (msg: string) => console.log('\n' + msg + '\n' + '='.repeat(msg.length))
};

program
  .name('manage-embeddings')
  .description('Manage conference session embeddings')
  .version('1.0.0');

/**
 * Generate embeddings command
 */
program
  .command('generate')
  .description('Generate embeddings for all sessions')
  .option('-f, --force', 'Force regeneration of existing embeddings')
  .option('-b, --batch-size <number>', 'Batch size for processing', '10')
  .option('-n, --namespace <type>', 'Namespace to update (default, meals, both)', 'both')
  .option('--quality-check', 'Include quality validation', true)
  .action(async (options) => {
    log.header('Generating Session Embeddings');

    console.log('⏳ Initializing embedding manager...');

    try {
      // Check prerequisites
      console.log('⏳ Checking API availability...');
      const health = await embeddingMonitor.getHealthStatus();

      if (!health.checks.apiAvailability) {
        log.error('API keys not configured');
        log.error('Please set OPENAI_API_KEY and PINECONE_API_KEY environment variables');
        process.exit(1);
      }

      console.log('⏳ Processing sessions...');

      const result = await embeddingManager.processAllSessions({
        forceRefresh: options.force,
        batchSize: parseInt(options.batchSize),
        includeQualityCheck: options.qualityCheck,
        namespace: options.namespace
      });

      log.success('Embedding generation complete');

      // Display results
      const table = new Table({
        head: ['Metric', 'Value'],
        colWidths: [30, 20]
      });

      table.push(
        ['Total Sessions', result.total],
        ['Processed', result.processed],
        ['Cached', result.cached],
        ['Skipped', result.skipped],
        ['Failed', result.failed],
        ['High Quality', result.quality.high],
        ['Medium Quality', result.quality.medium],
        ['Low Quality', result.quality.low],
        ['Processing Time', `${(result.performance.totalTime / 1000).toFixed(2)}s`],
        ['Cache Hit Rate', `${(result.performance.cacheHitRate * 100).toFixed(1)}%`]
      );

      console.log(table.toString());

      // Show any errors
      const errors = embeddingManager.getErrors();
      if (errors.size > 0) {
        log.warning(`${errors.size} sessions had errors:`);
        errors.forEach((error, sessionId) => {
          console.log(`  - ${sessionId}: ${error.lastError} (${error.count} attempts)`);
        });
      }

    } catch (error) {
      log.error('Generation failed: ' + String(error));
      process.exit(1);
    }
  });

/**
 * Health check command
 */
program
  .command('health')
  .description('Check embedding system health')
  .action(async () => {
    log.header('Embedding System Health Check');

    console.log('⏳ Checking system health...');

    try {
      const health = await embeddingMonitor.getHealthStatus();

      // Status indicator
      const statusEmoji =
        health.status === 'healthy' ? '✅' :
        health.status === 'degraded' ? '⚠️' :
        '❌';

      console.log(`\nStatus: ${statusEmoji} ${health.status.toUpperCase()}\n`);

      // Checks table
      const checksTable = new Table({
        head: ['Check', 'Status'],
        colWidths: [30, 15]
      });

      Object.entries(health.checks).forEach(([check, passed]) => {
        checksTable.push([
          check.replace(/([A-Z])/g, ' $1').toLowerCase(),
          passed ? '✓ Passed' : '✗ Failed'
        ]);
      });

      console.log('System Checks:');
      console.log(checksTable.toString());

      // Metrics table
      const metricsTable = new Table({
        head: ['Metric', 'Value'],
        colWidths: [30, 20]
      });

      metricsTable.push(
        ['Total Sessions', health.metrics.totalSessions],
        ['Embedded Sessions', health.metrics.embeddedSessions],
        ['Coverage', `${(health.metrics.coverage * 100).toFixed(1)}%`],
        ['Average Quality', health.metrics.averageQuality.toFixed(3)],
        ['Error Rate', `${(health.metrics.errorRate * 100).toFixed(2)}%`],
        ['Last Sync', health.metrics.lastSyncTime?.toLocaleString() || 'Never']
      );

      console.log('\nMetrics:');
      console.log(metricsTable.toString());

      // Warnings and recommendations
      if (health.warnings.length > 0) {
        console.log('\n⚠️ Warnings:');
        health.warnings.forEach(warning => {
          log.warning(warning);
        });
      }

      if (health.recommendations.length > 0) {
        console.log('\nℹ️ Recommendations:');
        health.recommendations.forEach(rec => {
          log.info(rec);
        });
      }

    } catch (error) {
      log.error('Health check failed: ' + String(error));
      process.exit(1);
    }
  });

/**
 * Monitor command
 */
program
  .command('monitor')
  .description('Start real-time monitoring')
  .option('-i, --interval <seconds>', 'Update interval in seconds', '60')
  .action(async (options) => {
    log.header('Starting Real-time Monitoring');

    const intervalMs = parseInt(options.interval) * 1000;

    // Register alert handler
    embeddingMonitor.onAlert((alert) => {
      log.warning(`ALERT: ${alert}`);
    });

    // Start monitoring
    embeddingMonitor.startMonitoring(intervalMs);

    log.success(`Monitoring started (updating every ${options.interval}s)`);
    log.info('Press Ctrl+C to stop\n');

    // Display initial status
    const displayStatus = async () => {
      const health = await embeddingMonitor.getHealthStatus();
      const perf = await embeddingMonitor.getSearchPerformance();

      console.clear();
      log.header('Embedding System Monitor');

      // Status
      const statusEmoji =
        health.status === 'healthy' ? '✅' :
        health.status === 'degraded' ? '⚠️' :
        '❌';

      console.log(`Status: ${statusEmoji} ${health.status.toUpperCase()}`);
      console.log(`Time: ${new Date().toLocaleString()}\n`);

      // Real-time metrics
      const metricsTable = new Table({
        head: ['Metric', 'Value', 'Status'],
        colWidths: [25, 20, 15]
      });

      const coverageStatus = health.metrics.coverage > 0.95 ? 'Good' :
                            health.metrics.coverage > 0.8 ? 'Fair' :
                            'Poor';

      const qualityStatus = health.metrics.averageQuality > 0.8 ? 'Good' :
                           health.metrics.averageQuality > 0.6 ? 'Fair' :
                           'Poor';

      const perfStatus = perf.avgSearchTime < 50 ? 'Fast' :
                        perf.avgSearchTime < 100 ? 'Normal' :
                        'Slow';

      metricsTable.push(
        ['Coverage', `${(health.metrics.coverage * 100).toFixed(1)}%`, coverageStatus],
        ['Quality Score', health.metrics.averageQuality.toFixed(3), qualityStatus],
        ['Avg Search Time', `${perf.avgSearchTime.toFixed(1)}ms`, perfStatus],
        ['Cache Hit Rate', `${(perf.cacheHitRate * 100).toFixed(1)}%`,
         perf.cacheHitRate > 0.7 ? 'Good' : 'Low'],
        ['Error Rate', `${(health.metrics.errorRate * 100).toFixed(2)}%`,
         health.metrics.errorRate < 0.01 ? 'Low' : 'High'],
        ['Total Searches', perf.totalSearches, ''],
        ['Failed Searches', perf.failedSearches,
         perf.failedSearches === 0 ? 'None' : 'Check']
      );

      console.log(metricsTable.toString());

      // Show any active warnings
      if (health.warnings.length > 0) {
        console.log('\n⚠️ Active Warnings:');
        health.warnings.slice(0, 3).forEach(warning => {
          console.log('  • ' + warning);
        });
      }
    };

    // Initial display
    await displayStatus();

    // Update display periodically
    setInterval(displayStatus, intervalMs);

    // Handle shutdown
    process.on('SIGINT', () => {
      embeddingMonitor.stopMonitoring();
      log.info('\nMonitoring stopped');
      process.exit(0);
    });
  });

/**
 * Optimize command
 */
program
  .command('optimize')
  .description('Generate optimization report')
  .action(async () => {
    log.header('Generating Optimization Report');

    console.log('⏳ Analyzing system...');

    try {
      const report = await embeddingMonitor.generateOptimizationReport();

      log.success('Analysis complete');

      // Current state
      console.log('\nCurrent State:');
      const stateTable = new Table({
        head: ['Property', 'Value'],
        colWidths: [30, 20]
      });

      stateTable.push(
        ['Index Size', report.currentState.indexSize],
        ['Dimensions', report.currentState.dimensions],
        ['Namespace', report.currentState.namespace],
        ['Session Count', report.currentState.sessionCount],
        ['Avg Embedding Age', `${report.currentState.avgEmbeddingAge.toFixed(1)} days`]
      );

      console.log(stateTable.toString());

      // Recommendations
      if (report.recommendations.length > 0) {
        console.log('\nOptimization Recommendations:');

        report.recommendations.forEach((rec, index) => {
          const priorityEmoji =
            rec.priority === 'high' ? '🔴' :
            rec.priority === 'medium' ? '🟡' :
            '🟢';

          console.log(`\n${index + 1}. ${rec.action}`);
          console.log(`   Priority: ${priorityEmoji} ${rec.priority.toUpperCase()}`);
          console.log(`   Reason: ${rec.reason}`);
          console.log(`   Impact: ${rec.estimatedImpact}`);
        });
      } else {
        log.success('No optimizations needed - system is running optimally!');
      }

      // Cost analysis
      console.log('\nCost Analysis:');
      const costTable = new Table({
        head: ['Metric', 'Value'],
        colWidths: [30, 20]
      });

      costTable.push(
        ['Current Monthly Cost', `$${report.costAnalysis.currentMonthlyCost.toFixed(2)}`],
        ['Potential Savings', `$${report.costAnalysis.projectedSavings.toFixed(2)}`],
        ['ROI from Optimization', report.costAnalysis.optimizationROI]
      );

      console.log(costTable.toString());

    } catch (error) {
      log.error('Optimization analysis failed: ' + String(error));
      process.exit(1);
    }
  });

/**
 * Sync command
 */
program
  .command('sync')
  .description('Start auto-sync process')
  .option('-i, --interval <minutes>', 'Sync interval in minutes', '60')
  .action(async (options) => {
    log.header('Starting Auto-Sync');

    const intervalMs = parseInt(options.interval) * 60 * 1000;

    embeddingAutoSync.start(intervalMs);

    log.success(`Auto-sync started (checking every ${options.interval} minutes)`);
    log.info('Press Ctrl+C to stop\n');

    // Keep process running
    process.on('SIGINT', () => {
      embeddingAutoSync.stop();
      log.info('Auto-sync stopped');
      process.exit(0);
    });
  });

/**
 * Validate command
 */
program
  .command('validate')
  .description('Validate all embeddings')
  .action(async () => {
    log.header('Validating Embeddings');

    console.log('⏳ Validating embeddings...');

    try {
      const validation = await embeddingManager.validateAllEmbeddings();

      log.success('Validation complete');

      const table = new Table({
        head: ['Status', 'Count'],
        colWidths: [20, 15]
      });

      table.push(
        ['✅ Valid', validation.valid],
        ['❌ Invalid', validation.invalid],
        ['⚠️ Missing', validation.missing]
      );

      console.log(table.toString());

      if (validation.issues.length > 0) {
        console.log('\nIssues Found:');
        validation.issues.slice(0, 10).forEach(issue => {
          log.warning(issue);
        });

        if (validation.issues.length > 10) {
          log.info(`... and ${validation.issues.length - 10} more issues`);
        }
      } else {
        log.success('All embeddings are valid!');
      }

    } catch (error) {
      log.error('Validation failed: ' + String(error));
      process.exit(1);
    }
  });

/**
 * Clear cache command
 */
program
  .command('clear-cache')
  .description('Clear embedding caches')
  .action(async () => {
    log.header('Clearing Embedding Caches');

    console.log('⏳ Clearing caches...');

    try {
      await embeddingManager.clearCaches();
      log.success('Caches cleared successfully');
    } catch (error) {
      log.error('Failed to clear caches: ' + String(error));
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  program.outputHelp();
}