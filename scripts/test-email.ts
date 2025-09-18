import { Resend } from 'resend';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testEmail() {
  console.log('Testing email configuration...\n');

  // Check environment variables
  console.log('Environment variables check:');
  console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '✓ Set' : '✗ Missing');
  console.log('EMAIL_FROM:', process.env.EMAIL_FROM || 'Not set');
  console.log('ADMIN_EMAIL:', process.env.ADMIN_EMAIL || 'Not set');

  if (!process.env.RESEND_API_KEY) {
    console.error('\n❌ RESEND_API_KEY is not set!');
    process.exit(1);
  }

  const resend = new Resend(process.env.RESEND_API_KEY);

  // Get test email from command line or use admin email
  const testEmail = process.argv[2] || process.env.ADMIN_EMAIL;

  if (!testEmail) {
    console.error('\n❌ Please provide an email address: npm run test:email your-email@example.com');
    process.exit(1);
  }

  console.log(`\nSending test email to: ${testEmail}`);
  console.log('From:', process.env.EMAIL_FROM || 'noreply@itc-conference.com');

  try {
    const response = await resend.emails.send({
      from: process.env.EMAIL_FROM || 'noreply@itc-conference.com',
      to: testEmail,
      subject: 'Test Email - ITC Conference App',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #667eea;">Test Email Successful!</h1>
          <p>This is a test email from your ITC Conference App.</p>
          <p>If you're receiving this, your email configuration is working correctly.</p>
          <hr style="border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="color: #6b7280; font-size: 14px;">
            Sent at: ${new Date().toLocaleString()}<br>
            Environment: ${process.env.NODE_ENV || 'development'}
          </p>
        </div>
      `,
      text: 'Test Email Successful! Your ITC Conference App email configuration is working correctly.'
    });

    console.log('\n✅ Email sent successfully!');
    console.log('Response:', response);

    console.log('\n📧 Check your inbox (and spam folder) for the test email.');
    console.log('\n💡 Tips if you don\'t see the email:');
    console.log('1. Check your spam/junk folder');
    console.log('2. Verify the domain in Resend dashboard');
    console.log('3. Check Resend dashboard for email status: https://resend.com/emails');

  } catch (error) {
    console.error('\n❌ Failed to send email:', error);

    if (error instanceof Error) {
      if (error.message.includes('401')) {
        console.error('\n🔑 Authentication error - check your RESEND_API_KEY');
      } else if (error.message.includes('domain')) {
        console.error('\n🌐 Domain verification issue - verify your domain in Resend dashboard');
      }
    }

    process.exit(1);
  }
}

testEmail();