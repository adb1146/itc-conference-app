#!/usr/bin/env npx tsx
/**
 * Create a test user with an agenda for app testing
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import prisma from '../lib/db';
import bcrypt from 'bcryptjs';
import { savePersonalizedAgenda } from '../lib/services/agenda-storage-service';
import { SmartAgenda } from '../lib/tools/schedule/types';

const TEST_USER = {
  email: 'demo@itc.com',
  password: 'demo123',
  name: 'Demo User',
  company: 'ITC Conference',
  role: 'Attendee'
};

async function createTestUserWithAgenda() {
  console.log('🧹 Cleaning up existing test user...');
  await prisma.user.deleteMany({
    where: { email: TEST_USER.email }
  });

  console.log('👤 Creating test user...');
  const hashedPassword = await bcrypt.hash(TEST_USER.password, 10);
  const user = await prisma.user.create({
    data: {
      email: TEST_USER.email,
      password: hashedPassword,
      name: TEST_USER.name,
      company: TEST_USER.company,
      role: TEST_USER.role,
      interests: ['AI', 'Digital Transformation', 'InsurTech'],
      goals: ['Learning', 'Networking', 'Innovation']
    }
  });

  console.log('📅 Creating agenda...');
  // Get some real sessions
  const sessions = await prisma.session.findMany({
    take: 12,
    where: {
      track: { in: ['Data & Analytics', 'General', 'Summit'] }
    }
  });

  const agenda: SmartAgenda = {
    days: {
      day1: {
        date: '2024-10-15',
        sessions: sessions.slice(0, 4).map(s => ({
          type: 'session' as const,
          sessionId: s.id,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || 'Main Hall',
          description: s.description,
          track: s.track,
          speakers: s.speakers as string[],
          reason: 'Recommended for you',
          priority: 80,
          isFavorite: false
        }))
      },
      day2: {
        date: '2024-10-16',
        sessions: sessions.slice(4, 8).map(s => ({
          type: 'session' as const,
          sessionId: s.id,
          title: s.title,
          startTime: s.startTime,
          endTime: s.endTime,
          location: s.location || 'Main Hall',
          description: s.description,
          track: s.track,
          speakers: s.speakers as string[],
          reason: 'Based on your interests',
          priority: 75,
          isFavorite: false
        }))
      },
      day3: {
        date: '2024-10-17',
        sessions: sessions.slice(8, 12).map(s => ({
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
      }
    },
    metadata: {
      totalSessions: sessions.length,
      totalDays: 3,
      createdAt: new Date().toISOString(),
      generationMethod: 'ai_agent',
      userProfile: {
        interests: ['AI', 'Digital Transformation', 'InsurTech'],
        goals: ['Learning', 'Networking', 'Innovation']
      }
    }
  };

  await savePersonalizedAgenda(user.id, agenda, {
    generatedBy: 'ai_agent',
    title: 'Your ITC Vegas 2025 Schedule',
    description: 'AI-generated schedule based on your profile'
  });

  console.log('\n✅ Test user created successfully!\n');
  console.log('📱 To test in the app:');
  console.log('   1. Go to http://localhost:3011');
  console.log('   2. Click on "AI Concierge" or the chat button');
  console.log('   3. Login with:');
  console.log(`      Email: ${TEST_USER.email}`);
  console.log(`      Password: ${TEST_USER.password}`);
  console.log('   4. Type: "Show me my agenda" or "Build me a personalized schedule"\n');
}

createTestUserWithAgenda()
  .catch(console.error)
  .finally(() => prisma.$disconnect());