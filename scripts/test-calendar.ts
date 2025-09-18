import { generateICS, createSessionCalendarEvent, parseSessionTime } from '../lib/calendar/ics-generator';
import { generateCalendarLink } from '../lib/calendar/calendar-link-generator';

console.log('Testing Calendar Functionality\n');
console.log('================================\n');

// Test 1: Parse session time
console.log('Test 1: Parsing session times');
try {
  const { start, end } = parseSessionTime('October 14', '9:00 AM - 10:30 AM');
  console.log('✅ Parsed time:', {
    start: start.toISOString(),
    end: end.toISOString()
  });
} catch (error) {
  console.log('❌ Failed to parse time:', error);
}

// Test 2: Generate calendar event
console.log('\nTest 2: Creating calendar event');
const event = createSessionCalendarEvent(
  'Opening Keynote: The Future of Insurance',
  'October 14',
  '9:00 AM - 10:30 AM',
  'Ballroom A, Mandalay Bay',
  'Join industry leaders as they discuss the transformation of insurance through technology',
  ['John Smith (CEO, TechInsure)', 'Jane Doe (CTO, InsureTech)']
);
console.log('✅ Created event:', event);

// Test 3: Generate ICS content
console.log('\nTest 3: Generating ICS file content');
const icsContent = generateICS(event);
console.log('✅ Generated ICS (first 500 chars):');
console.log(icsContent.substring(0, 500) + '...\n');

// Test 4: Generate calendar link
console.log('Test 4: Generating calendar download link');
const link = generateCalendarLink({
  title: 'Test Session',
  date: 'October 15',
  time: '2:00 PM - 3:00 PM',
  location: 'Conference Room B',
  description: 'This is a test session'
});
console.log('✅ Calendar link:', link);

console.log('\n================================');
console.log('Calendar functionality tests complete!');
console.log('\nTo test in production:');
console.log('1. Visit the app and ask about specific sessions or parties');
console.log('2. Look for "📅 Add to Calendar" links in the responses');
console.log('3. Click the link to download the .ics file');
console.log('4. The file should open in your default calendar app');