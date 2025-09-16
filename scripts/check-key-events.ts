import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkKeyEvents() {
  try {
    console.log('🔍 Checking Key Conference Events');
    console.log('===================================');

    // Key events to check
    const keyEvents = [
      'closing party',
      'opening',
      'goo goo dolls',
      'keynote',
      'welcome',
      'registration',
      'breakfast',
      'lunch',
      'dinner'
    ];

    for (const keyword of keyEvents) {
      console.log(`\n📌 Searching for "${keyword}":`);

      const sessions = await prisma.session.findMany({
        where: {
          OR: [
            { title: { contains: keyword, mode: 'insensitive' } },
            { description: { contains: keyword, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          title: true,
          startTime: true,
          description: true
        },
        orderBy: { startTime: 'asc' }
      });

      if (sessions.length > 0) {
        sessions.forEach(session => {
          const date = new Date(session.startTime);
          const dateStr = date.toISOString().split('T')[0];
          const timeStr = date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          });

          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

          // Determine which conference day this is
          let conferenceDay = '';
          if (dateStr === '2025-10-14') {
            conferenceDay = 'Day 1 (Should be Tuesday)';
          } else if (dateStr === '2025-10-15') {
            conferenceDay = 'Day 2 (Should be Wednesday)';
          } else if (dateStr === '2025-10-16') {
            conferenceDay = 'Day 3 (Should be Thursday)';
          } else {
            conferenceDay = '❌ WRONG DATE';
          }

          console.log(`  - ${session.title}`);
          console.log(`    Date: ${dateStr} (${dayOfWeek}) - ${conferenceDay}`);
          console.log(`    Time: ${timeStr}`);
          console.log(`    ID: ${session.id}`);
        });
      }
    }

    // Specifically check for closing party
    console.log('\n🎉 CLOSING PARTY CHECK:');
    console.log('=======================');

    const closingParty = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: 'closing party', mode: 'insensitive' } },
          { title: { contains: 'goo goo dolls', mode: 'insensitive' } }
        ]
      }
    });

    if (closingParty.length > 0) {
      closingParty.forEach(party => {
        const date = new Date(party.startTime);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        console.log(`Found: ${party.title}`);
        console.log(`Current Date: ${dateStr} (${dayOfWeek})`);

        if (dateStr !== '2025-10-16') {
          console.log(`❌ ERROR: Closing party should be on Thursday, Oct 16 (Day 3)`);
          console.log(`   Currently on: ${dateStr}`);
          console.log(`   Needs to be moved to: 2025-10-16`);
        } else {
          console.log(`✅ Correctly on Thursday, Oct 16`);
        }
      });
    }

    // Check for opening events
    console.log('\n🎊 OPENING EVENTS CHECK:');
    console.log('========================');

    const openingEvents = await prisma.session.findMany({
      where: {
        OR: [
          { title: { contains: 'opening', mode: 'insensitive' } },
          { title: { contains: 'welcome', mode: 'insensitive' } }
        ]
      }
    });

    if (openingEvents.length > 0) {
      openingEvents.forEach(event => {
        const date = new Date(event.startTime);
        const dateStr = date.toISOString().split('T')[0];
        const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

        console.log(`Found: ${event.title}`);
        console.log(`Current Date: ${dateStr} (${dayOfWeek})`);

        if (event.title.toLowerCase().includes('opening') && dateStr !== '2025-10-14') {
          console.log(`❌ ERROR: Opening events should be on Tuesday, Oct 14 (Day 1)`);
          console.log(`   Currently on: ${dateStr}`);
          console.log(`   Needs to be moved to: 2025-10-14`);
        }
      });
    }

  } catch (error) {
    console.error('Error checking events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkKeyEvents();