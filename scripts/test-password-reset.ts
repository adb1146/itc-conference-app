import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

async function testPasswordReset() {
  const email = process.argv[2] || 'abartels@gmail.com';
  const apiUrl = 'https://itc-conference-app.vercel.app/api/auth/forgot-password';

  console.log('Testing password reset flow...\n');
  console.log('Email:', email);
  console.log('API URL:', apiUrl);

  try {
    console.log('\n📧 Sending password reset request...');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    console.log('Response status:', response.status);
    console.log('Response data:', JSON.stringify(data, null, 2));

    if (response.ok) {
      console.log('\n✅ Password reset request successful!');
      console.log('Check your email for the reset link.');
    } else {
      console.log('\n❌ Password reset request failed');
      console.log('Error:', data.error || 'Unknown error');
    }

  } catch (error) {
    console.error('\n❌ Request failed:', error);
  }
}

testPasswordReset();