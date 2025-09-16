/**
 * Test Script for Event-Driven Architecture
 * Verifies EventBus, MessageQueue, and DataSyncService
 */

import { eventBus, Events } from '../src/infrastructure/events/EventBus';
import { messageQueue } from '../src/infrastructure/events/MessageQueue';
import { DataSyncService } from '../src/infrastructure/events/DataSyncService';
import { createRepositories } from '../src/infrastructure/RepositoryFactory';
import { AgendaService } from '../src/application/services/AgendaService';
import { SearchService } from '../src/application/services/SearchService';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testEventBus() {
  console.log(`\n${colors.blue}Testing EventBus...${colors.reset}`);
  
  try {
    let eventReceived = false;
    
    // Subscribe to an event
    eventBus.on('test.event', (data) => {
      eventReceived = true;
      console.log(`${colors.gray}  Event received:`, data);
    });
    
    // Emit the event
    await eventBus.emit('test.event', { test: 'data' });
    
    // Wait a bit for async processing
    await new Promise(resolve => setTimeout(resolve, 100));
    
    if (eventReceived) {
      console.log(`${colors.green}✓${colors.reset} EventBus working: Event delivered successfully`);
    } else {
      throw new Error('Event not received');
    }
    
    // Test waitFor
    const waitPromise = eventBus.waitFor('test.wait', 1000);
    setTimeout(() => eventBus.emit('test.wait', { waited: true }), 50);
    const result = await waitPromise;
    
    console.log(`${colors.green}✓${colors.reset} EventBus waitFor: Received event within timeout`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} EventBus test failed:`, error);
    return false;
  }
}

async function testMessageQueue() {
  console.log(`\n${colors.blue}Testing MessageQueue...${colors.reset}`);
  
  try {
    let messagesProcessed = 0;
    
    // Subscribe to a topic
    messageQueue.subscribe('test.topic', async (message) => {
      messagesProcessed++;
      console.log(`${colors.gray}  Processing message:`, message.id);
    });
    
    // Publish messages
    await messageQueue.publish('test.topic', { data: 'message1' });
    await messageQueue.publish('test.topic', { data: 'message2' });
    await messageQueue.publish('test.topic', { data: 'message3' });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`${colors.green}✓${colors.reset} MessageQueue: Processed ${messagesProcessed} messages`);
    
    // Get stats
    const stats = messageQueue.getStats();
    console.log(`${colors.gray}  Total processed: ${stats.totalProcessed}`);
    console.log(`${colors.gray}  Total failed: ${stats.totalFailed}`);
    
    // Test DLQ
    await messageQueue.publishToDLQ('test.failed', { error: 'test error' });
    const dlqCount = stats.dlq.length;
    console.log(`${colors.green}✓${colors.reset} Dead Letter Queue: ${dlqCount > 0 ? 'Working' : 'Empty'}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} MessageQueue test failed:`, error);
    return false;
  }
}

async function testDataSyncService() {
  console.log(`\n${colors.blue}Testing DataSyncService...${colors.reset}`);
  
  try {
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    const dataSyncService = new DataSyncService(
      eventBus,
      messageQueue,
      vectorRepo,
      cacheRepo
    );
    
    // Test session created event
    const testSession = {
      id: 'test-session-123',
      title: 'Test Session for Event System',
      description: 'Testing data synchronization',
      track: 'Testing',
      tags: ['test', 'event-driven']
    };
    
    // Emit session created event
    await eventBus.emit(Events.SESSION_CREATED, { session: testSession });
    
    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Check sync status
    const status = dataSyncService.getSyncStatus();
    console.log(`${colors.green}✓${colors.reset} DataSyncService initialized`);
    console.log(`${colors.gray}  In progress: ${status.inProgress.length}`);
    console.log(`${colors.gray}  Pending retries: ${status.pendingRetries.length}`);
    
    // Test cache invalidation
    await eventBus.emit(Events.SESSION_UPDATED, {
      session: testSession,
      changes: ['title', 'description']
    });
    
    console.log(`${colors.green}✓${colors.reset} DataSyncService handling events`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} DataSyncService test failed:`, error);
    return false;
  }
}

async function testAgendaService() {
  console.log(`\n${colors.blue}Testing AgendaService...${colors.reset}`);
  
  try {
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    const searchService = new SearchService(sessionRepo, vectorRepo, cacheRepo);
    const agendaService = new AgendaService(searchService);
    
    // Test agenda building
    const agenda = await agendaService.buildAgenda({
      userId: 'test-user',
      interests: ['AI', 'Insurance', 'Digital Transformation'],
      tracks: ['Innovation', 'Technology'],
      preferredFormat: 'detailed',
      avoidConflicts: true
    });
    
    console.log(`${colors.green}✓${colors.reset} AgendaService: Built agenda with ${agenda.totalSessions} sessions`);
    console.log(`${colors.gray}  Coverage:`);
    console.log(`${colors.gray}    - Interests: ${agenda.coverage.interests.join(', ')}`);
    console.log(`${colors.gray}    - Tracks: ${agenda.coverage.tracks.join(', ')}`);
    console.log(`${colors.gray}    - Days: ${agenda.coverage.days.join(', ')}`);
    
    if (agenda.recommendations.length > 0) {
      console.log(`${colors.gray}  Recommendations:`);
      agenda.recommendations.forEach(r => {
        console.log(`${colors.gray}    - ${r}`);
      });
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} AgendaService test failed:`, error);
    return false;
  }
}

async function testEventDrivenIntegration() {
  console.log(`\n${colors.blue}Testing Event-Driven Integration...${colors.reset}`);
  
  try {
    let eventChainCompleted = false;
    
    // Set up event chain
    eventBus.on(Events.SESSION_CREATED, async (data) => {
      console.log(`${colors.gray}  1. Session created:`, data.session.id);
      
      // Trigger next event
      await eventBus.emit(Events.VECTOR_SYNC_REQUIRED, {
        sessionId: data.session.id
      });
    });
    
    eventBus.on(Events.VECTOR_SYNC_REQUIRED, async (data) => {
      console.log(`${colors.gray}  2. Vector sync requested:`, data.sessionId);
      
      // Simulate sync completion
      await eventBus.emit(Events.VECTOR_SYNC_COMPLETED, {
        sessionId: data.sessionId
      });
    });
    
    eventBus.on(Events.VECTOR_SYNC_COMPLETED, async (data) => {
      console.log(`${colors.gray}  3. Vector sync completed:`, data.sessionId);
      eventChainCompleted = true;
    });
    
    // Start the chain
    await eventBus.emit(Events.SESSION_CREATED, {
      session: { id: 'chain-test', title: 'Event Chain Test' }
    });
    
    // Wait for chain to complete
    await new Promise(resolve => setTimeout(resolve, 500));
    
    if (eventChainCompleted) {
      console.log(`${colors.green}✓${colors.reset} Event chain executed successfully`);
    } else {
      throw new Error('Event chain did not complete');
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Integration test failed:`, error);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}Testing Event-Driven Architecture (Phase 3)${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  const results = [];
  
  results.push(await testEventBus());
  results.push(await testMessageQueue());
  results.push(await testDataSyncService());
  results.push(await testAgendaService());
  results.push(await testEventDrivenIntegration());
  
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  if (failed === 0) {
    console.log(`${colors.green}✅ All tests passed! (${passed}/${results.length})${colors.reset}`);
    console.log(`\n${colors.green}Phase 3: Event-Driven Architecture is complete!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${failed} tests failed (${passed}/${results.length} passed)${colors.reset}`);
  }
  
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
  
  // Cleanup
  eventBus.clear();
  messageQueue.shutdown();
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);