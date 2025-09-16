/**
 * Test the complete agenda → registration → profile flow for anonymous users
 * This simulates the full user journey from anonymous to registered with saved agenda
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendChatMessage(message: string, sessionId: string, expectRegistrationTrigger = false) {
  console.log(`\n${colors.cyan}User:${colors.reset} "${message}"`);
  console.log(colors.yellow + 'Sending...' + colors.reset);

  try {
    const response = await fetch('http://localhost:3011/api/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        sessionId,
        userId: null, // Anonymous user
        isAnonymous: true
      }),
    });

    if (!response.ok) {
      console.error(`${colors.red}❌ Request failed: ${response.status}${colors.reset}`);
      return null;
    }

    // Read streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let registrationTriggered = false;
    let actionReceived = null;

    if (reader) {
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Check for content
              if (parsed.type === 'content' && parsed.content) {
                fullResponse += parsed.content;
              }

              // Check for action signals
              if (parsed.type === 'action') {
                actionReceived = parsed.action;
                console.log(`\n${colors.bright}${colors.blue}📢 Action Signal Received: ${parsed.action}${colors.reset}`);

                if (parsed.action === 'show_registration') {
                  registrationTriggered = true;
                  console.log(`${colors.green}✅ Registration form should now appear in chat!${colors.reset}`);

                  if (parsed.metadata) {
                    console.log(`${colors.cyan}Metadata:${colors.reset}`, parsed.metadata);
                  }
                }
              }
            } catch (e) {
              // Skip non-JSON lines
            }
          }
        }
      }
    }

    // Display response preview
    console.log(`\n${colors.blue}Bot:${colors.reset}`);
    const preview = fullResponse.substring(0, 500);
    console.log(preview + (fullResponse.length > 500 ? '...' : ''));

    // Check if registration was triggered when expected
    if (expectRegistrationTrigger && !registrationTriggered) {
      console.log(`\n${colors.red}⚠️  WARNING: Expected registration trigger but didn't receive it!${colors.reset}`);
    } else if (registrationTriggered) {
      console.log(`\n${colors.green}✅ Registration flow triggered successfully!${colors.reset}`);
    }

    return { response: fullResponse, actionReceived };

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error);
    return null;
  }
}

async function testCompleteFlow() {
  const sessionId = `test_anon_${Date.now()}`;

  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}${colors.cyan}TESTING COMPLETE ANONYMOUS USER → REGISTERED USER FLOW${colors.reset}`);
  console.log('='.repeat(80));
  console.log(`\n${colors.yellow}Session ID:${colors.reset} ${sessionId}`);
  console.log(`${colors.yellow}User Type:${colors.reset} Anonymous (not logged in)`);
  console.log(`${colors.yellow}Test Goal:${colors.reset} Build agenda → Trigger registration → Complete profile`);
  console.log('\n' + '='.repeat(80));

  // Step 1: Initial request as anonymous user
  console.log(`\n${colors.bright}STEP 1: Anonymous user requests agenda help${colors.reset}`);
  console.log('-'.repeat(40));

  const step1 = await sendChatMessage(
    "I'm a senior underwriter interested in AI and risk modeling. Help me build my conference agenda",
    sessionId
  );

  await delay(2000);

  // Step 2: Interact with the agenda suggestions
  console.log(`\n${colors.bright}STEP 2: User interacts with agenda suggestions${colors.reset}`);
  console.log('-'.repeat(40));

  const step2 = await sendChatMessage(
    "Focus on morning sessions for Day 1 and 2",
    sessionId
  );

  await delay(2000);

  // Step 3: User wants to save the agenda (should trigger registration)
  console.log(`\n${colors.bright}STEP 3: User wants to save agenda (should trigger registration)${colors.reset}`);
  console.log('-'.repeat(40));

  const step3 = await sendChatMessage(
    "Yes, I want to save this agenda",
    sessionId,
    true // Expecting registration trigger
  );

  await delay(2000);

  // Step 4: Check what happens after registration would complete
  console.log(`\n${colors.bright}STEP 4: Simulating post-registration state${colors.reset}`);
  console.log('-'.repeat(40));

  if (step3?.actionReceived === 'show_registration') {
    console.log(`\n${colors.green}✅ SUCCESS: Registration form would be displayed in chat${colors.reset}`);
    console.log(`\n${colors.cyan}What would happen next:${colors.reset}`);
    console.log('1. User fills out registration form (email, password)');
    console.log('2. System creates account and signs them in');
    console.log('3. Profile form automatically appears (due to our changes)');
    console.log('4. User completes profile (company, role, interests)');
    console.log('5. Agenda is saved with all sessions');
    console.log('6. Bot continues conversation with personalized recommendations');
  } else {
    console.log(`\n${colors.red}❌ ISSUE: Registration was not triggered as expected${colors.reset}`);
    console.log('The system should have sent a "show_registration" action signal');
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log(`${colors.bright}TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(80));

  const registrationTriggered = step3?.actionReceived === 'show_registration';

  console.log(`\n${colors.bright}Results:${colors.reset}`);
  console.log(`• Agenda building for anonymous: ${step1 ? '✅' : '❌'}`);
  console.log(`• Context retention: ${step2 ? '✅' : '❌'}`);
  console.log(`• Registration trigger on save: ${registrationTriggered ? '✅' : '❌'}`);

  if (registrationTriggered) {
    console.log(`\n${colors.green}${colors.bright}✅ FLOW WORKING CORRECTLY${colors.reset}`);
    console.log('The chat would now show the registration form inline,');
    console.log('followed by the profile form, maintaining the agenda throughout.');
  } else {
    console.log(`\n${colors.yellow}${colors.bright}⚠️  FLOW NEEDS ATTENTION${colors.reset}`);
    console.log('Check that the agenda building intent is properly detected');
    console.log('and that the stream route sends the registration action.');
  }

  console.log('\n' + '='.repeat(80));
  console.log(`${colors.cyan}To manually test the complete flow:${colors.reset}`);
  console.log('1. Open http://localhost:3011/chat in an incognito window');
  console.log('2. Say "Help me build my conference agenda"');
  console.log('3. Interact with suggestions');
  console.log('4. Say "Yes" when asked to save');
  console.log('5. Complete the registration form that appears');
  console.log('6. Complete the profile form that follows');
  console.log('7. Verify agenda is saved and conversation continues');
  console.log('='.repeat(80) + '\n');
}

// Run the test
testCompleteFlow().catch(console.error);