import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

async function testRegistrationEmails() {
  console.log('Testing registration email flow...\n');

  // Generate unique test email
  const timestamp = Date.now();
  const testEmail = `test-user-${timestamp}@example.com`;

  const registrationData = {
    email: testEmail,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    name: 'Test User',
    company: 'Test Company Inc.',
    role: 'CTO',
    organizationType: 'Insurance Carrier',
    interests: ['AI/ML', 'Cloud Computing', 'InsurTech'],
    goals: ['Network with peers', 'Learn about new technologies', 'Find vendors'],
    usingSalesforce: true,
    interestedInSalesforce: false
  };

  console.log('Registration data:', {
    ...registrationData,
    password: '[HIDDEN]',
    confirmPassword: '[HIDDEN]'
  });

  try {
    console.log('\nSending registration request...');
    const response = await fetch('https://itc-conference-app.vercel.app/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Registration successful!');
      console.log('User created:', result.user);
      console.log('\n📧 Check these inboxes:');
      console.log('1. Admin notification: contactus@psadvisory.com');
      console.log('2. Welcome email: ' + testEmail + ' (test email address)');
      console.log('\nNote: The welcome email won\'t be delivered to the test address,');
      console.log('but the admin notification should arrive at contactus@psadvisory.com');
    } else {
      console.log('\n❌ Registration failed:');
      console.log('Status:', response.status);
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Error during registration:', error);
  }
}

testRegistrationEmails();