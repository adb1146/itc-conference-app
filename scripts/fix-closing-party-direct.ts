import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixClosingPartyDirect() {
  try {
    console.log('🎉 Direct Fix for Closing Party Date');
    console.log('=====================================\n');

    // Find the closing party
    const closingParty = await prisma.session.findFirst({
      where: {
        OR: [
          { title: { contains: 'closing party', mode: 'insensitive' } },
          { title: { contains: 'goo goo dolls', mode: 'insensitive' } }
        ]
      }
    });

    if (closingParty) {
      console.log(`Found: ${closingParty.title}`);
      console.log(`ID: ${closingParty.id}`);

      const currentStart = new Date(closingParty.startTime);
      const currentEnd = new Date(closingParty.endTime);

      console.log(`Current Start: ${currentStart.toISOString()}`);
      console.log(`Current End: ${currentEnd.toISOString()}`);

      // The party should be on Oct 16 at 9 PM (21:00)
      // Setting to Oct 16 2025 9:00 PM PT (UTC-7)
      // Oct 16 2025 9:00 PM PT = Oct 17 2025 4:00 AM UTC

      // But we want the date to show as Oct 16 in the database
      // So we'll set it to Oct 16 with the time portion
      const newStartStr = '2025-10-16T21:00:00-07:00'; // 9 PM PT on Oct 16
      const newEndStr = '2025-10-16T23:00:00-07:00';   // 11 PM PT on Oct 16

      // Use raw SQL to update directly
      await prisma.$executeRaw`
        UPDATE "Session"
        SET "startTime" = '2025-10-16T21:00:00'::timestamp,
            "endTime" = '2025-10-16T23:00:00'::timestamp
        WHERE id = ${closingParty.id}
      `;

      console.log('\n✅ Successfully updated closing party to Oct 16, 2025');

      // Verify the fix
      const updated = await prisma.session.findUnique({
        where: { id: closingParty.id }
      });

      if (updated) {
        const verifyDate = new Date(updated.startTime);
        console.log(`\nVerification:`);
        console.log(`  Date: ${verifyDate.toISOString().split('T')[0]}`);
        console.log(`  Time: ${verifyDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
        console.log(`  Day: ${verifyDate.toLocaleDateString('en-US', { weekday: 'long' })}`);
      }
    } else {
      console.log('❌ Could not find closing party event');
    }

    // Also check if there are any other events on Oct 17 that should be on Oct 16
    console.log('\n🔍 Checking for events on Oct 17 (should not exist):');

    const oct17Events = await prisma.session.findMany({
      where: {
        AND: [
          { startTime: { gte: new Date('2025-10-17T00:00:00Z') } },
          { startTime: { lt: new Date('2025-10-18T00:00:00Z') } }
        ]
      },
      select: {
        id: true,
        title: true,
        startTime: true
      }
    });

    if (oct17Events.length > 0) {
      console.log(`Found ${oct17Events.length} events on Oct 17 that may need to be moved:`);

      for (const event of oct17Events) {
        console.log(`  - ${event.title}`);

        // Move them to Oct 16
        const currentStart = new Date(event.startTime);
        const hours = currentStart.getHours();
        const minutes = currentStart.getMinutes();

        await prisma.$executeRaw`
          UPDATE "Session"
          SET "startTime" = "startTime" - INTERVAL '1 day',
              "endTime" = "endTime" - INTERVAL '1 day'
          WHERE id = ${event.id}
        `;
      }

      console.log('  ✅ Moved all Oct 17 events to Oct 16');
    } else {
      console.log('  ✅ No events found on Oct 17');
    }

  } catch (error) {
    console.error('Error fixing closing party:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixClosingPartyDirect();