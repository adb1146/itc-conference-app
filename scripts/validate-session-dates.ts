import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

const prisma = new PrismaClient();

// Correct conference dates
const CONFERENCE_DATES = {
  'Monday': new Date('2025-10-13'),    // Pre-conference: WIISE, Golf
  'Tuesday': new Date('2025-10-14'),   // Kickoff Summit Day
  'Wednesday': new Date('2025-10-15'), // Main Conference Day 1
  'Thursday': new Date('2025-10-16'),  // Main Conference Day 2
};

interface CSVRecord {
  Time: string;
  Event: string;
  'Speaker(s)': string;
  Location: string;
  'Other Details': string;
}

interface DateValidation {
  sessionId: string;
  title: string;
  currentDate: Date;
  expectedDate: Date;
  dayDifference: number;
  csvLine: number;
}

function parseTimeToDate(timeStr: string, baseDate: Date): { startDate: Date; endDate: Date } | null {
  if (!timeStr || timeStr === '') return null;

  // Extract start and end times
  const timeMatch = timeStr.match(/(\d{1,2}:\d{2})(am|pm)\s*-\s*(\d{1,2}:\d{2})(am|pm)/i);
  if (!timeMatch) return null;

  const startTime = timeMatch[1];
  const startPeriod = timeMatch[2].toLowerCase();
  const endTime = timeMatch[3];
  const endPeriod = timeMatch[4].toLowerCase();

  // Parse start time
  let [startHour, startMin] = startTime.split(':').map(Number);
  if (startPeriod === 'pm' && startHour !== 12) startHour += 12;
  if (startPeriod === 'am' && startHour === 12) startHour = 0;

  // Parse end time
  let [endHour, endMin] = endTime.split(':').map(Number);
  if (endPeriod === 'pm' && endHour !== 12) endHour += 12;
  if (endPeriod === 'am' && endHour === 12) endHour = 0;

  const startDate = new Date(baseDate);
  startDate.setHours(startHour, startMin, 0, 0);

  const endDate = new Date(baseDate);
  endDate.setHours(endHour, endMin, 0, 0);

  return { startDate, endDate };
}

function determineDay(lineNumber: number, eventName: string): string {
  // Based on CSV analysis:
  // Lines 2-17: Monday (Pre-conference: WIISE Workshop, Golf Tournament)
  // Lines 18-131: Tuesday (Kickoff Summit Day)
  // Lines 132-226: Wednesday (Main Day 1 - Wednesday Keynotes)
  // Lines 227+: Thursday (Main Day 2 - Thursday Keynotes)

  // Additional validation based on event names (priority)
  const eventLower = eventName.toLowerCase();

  if (eventLower.includes('wiise') || eventLower.includes('golf')) {
    return 'Monday';
  }
  if (eventLower.includes('wednesday keynotes')) {
    return 'Wednesday';
  }
  if (eventLower.includes('thursday keynotes')) {
    return 'Thursday';
  }
  if (eventLower.includes('kickoff summit')) {
    return 'Tuesday';
  }

  // Fall back to line number-based detection
  if (lineNumber <= 17) return 'Monday';
  if (lineNumber <= 131) return 'Tuesday';
  if (lineNumber <= 226) return 'Wednesday';
  return 'Thursday';
}

async function validateAndFixDates(fix: boolean = false) {
  try {
    console.log('Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/imports/ITC_Agenda_Events_with_Speakers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('Parsing CSV data...');
    const records: CSVRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Found ${records.length} events in CSV\n`);

    // Get all sessions from database
    const sessions = await prisma.session.findMany({
      orderBy: { startTime: 'asc' }
    });

    console.log(`Found ${sessions.length} sessions in database\n`);

    const discrepancies: DateValidation[] = [];
    const sessionTitleMap = new Map<string, any>();

    // Build map of sessions by title
    sessions.forEach(session => {
      sessionTitleMap.set(session.title, session);
    });

    // Check each CSV record
    records.forEach((record, index) => {
      const lineNumber = index + 2; // +1 for header, +1 for 1-based indexing
      const eventName = record.Event;

      if (!eventName || eventName === '') return;

      const expectedDay = determineDay(lineNumber, eventName);
      const expectedBaseDate = CONFERENCE_DATES[expectedDay as keyof typeof CONFERENCE_DATES];

      const session = sessionTitleMap.get(eventName);
      if (session) {
        const currentDate = new Date(session.startTime);
        const dayDifference = Math.round((currentDate.getTime() - expectedBaseDate.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDifference !== 0) {
          discrepancies.push({
            sessionId: session.id,
            title: eventName,
            currentDate: currentDate,
            expectedDate: expectedBaseDate,
            dayDifference: dayDifference,
            csvLine: lineNumber
          });
        }
      }
    });

    // Report findings
    console.log('=== DATE VALIDATION REPORT ===\n');

    if (discrepancies.length === 0) {
      console.log('✅ All sessions have correct dates!');
    } else {
      console.log(`❌ Found ${discrepancies.length} sessions with incorrect dates:\n`);

      // Group by day difference
      const byDayDiff = discrepancies.reduce((acc, d) => {
        const key = d.dayDifference > 0 ? `+${d.dayDifference}` : `${d.dayDifference}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(d);
        return acc;
      }, {} as Record<string, DateValidation[]>);

      Object.entries(byDayDiff).forEach(([diff, items]) => {
        console.log(`\n📅 Sessions off by ${diff} day(s): ${items.length} sessions`);
        items.slice(0, 5).forEach(item => {
          console.log(`  - "${item.title.substring(0, 60)}..."`);
          console.log(`    Current: ${item.currentDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
          console.log(`    Expected: ${item.expectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}`);
          console.log(`    CSV Line: ${item.csvLine}`);
        });
        if (items.length > 5) {
          console.log(`  ... and ${items.length - 5} more`);
        }
      });

      if (fix) {
        console.log('\n=== FIXING DATES ===\n');

        for (const discrepancy of discrepancies) {
          const times = parseTimeToDate(
            records[discrepancy.csvLine - 2].Time,
            discrepancy.expectedDate
          );

          if (times) {
            await prisma.session.update({
              where: { id: discrepancy.sessionId },
              data: {
                startTime: times.startDate,
                endTime: times.endDate
              }
            });
            console.log(`✅ Fixed: "${discrepancy.title.substring(0, 50)}..."`);
          }
        }

        console.log(`\n✅ Fixed ${discrepancies.length} sessions!`);
      } else {
        console.log('\n💡 To fix these dates, run: npm run validate-dates -- --fix');
      }
    }

    // Show date distribution
    console.log('\n=== DATE DISTRIBUTION ===\n');
    const dateDistribution = sessions.reduce((acc, session) => {
      const date = new Date(session.startTime).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
      });
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.entries(dateDistribution)
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .forEach(([date, count]) => {
        console.log(`${date}: ${count} sessions`);
      });

  } catch (error) {
    console.error('Error validating dates:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run validation
const args = process.argv.slice(2);
const shouldFix = args.includes('--fix');

validateAndFixDates(shouldFix);