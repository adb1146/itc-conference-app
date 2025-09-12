#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function promoteToAdmin(email) {
  try {
    if (!email) {
      console.error('Error: Please provide an email address');
      console.log('Usage: node scripts/promote-admin.js <email>');
      process.exit(1);
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      console.error(`Error: User with email "${email}" not found`);
      process.exit(1);
    }

    if (user.isAdmin) {
      console.log(`User "${email}" is already an admin`);
      process.exit(0);
    }

    // Promote user to admin
    const updatedUser = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    });

    console.log(`✅ Successfully promoted "${email}" to admin`);
    console.log('User details:');
    console.log(`  - Name: ${updatedUser.name || 'Not set'}`);
    console.log(`  - Company: ${updatedUser.company || 'Not set'}`);
    console.log(`  - Admin: ${updatedUser.isAdmin}`);
    
  } catch (error) {
    console.error('Error promoting user:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get email from command line arguments
const email = process.argv[2];
promoteToAdmin(email);