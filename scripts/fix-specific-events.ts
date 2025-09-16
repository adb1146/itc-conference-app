import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixSpecificEvents() {
  try {
    console.log('🔧 Fixing Specific Event Dates');
    console.log('===============================\n');

    // 1. Fix Closing Party - Move from Oct 15 to Oct 16
    console.log('1️⃣ Fixing Closing Party (should be Day 3 - Thursday Oct 16)');

    const closingParty = await prisma.session.findFirst({
      where: {
        OR: [
          { title: { contains: 'closing party', mode: 'insensitive' } },
          { title: { contains: 'goo goo dolls', mode: 'insensitive' } }
        ]
      }
    });

    if (closingParty) {
      const currentDate = new Date(closingParty.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (currentDateStr !== '2025-10-16') {
        // Move to Oct 16, keeping the same time
        const newStart = new Date(2025, 9, 16, currentDate.getHours(), currentDate.getMinutes());
        const endDate = new Date(closingParty.endTime);
        const newEnd = new Date(2025, 9, 16, endDate.getHours(), endDate.getMinutes());

        await prisma.session.update({
          where: { id: closingParty.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        console.log(`  ✅ Moved "${closingParty.title}" from ${currentDateStr} to 2025-10-16`);
      } else {
        console.log(`  ✓ Closing party already on correct date`);
      }
    }

    // 2. Fix Day 2 and Day 3 breakfast/lunch that are incorrectly on Day 1
    console.log('\n2️⃣ Fixing Day 2 and Day 3 Breakfast/Lunch events');

    const day2Breakfast = await prisma.session.findFirst({
      where: { title: { contains: 'Breakfast Sponsored by Jackson (Day 2)' } }
    });

    if (day2Breakfast) {
      const currentDate = new Date(day2Breakfast.startTime);
      const newStart = new Date(2025, 9, 15, currentDate.getHours(), currentDate.getMinutes());
      const endDate = new Date(day2Breakfast.endTime);
      const newEnd = new Date(2025, 9, 15, endDate.getHours(), endDate.getMinutes());

      await prisma.session.update({
        where: { id: day2Breakfast.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      console.log(`  ✅ Moved Day 2 Breakfast to Oct 15 (Wednesday)`);
    }

    const day3Breakfast = await prisma.session.findFirst({
      where: { title: { contains: 'Breakfast Sponsored by Jackson (Day 3)' } }
    });

    if (day3Breakfast) {
      const currentDate = new Date(day3Breakfast.startTime);
      const newStart = new Date(2025, 9, 16, currentDate.getHours(), currentDate.getMinutes());
      const endDate = new Date(day3Breakfast.endTime);
      const newEnd = new Date(2025, 9, 16, endDate.getHours(), endDate.getMinutes());

      await prisma.session.update({
        where: { id: day3Breakfast.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      console.log(`  ✅ Moved Day 3 Breakfast to Oct 16 (Thursday)`);
    }

    // Fix Day 2 and Day 3 lunch
    const day2Lunch = await prisma.session.findFirst({
      where: { title: { contains: 'Lunch Sponsored by isolved (Day 2)' } }
    });

    if (day2Lunch) {
      const currentDate = new Date(day2Lunch.startTime);
      const newStart = new Date(2025, 9, 15, currentDate.getHours(), currentDate.getMinutes());
      const endDate = new Date(day2Lunch.endTime);
      const newEnd = new Date(2025, 9, 15, endDate.getHours(), endDate.getMinutes());

      await prisma.session.update({
        where: { id: day2Lunch.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      console.log(`  ✅ Moved Day 2 Lunch to Oct 15 (Wednesday)`);
    }

    const day3Lunch = await prisma.session.findFirst({
      where: { title: { contains: 'Lunch Sponsored by isolved (Day 3)' } }
    });

    if (day3Lunch) {
      const currentDate = new Date(day3Lunch.startTime);
      const newStart = new Date(2025, 9, 16, currentDate.getHours(), currentDate.getMinutes());
      const endDate = new Date(day3Lunch.endTime);
      const newEnd = new Date(2025, 9, 16, endDate.getHours(), endDate.getMinutes());

      await prisma.session.update({
        where: { id: day3Lunch.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });

      console.log(`  ✅ Moved Day 3 Lunch to Oct 16 (Thursday)`);
    }

    // 3. Fix keynotes that say Wednesday/Thursday but are on wrong days
    console.log('\n3️⃣ Fixing Keynote events');

    const wednesdayKeynotes = await prisma.session.findFirst({
      where: { title: { contains: 'Wednesday Keynotes' } }
    });

    if (wednesdayKeynotes) {
      const currentDate = new Date(wednesdayKeynotes.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (currentDateStr !== '2025-10-15') {
        const newStart = new Date(2025, 9, 15, currentDate.getHours(), currentDate.getMinutes());
        const endDate = new Date(wednesdayKeynotes.endTime);
        const newEnd = new Date(2025, 9, 15, endDate.getHours(), endDate.getMinutes());

        await prisma.session.update({
          where: { id: wednesdayKeynotes.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        console.log(`  ✅ Moved Wednesday Keynotes to Oct 15 (Wednesday)`);
      }
    }

    const thursdayKeynotes = await prisma.session.findFirst({
      where: { title: { contains: 'Thursday Keynotes' } }
    });

    if (thursdayKeynotes) {
      const currentDate = new Date(thursdayKeynotes.startTime);
      const currentDateStr = currentDate.toISOString().split('T')[0];

      if (currentDateStr !== '2025-10-16') {
        const newStart = new Date(2025, 9, 16, currentDate.getHours(), currentDate.getMinutes());
        const endDate = new Date(thursdayKeynotes.endTime);
        const newEnd = new Date(2025, 9, 16, endDate.getHours(), endDate.getMinutes());

        await prisma.session.update({
          where: { id: thursdayKeynotes.id },
          data: {
            startTime: newStart,
            endTime: newEnd
          }
        });

        console.log(`  ✅ Moved Thursday Keynotes to Oct 16 (Thursday)`);
      }
    }

    // 4. Fix Day 2 specific events (should be on Wednesday)
    console.log('\n4️⃣ Fixing Day 2 specific events');

    const day2SpecificEvents = [
      'Cyber Insurance Summit Opening Remarks',
      'State Farm Startup Pitch Competition: Opening Remarks'
    ];

    for (const eventTitle of day2SpecificEvents) {
      const event = await prisma.session.findFirst({
        where: { title: { contains: eventTitle } }
      });

      if (event) {
        const currentDate = new Date(event.startTime);
        const currentDateStr = currentDate.toISOString().split('T')[0];

        // These should be on Day 2 (Wednesday Oct 15)
        if (currentDateStr !== '2025-10-15') {
          const newStart = new Date(2025, 9, 15, currentDate.getHours(), currentDate.getMinutes());
          const endDate = new Date(event.endTime);
          const newEnd = new Date(2025, 9, 15, endDate.getHours(), endDate.getMinutes());

          await prisma.session.update({
            where: { id: event.id },
            data: {
              startTime: newStart,
              endTime: newEnd
            }
          });

          console.log(`  ✅ Moved "${eventTitle}" to Oct 15 (Wednesday)`);
        }
      }
    }

    // 5. Verify the fixes
    console.log('\n📊 Verification of Fixes:');
    console.log('========================');

    const verifyEvents = [
      { title: 'closing party', expectedDate: '2025-10-16', expectedDay: 'Thursday' },
      { title: 'Wednesday Keynotes', expectedDate: '2025-10-15', expectedDay: 'Wednesday' },
      { title: 'Thursday Keynotes', expectedDate: '2025-10-16', expectedDay: 'Thursday' },
      { title: 'Breakfast Sponsored by Jackson (Day 2)', expectedDate: '2025-10-15', expectedDay: 'Wednesday' },
      { title: 'Breakfast Sponsored by Jackson (Day 3)', expectedDate: '2025-10-16', expectedDay: 'Thursday' }
    ];

    for (const check of verifyEvents) {
      const event = await prisma.session.findFirst({
        where: { title: { contains: check.title, mode: 'insensitive' } }
      });

      if (event) {
        const eventDate = new Date(event.startTime).toISOString().split('T')[0];
        const status = eventDate === check.expectedDate ? '✅' : '❌';
        console.log(`${status} ${event.title}: ${eventDate} (Expected: ${check.expectedDate})`);
      }
    }

    console.log('\n✨ Event date fixes completed!');

  } catch (error) {
    console.error('Error fixing events:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSpecificEvents();