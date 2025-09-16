import { getOrchestrator } from '../lib/agents/orchestrator-singleton';

async function testLoggedInUser() {
  console.log('Testing agenda builder with logged-in user...\n');

  const orchestrator = getOrchestrator();

  // Simulate a logged-in user clicking "help me plan my agenda"
  const sessionId = 'test-session-' + Date.now();
  const userId = 'test@example.com'; // This is the email from the Test User profile

  console.log('User: Test User (test@example.com)');
  console.log('Message: "help me plan my agenda"\n');

  const response = await orchestrator.processMessage(
    sessionId,
    'help me plan my agenda',
    userId
  );

  console.log('Orchestrator Response:');
  console.log('===================');
  console.log(response.message);
  console.log('\nPhase:', response.metadata?.phase);
  console.log('Data Completeness:', response.metadata?.dataCompleteness);

  // Check if it recognized the user
  const state = orchestrator['getState'](sessionId);
  console.log('\nUser Info Loaded:');
  console.log('- Name:', state.userInfo.name || 'NOT LOADED');
  console.log('- Company:', state.userInfo.company || 'NOT LOADED');
  console.log('- Title:', state.userInfo.title || 'NOT LOADED');

  process.exit(0);
}

testLoggedInUser().catch(console.error);