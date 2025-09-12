const fetch = require('node-fetch');

async function testUsersAPI() {
  try {
    // First, let's check the database directly
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://postgres:postgres@localhost:5442/itc_dev'
        }
      }
    });
    
    const dbUsers = await prisma.user.findMany({
      select: {
        email: true,
        isAdmin: true
      }
    });
    
    console.log('=== DATABASE USERS ===');
    dbUsers.forEach(u => {
      console.log(`${u.email}: isAdmin=${u.isAdmin}`);
    });
    
    await prisma.$disconnect();
    
    // Now test the API
    console.log('\n=== API RESPONSE ===');
    const response = await fetch('http://localhost:3011/api/admin/users');
    
    if (!response.ok) {
      console.log('API Status:', response.status);
      const text = await response.text();
      console.log('Response:', text);
    } else {
      const users = await response.json();
      console.log('API returned', users.length, 'users');
      users.forEach(u => {
        console.log(`${u.email}: isAdmin=${u.isAdmin}`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testUsersAPI();