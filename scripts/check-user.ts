import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

const prisma = new PrismaClient();

async function checkUser() {
  const email = process.argv[2] || 'abartels@gmail.com';

  console.log('Checking production database for user...');
  console.log('Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'));
  console.log('Email to check:', email);

  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (user) {
      console.log('\n✅ User found!');
      console.log('ID:', user.id);
      console.log('Name:', user.name);
      console.log('Email:', user.email);
      console.log('Created:', user.createdAt);
    } else {
      console.log('\n❌ No user found with email:', email);
      console.log('This is why the password reset isn\'t sending emails!');
      console.log('\nTo fix this:');
      console.log('1. Create an account at https://itc-conference-app.vercel.app');
      console.log('2. Or update the email in your profile to match an existing user');
    }

    // Check total users
    const totalUsers = await prisma.user.count();
    console.log('\nTotal users in production database:', totalUsers);

  } catch (error) {
    console.error('Error checking user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();