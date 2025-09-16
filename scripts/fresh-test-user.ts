#!/usr/bin/env npx tsx
/**
 * Create a fresh test user WITHOUT an agenda
 * This allows testing the agenda builder flow from scratch
 */

import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import prisma from '../lib/db';
import bcrypt from 'bcryptjs';

const FRESH_USER = {
  email: 'nancy.paul@testcompany.com',
  password: 'test123',
  name: 'Nancy Paul',
  company: 'Test Company Inc',
  role: 'VP of Technology'
};

async function createFreshTestUser() {
  console.log('🧹 Cleaning up any existing user with this email...');
  await prisma.user.deleteMany({
    where: { email: FRESH_USER.email }
  });

  console.log('👤 Creating fresh test user (no agenda)...');
  const hashedPassword = await bcrypt.hash(FRESH_USER.password, 10);
  const user = await prisma.user.create({
    data: {
      email: FRESH_USER.email,
      password: hashedPassword,
      name: FRESH_USER.name,
      company: FRESH_USER.company,
      role: FRESH_USER.role,
      // Start with no interests or goals - let the agent discover them
      interests: [],
      goals: []
    }
  });

  console.log('\n✅ Fresh test user created successfully!\n');
  console.log('=' .repeat(60));
  console.log('📱 TEST INSTRUCTIONS:');
  console.log('=' .repeat(60));
  console.log('\n1. Open your browser to: http://localhost:3011');
  console.log('\n2. Click on "AI Concierge" or the chat button (bottom right)');
  console.log('\n3. Login with:');
  console.log(`   Email: ${FRESH_USER.email}`);
  console.log(`   Password: ${FRESH_USER.password}`);
  console.log('\n4. Start the agenda builder by typing one of:');
  console.log('   • "Build me a personalized agenda"');
  console.log('   • "Create my conference schedule"');
  console.log('   • "I need help planning my conference days"');
  console.log('\n5. The agent should:');
  console.log('   • Ask for your interests and goals');
  console.log('   • Build a personalized agenda');
  console.log('   • Save it to your profile');
  console.log('\n' + '=' .repeat(60));
  console.log('\n💡 TIP: This user has NO existing agenda, perfect for');
  console.log('        testing the complete flow from scratch!\n');

  return user.id;
}

createFreshTestUser()
  .then(userId => {
    console.log(`User ID: ${userId} (for debugging)`);
  })
  .catch(console.error)
  .finally(() => prisma.$disconnect());