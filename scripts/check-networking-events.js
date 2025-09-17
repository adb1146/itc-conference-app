const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNetworkingEvents() {
  const networkingKeywords = [
    'party', 'parties', 'happy hour', 'networking', 'mixer',
    'reception', 'cocktail', 'wine', 'whiskey', 'tasting',
    'lunch', 'breakfast', 'dinner', 'coffee', 'expo floor',
    'meet & greet', 'margarita', 'bourbon', 'kickoff'
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

  console.log(`Found ${networkingEvents.length} networking/party events out of ${sessions.length} total sessions:\n`);

  // Group by day
  const byDay = {};
  networkingEvents.forEach(event => {
    const date = new Date(event.startTime).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
    if (!byDay[date]) byDay[date] = [];
    byDay[date].push(event);
  });

  // Display by day
  Object.entries(byDay).forEach(([date, events]) => {
    console.log(`${date}: (${events.length} events)`);
    events.forEach(event => {
      const time = new Date(event.startTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      console.log(`  • ${time}: ${event.title}`);
      if (event.location) {
        console.log(`    Location: ${event.location}`);
      }
    });
    console.log('');
  });

  // Check for specific important events
  console.log('\n=== Key Party/Networking Events ===');
  const keyEvents = [
    'kickoff party',
    'closing party',
    'happy hour',
    'golf',
    'wine tasting',
    'whiskey tasting',
    'margarita'
  ];

  keyEvents.forEach(keyword => {
    const found = networkingEvents.filter(e =>
      e.title.toLowerCase().includes(keyword) ||
      (e.description || '').toLowerCase().includes(keyword)
    );
    if (found.length > 0) {
      console.log(`\n"${keyword}" events:`);
      found.forEach(event => {
        const datetime = new Date(event.startTime);
        console.log(`  - ${event.title}`);
        console.log(`    ${datetime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at ${datetime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
      });
    }
  });

  await prisma.$disconnect();
}

checkNetworkingEvents().catch(console.error);