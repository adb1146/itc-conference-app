const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNetworkingTracks() {
  const networkingKeywords = [
    'party', 'parties', 'happy hour', 'networking', 'mixer',
    'reception', 'cocktail', 'wine', 'whiskey', 'tasting',
    'lunch', 'breakfast', 'dinner', 'coffee',
    'margarita', 'bourbon', 'kickoff', 'closing'
  ];

  const sessions = await prisma.session.findMany({
    orderBy: { startTime: 'asc' }
  });

  const networkingEvents = sessions.filter(s => {
    const title = s.title.toLowerCase();
    const desc = (s.description || '').toLowerCase();
    const tags = (s.tags || []).map(t => t.toLowerCase());

    return networkingKeywords.some(keyword =>
      title.includes(keyword) ||
      desc.includes(keyword) ||
      tags.includes('networking') ||
      tags.includes('meal')
    );
  });

  console.log(`\n=== Networking/Party Events by Track ===\n`);

  // Group by track
  const byTrack = {};
  networkingEvents.forEach(event => {
    const track = event.track || 'No Track Assigned';
    if (!byTrack[track]) byTrack[track] = [];
    byTrack[track].push(event);
  });

  // Display track distribution
  console.log('Track Distribution:');
  Object.entries(byTrack).forEach(([track, events]) => {
    console.log(`  ${track}: ${events.length} events`);
  });

  console.log('\n=== Details by Track ===\n');

  // Display events by track
  Object.entries(byTrack)
    .sort((a, b) => b[1].length - a[1].length) // Sort by count descending
    .forEach(([track, events]) => {
      console.log(`${track} (${events.length} events):`);
      events.slice(0, 10).forEach(event => {
        const datetime = new Date(event.startTime);
        const day = datetime.toLocaleDateString('en-US', { weekday: 'short' });
        const time = datetime.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        console.log(`  • [${day} ${time}] ${event.title}`);
      });
      if (events.length > 10) {
        console.log(`  ... and ${events.length - 10} more`);
      }
      console.log('');
    });

  // Check specific important events
  console.log('\n=== Major Party/Social Events Track Assignment ===\n');

  const majorEvents = [
    'kickoff party',
    'closing party',
    'happy hour',
    'wine tasting',
    'whiskey tasting',
    'bourbon',
    'margarita'
  ];

  majorEvents.forEach(keyword => {
    const found = networkingEvents.filter(e =>
      e.title.toLowerCase().includes(keyword)
    );

    if (found.length > 0) {
      console.log(`Events with "${keyword}":`);
      found.forEach(event => {
        console.log(`  • ${event.title}`);
        console.log(`    Track: ${event.track || 'No Track Assigned'}`);
        console.log(`    Tags: ${event.tags.join(', ') || 'None'}`);
      });
      console.log('');
    }
  });

  await prisma.$disconnect();
}

checkNetworkingTracks().catch(console.error);