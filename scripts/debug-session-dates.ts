import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function debugSessionDates() {
  try {
    console.log('🔍 Debug Session Dates and Filtering');
    console.log('====================================\n');

    // Get a few sessions from each expected day
    const sessions = await prisma.session.findMany({
      take: 10,
      orderBy: { startTime: 'asc' },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    console.log('Sample Sessions and their dates:\n');

    for (const session of sessions) {
      const date = new Date(session.startTime);

      console.log(`Title: ${session.title}`);
      console.log(`  Raw startTime: ${session.startTime}`);
      console.log(`  ISO String: ${date.toISOString()}`);
      console.log(`  ISO Date part: ${date.toISOString().split('T')[0]}`);
      console.log(`  Local Date String: ${date.toLocaleDateString()}`);
      console.log(`  UTC Date: ${date.getUTCDate()}`);
      console.log(`  Local Date: ${date.getDate()}`);
      console.log('---');
    }

    // Test the filtering logic
    console.log('\n📊 Testing Filter Logic:');
    console.log('========================\n');

    const testDates = [
      '2025-10-14',
      '2025-10-15',
      '2025-10-16'
    ];

    for (const testDate of testDates) {
      const filtered = await prisma.session.findMany({
        where: {
          AND: [
            { startTime: { gte: new Date(`${testDate}T00:00:00.000Z`) } },
            { startTime: { lt: new Date(`${testDate}T23:59:59.999Z`) } }
          ]
        }
      });

      console.log(`Date ${testDate}: ${filtered.length} sessions found using date range filter`);

      // Test the exact filter used in the UI
      const allSessions = await prisma.session.findMany();
      const uiFiltered = allSessions.filter(session => {
        const sessionDate = new Date(session.startTime).toISOString().split('T')[0];
        return sessionDate === testDate;
      });

      console.log(`Date ${testDate}: ${uiFiltered.length} sessions found using UI filter logic`);

      // Show mismatch if any
      if (filtered.length !== uiFiltered.length) {
        console.log(`  ⚠️  MISMATCH! Range filter: ${filtered.length}, UI filter: ${uiFiltered.length}`);

        // Show examples of mismatched sessions
        const rangeIds = new Set(filtered.map(s => s.id));
        const uiIds = new Set(uiFiltered.map(s => s.id));

        const onlyInRange = filtered.filter(s => !uiIds.has(s.id)).slice(0, 2);
        const onlyInUI = uiFiltered.filter(s => !rangeIds.has(s.id)).slice(0, 2);

        if (onlyInRange.length > 0) {
          console.log('  Sessions only in range filter:');
          onlyInRange.forEach(s => {
            console.log(`    - ${s.title} (${new Date(s.startTime).toISOString()})`);
          });
        }

        if (onlyInUI.length > 0) {
          console.log('  Sessions only in UI filter:');
          onlyInUI.forEach(s => {
            console.log(`    - ${s.title} (${new Date(s.startTime).toISOString()})`);
          });
        }
      }

      console.log('');
    }

    // Check for timezone issues
    console.log('🌍 Timezone Analysis:');
    console.log('=====================\n');

    const sampleSession = sessions[0];
    if (sampleSession) {
      const date = new Date(sampleSession.startTime);
      console.log(`Sample: ${sampleSession.title}`);
      console.log(`  Database value: ${sampleSession.startTime}`);
      console.log(`  As Date object: ${date}`);
      console.log(`  ISO String: ${date.toISOString()}`);
      console.log(`  Timezone offset: ${date.getTimezoneOffset()} minutes`);
    }

  } catch (error) {
    console.error('Error debugging:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugSessionDates();