#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createTestUsers() {
  try {
    console.log('Creating test users...');
    
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    const testUsers = [
      {
        email: 'john.doe@example.com',
        password: hashedPassword,
        name: 'John Doe',
        role: 'Executive',
        company: 'Acme Insurance',
        interests: ['AI', 'Claims'],
        goals: ['Learning', 'Networking'],
        isAdmin: false
      },
      {
        email: 'jane.smith@example.com',
        password: hashedPassword,
        name: 'Jane Smith',
        role: 'Product Manager',
        company: 'TechCorp',
        interests: ['InsurTech', 'Innovation'],
        goals: ['Partnership', 'Learning'],
        isAdmin: false
      },
      {
        email: 'bob.wilson@example.com',
        password: hashedPassword,
        name: 'Bob Wilson',
        role: 'Developer',
        company: 'StartupXYZ',
        interests: ['AI', 'Cyber', 'Cloud'],
        goals: ['Learning', 'Recruiting'],
        isAdmin: false
      },
      {
        email: 'sarah.jones@example.com',
        password: hashedPassword,
        name: 'Sarah Jones',
        role: 'CTO',
        company: 'InsureTech Solutions',
        interests: ['Digital Transformation', 'AI'],
        goals: ['Strategic Planning', 'Networking'],
        isAdmin: false
      }
    ];
    
    for (const userData of testUsers) {
      // Check if user already exists
      const existing = await prisma.user.findUnique({
        where: { email: userData.email }
      });
      
      if (!existing) {
        const user = await prisma.user.create({
          data: userData
        });
        console.log(`✅ Created user: ${user.name} (${user.email})`);
      } else {
        console.log(`⚠️  User already exists: ${userData.email}`);
      }
    }
    
    console.log('\n✨ Test users created successfully!');
    console.log('All users have password: password123');
    
  } catch (error) {
    console.error('Error creating test users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createTestUsers();