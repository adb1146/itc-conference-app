const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createTestUser() {
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('password123', 10);
    
    // Create user
    const user = await prisma.user.create({
      data: {
        email: 'test@example.com',
        password: hashedPassword,
        name: 'Andrew Bartels',
        role: 'Executive',
        company: 'PS Advisory LLC',
        interests: ['AI & Automation', 'Digital Distribution', 'Underwriting'],
        goals: []
      }
    });
    
    console.log('✅ User created successfully!');
    console.log('Email:', user.email);
    console.log('Name:', user.name);
    console.log('You can now login with:');
    console.log('  Email: test@example.com');
    console.log('  Password: password123');
    
  } catch (error) {
    if (error.code === 'P2002') {
      console.log('User already exists with this email');
      console.log('You can login with:');
      console.log('  Email: test@example.com');
      console.log('  Password: password123');
    } else {
      console.error('Error creating user:', error);
    }
  } finally {
    await prisma.$disconnect();
  }
}

createTestUser();