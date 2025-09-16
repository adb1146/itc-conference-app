import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function redistributeSessions() {
  try {
    console.log('🔄 Redistributing sessions across conference days');
    console.log('================================================');

    // Get all sessions
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' }
    });

    console.log(`Found ${sessions.length} total sessions to redistribute`);

    // Roughly distribute sessions across 3 days
    const sessionsPerDay = Math.ceil(sessions.length / 3);

    // Group sessions by their original time of day to maintain schedule logic
    const sessionsByTimeOfDay: { [key: string]: typeof sessions } = {
      morning: [],
      afternoon: [],
      evening: []
    };

    sessions.forEach(session => {
      const hour = new Date(session.startTime).getHours();
      if (hour < 12) {
        sessionsByTimeOfDay.morning.push(session);
      } else if (hour < 17) {
        sessionsByTimeOfDay.afternoon.push(session);
      } else {
        sessionsByTimeOfDay.evening.push(session);
      }
    });

    // Distribute evenly across days while maintaining time of day
    const day1Sessions: typeof sessions = [];
    const day2Sessions: typeof sessions = [];
    const day3Sessions: typeof sessions = [];

    // Distribute morning sessions
    const morningPerDay = Math.ceil(sessionsByTimeOfDay.morning.length / 3);
    sessionsByTimeOfDay.morning.forEach((session, index) => {
      if (index < morningPerDay) {
        day1Sessions.push(session);
      } else if (index < morningPerDay * 2) {
        day2Sessions.push(session);
      } else {
        day3Sessions.push(session);
      }
    });

    // Distribute afternoon sessions
    const afternoonPerDay = Math.ceil(sessionsByTimeOfDay.afternoon.length / 3);
    sessionsByTimeOfDay.afternoon.forEach((session, index) => {
      if (index < afternoonPerDay) {
        day1Sessions.push(session);
      } else if (index < afternoonPerDay * 2) {
        day2Sessions.push(session);
      } else {
        day3Sessions.push(session);
      }
    });

    // Distribute evening sessions
    const eveningPerDay = Math.ceil(sessionsByTimeOfDay.evening.length / 3);
    sessionsByTimeOfDay.evening.forEach((session, index) => {
      if (index < eveningPerDay) {
        day1Sessions.push(session);
      } else if (index < eveningPerDay * 2) {
        day2Sessions.push(session);
      } else {
        day3Sessions.push(session);
      }
    });

    // Update sessions for each day
    console.log('\n📅 Updating session dates:');

    // Day 1 - Tuesday Oct 14
    console.log(`\nDay 1 (Tuesday, Oct 14): ${day1Sessions.length} sessions`);
    for (const session of day1Sessions) {
      const oldStart = new Date(session.startTime);
      const oldEnd = new Date(session.endTime);

      // Set to Oct 14, 2025
      const newStart = new Date(2025, 9, 14, oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(2025, 9, 14, oldEnd.getHours(), oldEnd.getMinutes());

      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });
    }

    // Day 2 - Wednesday Oct 15
    console.log(`Day 2 (Wednesday, Oct 15): ${day2Sessions.length} sessions`);
    for (const session of day2Sessions) {
      const oldStart = new Date(session.startTime);
      const oldEnd = new Date(session.endTime);

      // Set to Oct 15, 2025
      const newStart = new Date(2025, 9, 15, oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(2025, 9, 15, oldEnd.getHours(), oldEnd.getMinutes());

      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });
    }

    // Day 3 - Thursday Oct 16
    console.log(`Day 3 (Thursday, Oct 16): ${day3Sessions.length} sessions`);
    for (const session of day3Sessions) {
      const oldStart = new Date(session.startTime);
      const oldEnd = new Date(session.endTime);

      // Set to Oct 16, 2025
      const newStart = new Date(2025, 9, 16, oldStart.getHours(), oldStart.getMinutes());
      const newEnd = new Date(2025, 9, 16, oldEnd.getHours(), oldEnd.getMinutes());

      await prisma.session.update({
        where: { id: session.id },
        data: {
          startTime: newStart,
          endTime: newEnd
        }
      });
    }

    console.log('\n✨ Redistribution complete!');

    // Verify the distribution
    console.log('\n📊 Verification:');
    console.log('================');

    const updatedSessions = await prisma.session.findMany({
      select: { startTime: true }
    });

    const finalDistribution = new Map<string, number>();
    updatedSessions.forEach(session => {
      const date = new Date(session.startTime).toISOString().split('T')[0];
      finalDistribution.set(date, (finalDistribution.get(date) || 0) + 1);
    });

    const expectedDates = [
      { date: '2025-10-14', label: 'Day 1 (Tuesday)' },
      { date: '2025-10-15', label: 'Day 2 (Wednesday)' },
      { date: '2025-10-16', label: 'Day 3 (Thursday)' }
    ];

    expectedDates.forEach(({ date, label }) => {
      const count = finalDistribution.get(date) || 0;
      console.log(`${label}: ${count} sessions`);
    });

  } catch (error) {
    console.error('Error redistributing sessions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

redistributeSessions();