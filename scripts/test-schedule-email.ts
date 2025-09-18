import { emailService } from '../lib/email/email-service';
import dotenv from 'dotenv';
import path from 'path';

// Load production environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.production.local') });

async function testScheduleEmail() {
  console.log('Testing Schedule Email Functionality\n');
  console.log('=====================================\n');

  // Sample schedule data
  const testSchedule = {
    name: 'Test User',
    email: 'abartels@gmail.com', // Change this to test email
    schedule: [
      {
        day: 'October 14, 2025',
        sessions: [
          {
            title: 'Opening Keynote: The Future of Insurance',
            time: '9:00 AM - 10:30 AM',
            location: 'Ballroom A, Mandalay Bay',
            speakers: ['John Smith (CEO, TechInsure)', 'Jane Doe (CTO, InsureTech)'],
            description: 'Join industry leaders as they discuss the transformation of insurance through technology and innovation.'
          },
          {
            title: 'AI in Underwriting Workshop',
            time: '11:00 AM - 12:30 PM',
            location: 'Conference Room B',
            speakers: ['Dr. Sarah Johnson'],
            description: 'Hands-on workshop exploring practical applications of AI in underwriting processes.'
          },
          {
            title: 'Opening Reception',
            time: '6:00 PM - 10:00 PM',
            location: 'Mandalay Bay Beach',
            description: 'Network with fellow attendees at our opening night reception.'
          }
        ]
      },
      {
        day: 'October 15, 2025',
        sessions: [
          {
            title: 'Claims Automation Panel',
            time: '9:00 AM - 10:00 AM',
            location: 'Jasmine Room',
            speakers: ['Mike Wilson', 'Lisa Chen', 'Robert Brown'],
            description: 'Panel discussion on the latest trends in claims automation.'
          },
          {
            title: 'Startup Pitch Competition',
            time: '2:00 PM - 4:00 PM',
            location: 'Innovation Theater',
            description: 'Watch the top insurtech startups pitch their solutions.'
          }
        ]
      },
      {
        day: 'October 16, 2025',
        sessions: [
          {
            title: 'Closing Keynote: What\'s Next for InsurTech',
            time: '9:00 AM - 10:00 AM',
            location: 'Ballroom A',
            speakers: ['Emily Davis (Venture Partner, InsureVC)'],
            description: 'A look ahead at the future of insurance technology.'
          },
          {
            title: 'Awards Ceremony & Closing Party',
            time: '7:00 PM - 12:00 AM',
            location: 'Events Center',
            description: 'Celebrate the conference with awards and entertainment.'
          }
        ]
      }
    ]
  };

  try {
    console.log('Sending schedule email to:', testSchedule.email);
    console.log('Sessions included:',
      testSchedule.schedule.reduce((acc, day) => acc + day.sessions.length, 0)
    );

    const result = await emailService.sendScheduleEmail(testSchedule);

    if (result.data) {
      console.log('\n✅ Schedule email sent successfully!');
      console.log('Email ID:', result.data.id);
      console.log('\nCheck the inbox for:');
      console.log('- Email with personalized schedule');
      console.log('- Calendar links for each session');
      console.log('- PS Advisory branding and contact info');
    } else if (result.error) {
      console.log('\n❌ Failed to send schedule email:');
      console.log('Error:', result.error);
    }

  } catch (error) {
    console.error('\n❌ Test failed:', error);
  }

  console.log('\n=====================================');
  console.log('Test Complete');
}

testScheduleEmail();