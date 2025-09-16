#!/usr/bin/env npx tsx
/**
 * Simplified Test for Agenda Builder
 * Tests without AI or vector dependencies
 */

// Load environment variables
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import prisma from '../lib/db';
import bcrypt from 'bcryptjs';
import { savePersonalizedAgenda, getActiveAgenda } from '../lib/services/agenda-storage-service';
import { SmartAgenda } from '../lib/tools/schedule/types';

console.log('🚀 Testing Simplified Agenda Builder (No AI/Vector)\n');
console.log('=' .repeat(80));

// Test user data
const testUserData = {
  name: 'Andrew Bartels',
  company: 'PS Advisory',
  title: 'CEO',
  email: 'test.andrew@psadvisory.com',
  interests: ['AI', 'Digital Transformation', 'InsurTech Innovation'],
  goals: ['Learning emerging trends', 'Strategic networking']
};

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up any existing test data...');
  try {
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

async function createMockAgenda(): Promise<SmartAgenda> {
  console.log('\n📅 Creating mock agenda (bypassing AI)...');

  // Get some real sessions from database
  const sessions = await prisma.session.findMany({
    take: 12,
    where: {
      track: {
        in: ['Data & Analytics', 'General', 'Summit']
      }
    }
  });

  // Create a simple agenda structure
  const agenda: SmartAgenda = {
    days: {
      day1: {
        date: '2024-10-15',
        sessions: [
          {
            type: 'break',
            title: 'Registration & Breakfast',
            startTime: '07:30',
            endTime: '08:30',
            location: 'Registration Area',
            description: 'Check in and enjoy breakfast'
          },
          ...sessions.slice(0, 4).map(s => ({
            type: 'session' as const,
            sessionId: s.id,
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || 'Main Hall',
            description: s.description,
            track: s.track,
            speakers: s.speakers as string[],
            reason: 'Matches your interest in ' + testUserData.interests[0],
            priority: 80,
            isFavorite: false
          })),
          {
            type: 'break',
            title: 'Lunch',
            startTime: '12:00',
            endTime: '13:00',
            location: 'Dining Hall',
            description: 'Networking lunch'
          }
        ]
      },
      day2: {
        date: '2024-10-16',
        sessions: [
          ...sessions.slice(4, 8).map(s => ({
            type: 'session' as const,
            sessionId: s.id,
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || 'Main Hall',
            description: s.description,
            track: s.track,
            speakers: s.speakers as string[],
            reason: 'Aligns with your goals',
            priority: 75,
            isFavorite: false
          }))
        ]
      },
      day3: {
        date: '2024-10-17',
        sessions: [
          ...sessions.slice(8, 12).map(s => ({
            type: 'session' as const,
            sessionId: s.id,
            title: s.title,
            startTime: s.startTime,
            endTime: s.endTime,
            location: s.location || 'Main Hall',
            description: s.description,
            track: s.track,
            speakers: s.speakers as string[],
            reason: 'Industry relevance',
            priority: 70,
            isFavorite: false
          }))
        ]
      }
    },
    metadata: {
      totalSessions: sessions.length,
      totalDays: 3,
      createdAt: new Date().toISOString(),
      generationMethod: 'mock',
      userProfile: {
        interests: testUserData.interests,
        goals: testUserData.goals
      }
    }
  };

  console.log(`✅ Mock agenda created with ${sessions.length} sessions`);
  return agenda;
}

async function testAgendaSaving(userId: string, agenda: SmartAgenda) {
  console.log('\n💾 Testing Agenda Storage...');

  try {
    const saved = await savePersonalizedAgenda(userId, agenda, {
      generatedBy: 'manual',
      title: `Test Agenda - ${new Date().toLocaleDateString()}`,
      description: 'Test agenda created by simplified test'
    });

    console.log(`✅ Agenda saved: ${saved.id}`);
    console.log(`  → Version: ${saved.version}`);
    console.log(`  → Active: ${saved.isActive}`);

    // Verify retrieval
    const retrieved = await getActiveAgenda(userId);

    if (retrieved && retrieved.id === saved.id) {
      console.log('✅ Agenda retrieval verified');

      // Display some agenda details
      console.log('\n📋 Agenda Summary:');
      for (const [dayKey, dayData] of Object.entries(retrieved.agendaData.days)) {
        const sessionCount = dayData.sessions.filter(s => s.type === 'session').length;
        console.log(`  → ${dayKey}: ${sessionCount} sessions on ${dayData.date}`);
      }

      return saved;
    } else {
      throw new Error('Could not retrieve saved agenda');
    }
  } catch (error) {
    console.error('❌ Agenda saving failed:', error);
    throw error;
  }
}

async function runSimpleTest() {
  try {
    // 1. Cleanup
    await cleanupTestData();

    // 2. Create test user
    const user = await createTestUser();

    // 3. Create mock agenda (no AI/vector)
    const agenda = await createMockAgenda();

    // 4. Test saving
    const saved = await testAgendaSaving(user.id, agenda);

    // Summary
    console.log('\n' + '=' .repeat(80));
    console.log('\n✅ SIMPLE TEST PASSED!\n');
    console.log('Summary:');
    console.log(`  • User created: ${user.name}`);
    console.log(`  • Mock agenda generated with sessions`);
    console.log(`  • Agenda saved to database`);
    console.log(`  • Storage and retrieval working`);

    console.log('\n📱 Next step: Test in the app');
    console.log('  1. Go to http://localhost:3000');
    console.log('  2. Login with: test.andrew@psadvisory.com / password123');
    console.log('  3. The saved agenda should be available\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await cleanupTestData();
    await prisma.$disconnect();
  }
}

// Run test
runSimpleTest().catch(console.error);