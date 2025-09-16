import prisma from '../lib/db';

async function checkClosingParty() {
  try {
    // Search for closing party
    const closingParty = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: 'closing', mode: 'insensitive' } },
          { title: { contains: 'party', mode: 'insensitive' } },
          { description: { contains: 'closing party', mode: 'insensitive' } }
        ]
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log('Found sessions with closing/party:', closingParty.length);
    closingParty.forEach(session => {
      const dateStr = new Date(session.startTime).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        weekday: 'long',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
      });
      console.log(`- "${session.title}": ${dateStr}`);
    });

    // Check Thursday evening sessions
    const thursdayEvening = await prisma.session.findMany({
      where: {
        startTime: {
          gte: new Date('2025-10-16T17:00:00'),
          lte: new Date('2025-10-16T23:59:59')
        }
      },
      orderBy: {
        startTime: 'asc'
      }
    });

    console.log('\n\nThursday (Oct 16) evening sessions after 5 PM:');
    thursdayEvening.forEach(session => {
      const dateStr = new Date(session.startTime).toLocaleString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit'
      });
      console.log(`- ${dateStr}: "${session.title}"`);
    });

    // Check if we need to add a closing party
    if (closingParty.length === 0) {
      console.log('\n\n⚠️  No closing party found in database!');
      console.log('You may want to add it with a script.');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkClosingParty();