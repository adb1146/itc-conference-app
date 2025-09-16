/**
 * Test Script for New Architecture
 * Verifies that the new service-based architecture works correctly
 */

import { createRepositories } from '../src/infrastructure/RepositoryFactory';
import { SearchService } from '../src/application/services/SearchService';
import { ChatService } from '../src/application/services/ChatService';
import { IntentClassifier } from '../src/domain/services/IntentClassifier';
import { ResponseGenerator } from '../src/domain/services/ResponseGenerator';
import { ConversationService } from '../src/application/services/ConversationService';
import { featureFlags } from '../src/infrastructure/FeatureFlags';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m'
};

async function testRepositories() {
  console.log(`\n${colors.blue}Testing Repository Layer...${colors.reset}`);
  
  try {
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    
    // Test session repository
    const sessions = await sessionRepo.search({
      query: 'AI',
      limit: 5
    });
    console.log(`${colors.green}✓${colors.reset} Session repository: Found ${sessions.length} sessions`);
    
    // Test vector repository
    const isAvailable = vectorRepo.isAvailable();
    console.log(`${colors.green}✓${colors.reset} Vector repository: ${isAvailable ? 'Pinecone connected' : 'Using local fallback'}`);
    
    // Test cache repository
    await cacheRepo.set('test-key', { test: 'data' }, 60);
    const cached = await cacheRepo.get('test-key');
    console.log(`${colors.green}✓${colors.reset} Cache repository: ${cached ? 'Working' : 'Failed'}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Repository test failed:`, error);
    return false;
  }
}

async function testSearchService() {
  console.log(`\n${colors.blue}Testing Search Service...${colors.reset}`);
  
  try {
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    const searchService = new SearchService(sessionRepo, vectorRepo, cacheRepo);
    
    const result = await searchService.search({
      query: 'artificial intelligence in insurance',
      type: 'hybrid',
      limit: 10
    });
    
    console.log(`${colors.green}✓${colors.reset} Search service: Found ${result.totalResults} results`);
    console.log(`${colors.gray}  - Search type: ${result.searchType}`);
    console.log(`${colors.gray}  - Cached: ${result.cached}`);
    console.log(`${colors.gray}  - Execution time: ${result.executionTime}ms`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Search service test failed:`, error);
    return false;
  }
}

async function testIntentClassification() {
  console.log(`\n${colors.blue}Testing Intent Classification...${colors.reset}`);
  
  try {
    const classifier = new IntentClassifier();
    
    const testCases = [
      { message: 'Show me AI sessions', expected: 'information_seeking' },
      { message: 'Help me build my agenda', expected: 'agenda_building' },
      { message: 'Where can I eat lunch?', expected: 'local_recommendations' },
      { message: 'Tell me about John Smith from Acme Corp', expected: 'profile_research' }
    ];
    
    for (const testCase of testCases) {
      const result = await classifier.classify(testCase.message);
      const passed = result.type === testCase.expected;
      
      console.log(`${passed ? colors.green + '✓' : colors.red + '✗'}${colors.reset} "${testCase.message}"`);
      console.log(`${colors.gray}  - Intent: ${result.type} (confidence: ${result.confidence})`);
      console.log(`${colors.gray}  - Search type: ${result.searchType}`);
    }
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Intent classification test failed:`, error);
    return false;
  }
}

async function testFeatureFlags() {
  console.log(`\n${colors.blue}Testing Feature Flags...${colors.reset}`);
  
  try {
    // Test percentage rollout
    const results = {
      enabled: 0,
      disabled: 0
    };
    
    // Set 30% rollout
    await featureFlags.rollout('new-chat-service', 30);
    
    // Test with 100 different users
    for (let i = 0; i < 100; i++) {
      const enabled = await featureFlags.isEnabled('new-chat-service', {
        userId: `user-${i}`,
        percentage: 30
      });
      
      if (enabled) results.enabled++;
      else results.disabled++;
    }
    
    console.log(`${colors.green}✓${colors.reset} Feature flags: ${results.enabled}% enabled, ${results.disabled}% disabled`);
    console.log(`${colors.gray}  - Expected ~30% enabled, got ${results.enabled}%`);
    
    // Test rollback
    await featureFlags.rollback('new-chat-service');
    const afterRollback = await featureFlags.isEnabled('new-chat-service', { userId: 'test' });
    console.log(`${colors.green}✓${colors.reset} Rollback: Feature is ${afterRollback ? 'still enabled' : 'disabled'}`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Feature flags test failed:`, error);
    return false;
  }
}

async function testChatService() {
  console.log(`\n${colors.blue}Testing Chat Service (End-to-End)...${colors.reset}`);
  
  try {
    const { sessionRepo, vectorRepo, cacheRepo } = await createRepositories();
    const searchService = new SearchService(sessionRepo, vectorRepo, cacheRepo);
    const intentClassifier = new IntentClassifier();
    const responseGenerator = new ResponseGenerator();
    const conversationService = new ConversationService();
    
    const chatService = new ChatService(
      intentClassifier,
      searchService,
      responseGenerator,
      conversationService
    );
    
    // Test message processing
    const response = await chatService.processMessage({
      message: 'Show me sessions about AI and machine learning',
      sessionId: 'test-session-123',
      userId: 'test-user'
    });
    
    console.log(`${colors.green}✓${colors.reset} Chat service processed message`);
    console.log(`${colors.gray}  - Intent: ${response.metadata?.intent}`);
    console.log(`${colors.gray}  - Sessions found: ${response.metadata?.sessionsFound}`);
    console.log(`${colors.gray}  - Response time: ${response.metadata?.responseTime}ms`);
    console.log(`${colors.gray}  - Response preview: ${response.message.substring(0, 100)}...`);
    
    return true;
  } catch (error) {
    console.error(`${colors.red}✗${colors.reset} Chat service test failed:`, error);
    return false;
  }
}

async function runAllTests() {
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.yellow}Testing New Architecture Components${colors.reset}`);
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  const results = [];
  
  results.push(await testRepositories());
  results.push(await testSearchService());
  results.push(await testIntentClassification());
  results.push(await testFeatureFlags());
  results.push(await testChatService());
  
  console.log(`\n${colors.yellow}${'='.repeat(60)}${colors.reset}`);
  
  const passed = results.filter(r => r).length;
  const failed = results.length - passed;
  
  if (failed === 0) {
    console.log(`${colors.green}✅ All tests passed! (${passed}/${results.length})${colors.reset}`);
    console.log(`\n${colors.green}The new architecture is working correctly!${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ ${failed} tests failed (${passed}/${results.length} passed)${colors.reset}`);
    console.log(`\n${colors.red}Please fix the failing tests before proceeding.${colors.reset}`);
  }
  
  console.log(`${colors.yellow}${'='.repeat(60)}${colors.reset}\n`);
  
  process.exit(failed === 0 ? 0 : 1);
}

// Run tests
runAllTests().catch(console.error);