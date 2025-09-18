import { PrismaClient } from '@prisma/client';
import { Resend } from 'resend';
import crypto from 'crypto';
import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

const prisma = new PrismaClient();

async function testFullPasswordReset() {
  const email = 'abartels@gmail.com';

  console.log('Testing full password reset flow with production config...\n');
  console.log('Environment check:');
  console.log('- RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('- EMAIL_FROM:', process.env.EMAIL_FROM || 'not set');
  console.log('- NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'not set');

  try {
    // 1. Find user
    console.log('\n1. Finding user...');
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    });

    if (!user) {
      console.log('❌ User not found');
      return;
    }
    console.log('✅ User found:', user.id);

    // 2. Generate token
    console.log('\n2. Generating reset token...');
    const resetToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    console.log('✅ Token generated');

    // 3. Save to database
    console.log('\n3. Saving token to database...');
    const tokenRecord = await prisma.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 3600000) // 1 hour
      }
    });
    console.log('✅ Token saved:', tokenRecord.id);

    // 4. Send email
    console.log('\n4. Sending email...');
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;
    console.log('Reset URL:', resetUrl);

    if (!process.env.RESEND_API_KEY) {
      console.log('❌ RESEND_API_KEY not found!');
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const emailResult = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@itc.psadvisory.com',
      to: email,
      subject: 'Test: Reset Your Password - ITC Vegas 2025',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">Password Reset Test</h1>
          <p>This is a test email for password reset.</p>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
          <p>Or copy this link:</p>
          <p style="color: #4f46e5; word-break: break-all;">${resetUrl}</p>
        </div>
      `,
      text: `Reset your password: ${resetUrl}`
    });

    console.log('Email result:', emailResult);

    if (emailResult.data) {
      console.log('\n✅ Email sent successfully!');
      console.log('Email ID:', emailResult.data.id);
      console.log('Check your inbox for the password reset email.');
    } else if (emailResult.error) {
      console.log('\n❌ Failed to send email:');
      console.log('Error:', emailResult.error);
    }

  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testFullPasswordReset();