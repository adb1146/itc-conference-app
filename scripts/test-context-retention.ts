/**
 * Test script for verifying context retention across different conversation scenarios
 * Tests that the chat maintains context when users provide follow-up messages
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

interface TestScenario {
  name: string;
  description: string;
  messages: Array<{
    user: string;
    expectedContext: string;
    explanation: string;
  }>;
}

const scenarios: TestScenario[] = [
  {
    name: "AI Sessions Follow-up",
    description: "User asks about AI sessions then filters by day",
    messages: [
      {
        user: "What are the best AI sessions at the conference?",
        expectedContext: "Should provide list of AI-related sessions",
        explanation: "Initial query about AI sessions"
      },
      {
        user: "Which ones are on day 2?",
        expectedContext: "Should filter the PREVIOUSLY MENTIONED AI sessions for Day 2 only",
        explanation: "Follow-up that should maintain AI session context"
      },
      {
        user: "ok the first one",
        expectedContext: "Should provide details about the FIRST AI session on Day 2 from the previous list",
        explanation: "Reference to specific item from previous response"
      }
    ]
  },
  {
    name: "Speaker Information Deep Dive",
    description: "User asks about speakers then wants more details",
    messages: [
      {
        user: "Who are the keynote speakers?",
        expectedContext: "Should list keynote speakers",
        explanation: "Initial speaker query"
      },
      {
        user: "Tell me more about the second one",
        expectedContext: "Should provide detailed info about the SECOND keynote speaker from the list",
        explanation: "Reference to specific speaker by position"
      },
      {
        user: "What sessions are they presenting?",
        expectedContext: "Should list sessions for the SECOND keynote speaker discussed above",
        explanation: "Follow-up about the same speaker"
      }
    ]
  },
  {
    name: "Track Recommendations",
    description: "User explores specific tracks and sessions",
    messages: [
      {
        user: "What tracks are focused on insurtech innovation?",
        expectedContext: "Should list innovation-focused tracks",
        explanation: "Initial track query"
      },
      {
        user: "ok show me morning sessions",
        expectedContext: "Should show morning sessions FROM THE INNOVATION TRACKS mentioned above",
        explanation: "Time filter on previously mentioned tracks"
      },
      {
        user: "any with panel discussions?",
        expectedContext: "Should filter morning innovation track sessions for panel discussions",
        explanation: "Format filter maintaining track and time context"
      }
    ]
  },
  {
    name: "Agenda Building Context",
    description: "User builds personalized agenda with preferences",
    messages: [
      {
        user: "I'm interested in AI and digital transformation",
        expectedContext: "Should acknowledge interests and offer to help build agenda",
        explanation: "User shares preferences"
      },
      {
        user: "I'm attending days 1 and 2",
        expectedContext: "Should incorporate BOTH AI/digital transformation interests AND day constraints",
        explanation: "Adding day constraints to existing preferences"
      },
      {
        user: "Focus on intermediate level sessions",
        expectedContext: "Should filter for intermediate AI/digital transformation sessions on days 1-2",
        explanation: "Adding level filter to accumulated preferences"
      }
    ]
  },
  {
    name: "Location-based Queries",
    description: "User asks about locations and events",
    messages: [
      {
        user: "Where are the breakout sessions held?",
        expectedContext: "Should provide breakout session locations",
        explanation: "Initial location query"
      },
      {
        user: "Which ones are closest to the main ballroom?",
        expectedContext: "Should identify BREAKOUT SESSION locations near main ballroom",
        explanation: "Proximity filter on previous locations"
      },
      {
        user: "ok what's happening there in the afternoon?",
        expectedContext: "Should show afternoon BREAKOUT sessions in locations near main ballroom",
        explanation: "Time filter on filtered locations"
      }
    ]
  },
  {
    name: "Company and Networking",
    description: "User explores companies and networking opportunities",
    messages: [
      {
        user: "Which insurance companies are presenting?",
        expectedContext: "Should list insurance companies with presentations",
        explanation: "Initial company query"
      },
      {
        user: "Are any hosting networking events?",
        expectedContext: "Should identify networking events hosted by THE INSURANCE COMPANIES listed above",
        explanation: "Event filter on previously mentioned companies"
      },
      {
        user: "What about on the last day?",
        expectedContext: "Should show last day networking events from insurance companies",
        explanation: "Day filter maintaining company and event context"
      }
    ]
  },
  {
    name: "Registration Flow Context",
    description: "User goes through registration with agenda building",
    messages: [
      {
        user: "I want to create a personalized agenda",
        expectedContext: "Should start agenda building process",
        explanation: "Initiating agenda creation"
      },
      {
        user: "I'm interested in blockchain and cybersecurity",
        expectedContext: "Should capture interests and continue building agenda",
        explanation: "Providing preferences"
      },
      {
        user: "I need to register first",
        expectedContext: "Should maintain blockchain/cybersecurity preferences while starting registration",
        explanation: "Switching to registration while keeping preferences"
      }
    ]
  },
  {
    name: "Complex Multi-turn Conversation",
    description: "Extended conversation with multiple context switches",
    messages: [
      {
        user: "What's the opening keynote about?",
        expectedContext: "Should provide opening keynote details",
        explanation: "Initial specific query"
      },
      {
        user: "Who's the speaker?",
        expectedContext: "Should identify the speaker of THE OPENING KEYNOTE",
        explanation: "Follow-up about same keynote"
      },
      {
        user: "Have they spoken at ITC before?",
        expectedContext: "Should check if THE OPENING KEYNOTE SPEAKER has previous ITC appearances",
        explanation: "Historical query about same speaker"
      },
      {
        user: "What other sessions cover similar topics?",
        expectedContext: "Should find sessions similar to THE OPENING KEYNOTE topic",
        explanation: "Topic expansion from keynote"
      }
    ]
  }
];

async function testScenario(scenario: TestScenario, sessionId: string) {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Testing: ${scenario.name}`);
  console.log(`Description: ${scenario.description}`);
  console.log(`${'='.repeat(80)}\n`);

  for (let i = 0; i < scenario.messages.length; i++) {
    const message = scenario.messages[i];
    console.log(`\n${'-'.repeat(40)}`);
    console.log(`Step ${i + 1}/${scenario.messages.length}: ${message.explanation}`);
    console.log(`User message: "${message.user}"`);
    console.log(`Expected context: ${message.expectedContext}`);
    console.log(`${'-'.repeat(40)}`);

    try {
      const response = await fetch('http://localhost:3011/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message.user,
          sessionId: sessionId,
          userId: 'test-user',
          isAnonymous: false
        }),
      });

      if (!response.ok) {
        console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
        continue;
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  fullResponse += parsed.content;
                }
              } catch (e) {
                // Skip non-JSON lines
              }
            }
          }
        }
      }

      console.log(`\nAssistant response preview:`);
      console.log(fullResponse.substring(0, 300) + (fullResponse.length > 300 ? '...' : ''));

      // Analyze if context was maintained
      const contextMaintained = analyzeContextRetention(
        message.expectedContext,
        fullResponse,
        i > 0 ? scenario.messages[i - 1].user : null
      );

      console.log(`\n${contextMaintained ? '✅' : '❌'} Context ${contextMaintained ? 'maintained' : 'lost'}`);

      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`❌ Error testing message:`, error);
    }
  }
}

function analyzeContextRetention(
  expectedContext: string,
  actualResponse: string,
  previousQuery: string | null
): boolean {
  // Simple heuristic analysis - could be enhanced with more sophisticated checks
  const responseLower = actualResponse.toLowerCase();

  // Check for generic responses that indicate context loss
  const genericPhrases = [
    'here are all the',
    'the conference offers',
    'there are many',
    'various sessions',
    'general information'
  ];

  const hasGenericResponse = genericPhrases.some(phrase =>
    responseLower.includes(phrase)
  );

  // Check if response references previous context
  const contextualPhrases = [
    'mentioned earlier',
    'as discussed',
    'from the previous',
    'you asked about',
    'regarding the',
    'based on your interest'
  ];

  const hasContextualReference = contextualPhrases.some(phrase =>
    responseLower.includes(phrase)
  );

  // If it's a follow-up and gives generic response, context was likely lost
  if (previousQuery && hasGenericResponse && !hasContextualReference) {
    return false;
  }

  return true;
}

async function runAllTests() {
  console.log(`\n${'#'.repeat(80)}`);
  console.log(`# Context Retention Test Suite`);
  console.log(`# Testing ${scenarios.length} different conversation scenarios`);
  console.log(`${'#'.repeat(80)}`);

  for (const scenario of scenarios) {
    // Use unique session ID for each scenario to avoid interference
    const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    await testScenario(scenario, sessionId);

    // Delay between scenarios
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n${'#'.repeat(80)}`);
  console.log(`# Test Suite Complete`);
  console.log(`${'#'.repeat(80)}\n`);
}

// Run tests
runAllTests().catch(console.error);