/**
 * Revert the timezone fix - the database times were correct
 * We need to subtract 8 hours from all sessions to restore original times
 */

import prisma from '../lib/db';

async function revertTimezoneFix() {
  console.log('🔄 Reverting timezone changes...');

  try {
    // Get all sessions
    const sessions = await prisma.session.findMany();
    console.log(`Found ${sessions.length} sessions to revert`);

    let updated = 0;

    for (const session of sessions) {
      // Subtract 8 hours from both start and end times
      const newStartTime = new Date(session.startTime);
      newStartTime.setHours(newStartTime.getHours() - 8);

      const newEndTime = new Date(session.endTime);
      newEndTime.setHours(newEndTime.getHours() - 8);

      // Update the session
      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStartTime,
          endTime: newEndTime
        }
      });

      updated++;
      if (updated % 50 === 0) {
        console.log(`  Reverted ${updated} sessions...`);
      }
    }

    console.log(`✅ Successfully reverted ${updated} sessions`);

    // Verify a sample session
    const sampleSession = await prisma.session.findFirst({
      where: {
        title: {
          contains: 'ITC LATAM Opening Keynote'
        }
      }
    });

    if (sampleSession) {
      const vegasTime = new Date(sampleSession.startTime).toLocaleTimeString('en-US', {
        timeZone: 'America/Los_Angeles',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });

      console.log('\n📋 Sample session after revert:');
      console.log(`  Title: ${sampleSession.title}`);
      console.log(`  Start (UTC): ${sampleSession.startTime.toISOString()}`);
      console.log(`  Start (Vegas): ${vegasTime}`);
      console.log('\n  This should be around 6:10 AM for the LATAM keynote');
    }

  } catch (error) {
    console.error('❌ Error reverting timezone:', error);
    process.exit(1);
  }
}

revertTimezoneFix()
  .then(() => {
    console.log('\n✅ Timezone revert completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Failed to revert:', error);
    process.exit(1);
  });