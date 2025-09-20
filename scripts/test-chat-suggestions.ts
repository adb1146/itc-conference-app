/**
 * Interactive test script for the enhanced chat suggestion system
 * Run this to test context retention and suggestions
 */

import readline from 'readline';

const API_URL = 'http://localhost:3011/api/chat';

// Test conversation flows
const testFlows = {
  happyHour: [
    "Where are the best happy hours at the conference?",
    "ok on Day 1",
    "what about the first one"
  ],
  aiSessions: [
    "Tell me about AI sessions",
    "Which ones are on Day 2?",
    "Can you help me avoid conflicts?"
  ],
  personalizedAgenda: [
    "I'm interested in cybersecurity and AI",
    "What sessions do you recommend?",
    "Build me a personalized agenda"
  ]
};

interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

class ChatTester {
  private conversationHistory: ConversationMessage[] = [];
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🤖 Enhanced Chat Suggestion Tester');
    console.log('=' .repeat(60));
    console.log('\nOptions:');
    console.log('1. Test predefined flows');
    console.log('2. Interactive chat');
    console.log('3. Exit\n');

    const choice = await this.prompt('Choose option (1-3): ');

    switch (choice) {
      case '1':
        await this.testPredefinedFlows();
        break;
      case '2':
        await this.interactiveChat();
        break;
      case '3':
        this.rl.close();
        process.exit(0);
        break;
      default:
        console.log('Invalid option');
        await this.start();
    }
  }

  private prompt(question: string): Promise<string> {
    return new Promise(resolve => {
      this.rl.question(question, resolve);
    });
  }

  async testPredefinedFlows() {
    console.log('\n📝 Select a test flow:');
    console.log('1. Happy Hour Context Retention');
    console.log('2. AI Sessions Follow-up');
    console.log('3. Personalized Agenda Building\n');

    const choice = await this.prompt('Choose flow (1-3): ');

    let flow: string[];
    let flowName: string;

    switch (choice) {
      case '1':
        flow = testFlows.happyHour;
        flowName = 'Happy Hour Context';
        break;
      case '2':
        flow = testFlows.aiSessions;
        flowName = 'AI Sessions';
        break;
      case '3':
        flow = testFlows.personalizedAgenda;
        flowName = 'Personalized Agenda';
        break;
      default:
        console.log('Invalid option');
        return this.testPredefinedFlows();
    }

    console.log(`\n🧪 Testing: ${flowName}`);
    console.log('-'.repeat(40));

    this.conversationHistory = [];

    for (const message of flow) {
      console.log(`\n👤 You: ${message}`);

      const response = await this.sendMessage(message);

      if (response.error) {
        console.log(`❌ Error: ${response.error}`);
      } else {
        console.log(`\n🤖 Assistant: ${response.response.substring(0, 300)}...`);

        // Show suggestions if present
        const suggestions = this.extractSuggestions(response.response);
        if (suggestions.length > 0) {
          console.log('\n💡 Suggestions detected:');
          suggestions.forEach((s, i) => console.log(`   ${i + 1}. ${s}`));
        }

        // Check context retention
        if (this.conversationHistory.length > 0) {
          const maintainsContext = this.checkContextRetention(message, response.response);
          console.log(`\n✅ Context retained: ${maintainsContext ? 'YES' : 'NO'}`);
        }
      }

      await this.delay(1000); // Pause between messages
    }

    console.log('\n' + '='.repeat(60));
    await this.prompt('\nPress Enter to continue...');
    await this.start();
  }

  async interactiveChat() {
    console.log('\n💬 Interactive Chat Mode');
    console.log('Type "exit" to quit, "clear" to reset conversation');
    console.log('-'.repeat(40));

    while (true) {
      const message = await this.prompt('\n👤 You: ');

      if (message.toLowerCase() === 'exit') {
        break;
      }

      if (message.toLowerCase() === 'clear') {
        this.conversationHistory = [];
        console.log('✨ Conversation cleared');
        continue;
      }

      const response = await this.sendMessage(message);

      if (response.error) {
        console.log(`❌ Error: ${response.error}`);
      } else {
        console.log(`\n🤖 Assistant:\n${response.response}`);

        // Highlight suggestions
        const suggestions = this.extractSuggestions(response.response);
        if (suggestions.length > 0) {
          console.log('\n💡 Clickable Suggestions:');
          suggestions.forEach((s, i) => {
            console.log(`   [${i + 1}] ${s}`);
          });

          const choice = await this.prompt('\nSelect a suggestion (number) or type your own message: ');

          if (choice && !isNaN(Number(choice))) {
            const suggestionIndex = parseInt(choice) - 1;
            if (suggestionIndex >= 0 && suggestionIndex < suggestions.length) {
              // Automatically send the selected suggestion
              console.log(`\n👤 You: ${suggestions[suggestionIndex]}`);
              const suggestionResponse = await this.sendMessage(suggestions[suggestionIndex]);
              console.log(`\n🤖 Assistant:\n${suggestionResponse.response}`);
            }
          }
        }
      }
    }

    await this.start();
  }

  private async sendMessage(message: string): Promise<any> {
    try {
      // Add user message to history
      this.conversationHistory.push({ role: 'user', content: message });

      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          conversationHistory: this.conversationHistory.slice(0, -1), // Don't include current message
          userPreferences: {
            name: 'Test User',
            interests: ['AI', 'Cybersecurity'],
            role: 'CTO'
          }
        })
      });

      const data = await response.json();

      if (data.response) {
        // Add assistant response to history
        this.conversationHistory.push({ role: 'assistant', content: data.response });
      }

      return data;
    } catch (error) {
      return { error: error.message };
    }
  }

  private extractSuggestions(response: string): string[] {
    const suggestions: string[] = [];
    const lines = response.split('\n');

    for (const line of lines) {
      // Look for bullet points with questions
      if (line.match(/^[•\-\*]\s+.+\?$/)) {
        suggestions.push(line.replace(/^[•\-\*]\s+/, '').trim());
      }
    }

    return suggestions;
  }

  private checkContextRetention(userMessage: string, response: string): boolean {
    // Simple heuristic: check if response references previous context
    const previousTopics = this.conversationHistory
      .slice(-4)
      .map(m => m.content.toLowerCase());

    // Check for context indicators
    if (userMessage.toLowerCase().includes('that') ||
        userMessage.toLowerCase().includes('first') ||
        userMessage.toLowerCase().includes('ok')) {

      // Response should reference something from history
      for (const topic of previousTopics) {
        const keywords = topic.split(' ').filter(w => w.length > 4);
        for (const keyword of keywords) {
          if (response.toLowerCase().includes(keyword)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Run the tester
console.log('Starting enhanced chat tester...\n');
console.log('⚠️  Make sure the dev server is running: npm run dev\n');

const tester = new ChatTester();
tester.start().catch(console.error);