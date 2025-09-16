/**
 * Test script to verify profile updates are working
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testProfileUpdate() {
  console.log('Testing Profile Update Flow');
  console.log('=' .repeat(60));

  // First, we need to sign in as a test user
  // For this test, we'll simulate the profile update API call

  const testProfileData = {
    company: 'PS Advisory',
    role: 'Senior Underwriter',
    organizationType: 'Carrier',
    interests: ['Underwriting & Risk', 'AI & Automation', 'Customer Experience']
  };

  console.log('\n1. Testing profile update API endpoint...');
  console.log('Sending data:', JSON.stringify(testProfileData, null, 2));

  try {
    // Note: This would need a valid session token in a real scenario
    // For now, we'll just test that the endpoint exists and responds
    const response = await fetch('http://localhost:3011/api/user/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        // In a real test, we'd need to include authentication headers
      },
      body: JSON.stringify(testProfileData)
    });

    console.log('\n2. Response status:', response.status);

    if (response.status === 401) {
      console.log('✓ API endpoint exists and requires authentication (expected)');
      console.log('\nTo fully test this:');
      console.log('1. Sign in as Nancy Paul (nancy.paul@psadvisory.com)');
      console.log('2. Complete the profile form in the chat interface');
      console.log('3. Check the database to verify updates were saved');
      console.log('\nYou can check the database with:');
      console.log('npx prisma studio --port 5556');
      console.log('Then look for the user record and verify the fields were updated.');
    } else if (response.ok) {
      const data = await response.json();
      console.log('✅ Profile updated successfully!');
      console.log('Response:', JSON.stringify(data, null, 2));
    } else {
      console.log('❌ Unexpected response:', response.status);
      const text = await response.text();
      console.log('Response body:', text);
    }

  } catch (error) {
    console.error('Error testing profile update:', error);
  }

  console.log('\n' + '=' .repeat(60));
  console.log('Test Complete');
}

// Run the test
testProfileUpdate().catch(console.error);