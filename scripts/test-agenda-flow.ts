#!/usr/bin/env npx tsx
/**
 * Test Script for Simplified Agenda Builder Flow
 * Tests the complete flow from user input to saved agenda
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';

// Load from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { getOrchestrator } from '../lib/agents/orchestrator-singleton';
import { generateSmartAgenda } from '../lib/tools/schedule/smart-agenda-builder';
import { savePersonalizedAgenda, getActiveAgenda } from '../lib/services/agenda-storage-service';
import prisma from '../lib/db';
import bcrypt from 'bcryptjs';

console.log('🚀 Testing Simplified Agenda Builder Flow\n');
console.log('=' .repeat(80));

// Verify environment variables are loaded
console.log('\n🔐 Environment Check:');
console.log(`  • Anthropic API Key: ${process.env.ANTHROPIC_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`  • Pinecone API Key: ${process.env.PINECONE_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`  • OpenAI API Key: ${process.env.OPENAI_API_KEY ? '✅ Loaded' : '❌ Missing'}`);
console.log(`  • Database URL: ${process.env.DATABASE_URL ? '✅ Loaded' : '❌ Missing'}`);

// Test user data (matching our simulation)
const testUserData = {
  name: 'Andrew Bartels',
  company: 'PS Advisory',
  title: 'CEO',
  email: 'test.andrew@psadvisory.com', // Using test email
  interests: ['AI', 'Digital Transformation', 'InsurTech Innovation'],
  goals: ['Learning emerging trends', 'Strategic networking']
};

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up any existing test data...');

  try {
    // Delete test user if exists
    await prisma.user.deleteMany({
      where: { email: testUserData.email }
    });
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.log('ℹ️  No existing test data to clean');
  }
}

async function createTestUser() {
  console.log('\n👤 Creating test user...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  const user = await prisma.user.create({
    data: {
      email: testUserData.email,
      password: hashedPassword,
      name: testUserData.name,
      company: testUserData.company,
      role: testUserData.title,
      interests: testUserData.interests,
      goals: testUserData.goals
    }
  });

  console.log(`✅ User created: ${user.id}`);
  return user;
}

async function testDirectAgendaGeneration(userId: string) {
  console.log('\n📅 Testing Direct Agenda Generation...');

  const startTime = Date.now();

  try {
    // Load user with favorites
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        favorites: {
          include: {
            session: true,
            speaker: true
          }
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    console.log(`  → User has ${user.favorites.length} favorites`);
    console.log(`  → Interests: ${user.interests.join(', ')}`);

    // Generate agenda
    console.log('  → Generating personalized agenda...');
    const result = await generateSmartAgenda(userId, {
      preferredTracks: user.interests,
      includeMeals: true,
      maxSessionsPerDay: 8
    });

    const genTime = Date.now() - startTime;

    if (result.success && result.agenda) {
      // Count sessions
      let sessionCount = 0;
      for (const day of Object.values(result.agenda.days)) {
        sessionCount += day.sessions.filter((s: any) => s.type === 'session').length;
      }

      console.log(`✅ Agenda generated in ${genTime}ms`);
      console.log(`  → Total sessions: ${sessionCount}`);
      console.log(`  → Days covered: ${Object.keys(result.agenda.days).length}`);

      return result.agenda;
    } else {
      throw new Error(result.error || 'Failed to generate agenda');
    }
  } catch (error) {
    console.error('❌ Agenda generation failed:', error);
    throw error;
  }
}

async function testAgendaSaving(userId: string, agenda: any) {
  console.log('\n💾 Testing Agenda Storage...');

  try {
    const saved = await savePersonalizedAgenda(userId, agenda, {
      generatedBy: 'ai_agent',
      title: `Test Agenda - ${new Date().toLocaleDateString()}`,
      description: 'Test agenda created by automated test'
    });

    console.log(`✅ Agenda saved: ${saved.id}`);
    console.log(`  → Version: ${saved.version}`);
    console.log(`  → Active: ${saved.isActive}`);

    // Verify retrieval
    const retrieved = await getActiveAgenda(userId);

    if (retrieved && retrieved.id === saved.id) {
      console.log('✅ Agenda retrieval verified');
      return saved;
    } else {
      throw new Error('Could not retrieve saved agenda');
    }
  } catch (error) {
    console.error('❌ Agenda saving failed:', error);
    throw error;
  }
}

async function testOrchestratorFlow() {
  console.log('\n🤖 Testing Orchestrator Flow...');

  const orchestrator = getOrchestrator();
  const sessionId = 'test-session-' + Date.now();

  // Simulate the conversation flow
  const steps = [
    { message: "Build me a personalized agenda", expectedPhase: 'greeting' },
    { message: `I'm ${testUserData.name} from ${testUserData.company}, ${testUserData.title}`, expectedPhase: 'collecting_info' },
    { message: `I'm interested in ${testUserData.interests.join(', ')}`, expectedPhase: 'building_agenda' }
  ];

  for (const step of steps) {
    console.log(`\n  → User: "${step.message}"`);
    const response = await orchestrator.processMessage(sessionId, step.message);

    console.log(`  ← Bot: ${response.message.substring(0, 100)}...`);

    if (response.metadata) {
      console.log(`     Phase: ${response.metadata.phase}`);
      console.log(`     Confidence: ${response.metadata.confidence}`);
      console.log(`     Completeness: ${response.metadata.dataCompleteness}%`);
    }

    if (response.agenda) {
      console.log('  ✅ Agenda generated via orchestrator!');
      return response.agenda;
    }
  }
}

async function runAllTests() {
  try {
    // 1. Cleanup
    await cleanupTestData();

    // 2. Create test user
    const user = await createTestUser();

    // 3. Test direct agenda generation
    const agenda = await testDirectAgendaGeneration(user.id);

    // 4. Test saving
    const saved = await testAgendaSaving(user.id, agenda);

    // 5. Test orchestrator flow (optional)
    // await testOrchestratorFlow();

    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ ALL TESTS PASSED!\n');
    console.log('Summary:');
    console.log(`  • User created: ${user.name}`);
    console.log(`  • Agenda generated with sessions`);
    console.log(`  • Agenda saved to database`);
    console.log(`  • Ready for chat interface testing`);

    console.log('\n📱 To test in the app:');
    console.log('  1. Go to http://localhost:3000');
    console.log('  2. Open the chat');
    console.log('  3. Type: "Build me a personalized agenda"');
    console.log('  4. Follow the prompts\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run tests
runAllTests().catch(console.error);