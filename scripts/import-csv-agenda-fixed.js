const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Correct conference dates for ITC Vegas 2025
const CONFERENCE_DATES = {
  'Monday': new Date('2025-10-13'),    // Pre-conference: WIISE, Golf
  'Tuesday': new Date('2025-10-14'),   // Kickoff Summit Day
  'Wednesday': new Date('2025-10-15'), // Main Conference Day 1
  'Thursday': new Date('2025-10-16'),  // Main Conference Day 2
};

// Parse time string to Date object with correct base date
function parseTimeToDate(timeStr, baseDate) {
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

// Determine which day of the conference based on line number and event name
function determineDay(lineNumber, eventName, location, otherDetails) {
  // Check event content first (priority)
  const text = `${eventName} ${location} ${otherDetails}`.toLowerCase();

  if (text.includes('wiise workshop') || text.includes('golf tournament')) {
    return 'Monday';
  }
  if (text.includes('wednesday keynotes')) {
    return 'Wednesday';
  }
  if (text.includes('thursday keynotes')) {
    return 'Thursday';
  }
  if (text.includes('kickoff summit')) {
    return 'Tuesday';
  }

  // Fall back to line number-based detection from CSV analysis:
  // Lines 2-17: Monday (Pre-conference)
  // Lines 18-131: Tuesday (Kickoff Summit Day)
  // Lines 132-226: Wednesday (Main Day 1)
  // Lines 227+: Thursday (Main Day 2)
  if (lineNumber <= 17) {
    return 'Monday'; // Pre-conference events
  } else if (lineNumber <= 131) {
    return 'Tuesday'; // Kickoff Summit Day
  } else if (lineNumber <= 226) {
    return 'Wednesday'; // Main Conference Day 1
  } else {
    return 'Thursday'; // Main Conference Day 2
  }
}

// Parse speaker information
function parseSpeakers(speakerStr) {
  if (!speakerStr || speakerStr === '') return [];

  const speakers = [];

  // Split by common delimiters
  const speakerParts = speakerStr.split(/\s*\|\s*/);

  speakerParts.forEach(part => {
    // Look for patterns like "Speaker | Name - Title - Company"
    const match = part.match(/Speaker\s*\|\s*([^-]+)(?:\s*-\s*([^-]+))?(?:\s*-\s*(.+))?/);
    if (match) {
      const name = match[1]?.trim();
      const role = match[2]?.trim() || 'Speaker';
      const company = match[3]?.trim() || '';

      if (name && name !== 'Speaker') {
        speakers.push({ name, role, company });
      }
    } else if (!part.includes('Session Sponsor') && part.trim()) {
      // Try to extract name and details from other formats
      const nameMatch = part.match(/([A-Z][a-z]+ [A-Z][a-z]+)/);
      if (nameMatch) {
        const name = nameMatch[1];
        const remaining = part.replace(name, '').trim();
        const role = remaining.split('-')[0]?.trim() || 'Speaker';
        const company = remaining.split('-')[1]?.trim() || '';
        speakers.push({ name, role, company });
      }
    }
  });

  return speakers;
}

// Determine track from location and event name
function determineTrack(location, eventName, otherDetails) {
  const locationLower = (location || '').toLowerCase();
  const eventLower = (eventName || '').toLowerCase();
  const detailsLower = (otherDetails || '').toLowerCase();

  if (locationLower.includes('agents track') || eventLower.includes('agent')) return 'Agents';
  if (locationLower.includes('brokers track') || eventLower.includes('broker')) return 'Brokers';
  if (locationLower.includes('itc latam')) return 'LATAM';
  if (locationLower.includes('wiise')) return 'WIISE';
  if (locationLower.includes('masterclass')) return 'Masterclass';
  if (locationLower.includes('kickoff summit')) return 'Summit';
  if (eventLower.includes('golf')) return 'Golf Tournament';
  if (eventLower.includes('breakfast') || eventLower.includes('lunch') || eventLower.includes('dinner')) return 'Networking';
  if (eventLower.includes('expo')) return 'Expo';
  if (eventLower.includes('keynote')) return 'Keynote';
  if (detailsLower.includes('ai recommended')) return 'AI Track';

  return 'General';
}

// Extract tags from event details
function extractTags(eventName, otherDetails, day) {
  const tags = [];
  const text = `${eventName} ${otherDetails}`.toLowerCase();

  // Add day tag
  tags.push(day.toLowerCase());

  if (text.includes('ai')) tags.push('AI');
  if (text.includes('insurtech')) tags.push('InsurTech');
  if (text.includes('networking')) tags.push('networking');
  if (text.includes('workshop')) tags.push('workshop');
  if (text.includes('keynote')) tags.push('keynote');
  if (text.includes('panel')) tags.push('panel');
  if (text.includes('masterclass')) tags.push('masterclass');
  if (text.includes('breakfast') || text.includes('lunch') || text.includes('dinner')) tags.push('meal');
  if (text.includes('sponsor')) tags.push('sponsored');
  if (text.includes('latam')) tags.push('LATAM');
  if (text.includes('golf')) tags.push('golf');
  if (text.includes('agent')) tags.push('agents');
  if (text.includes('broker')) tags.push('brokers');
  if (text.includes('underwriting')) tags.push('underwriting');
  if (text.includes('claims')) tags.push('claims');
  if (text.includes('distribution')) tags.push('distribution');

  return tags;
}

async function importCSVAgenda() {
  try {
    console.log('=== ITC Vegas 2025 CSV Import (Fixed Dates) ===\n');
    console.log('Conference Dates:');
    console.log('  Monday, Oct 13: Pre-conference (WIISE, Golf)');
    console.log('  Tuesday, Oct 14: Kickoff Summit Day');
    console.log('  Wednesday, Oct 15: Main Conference Day 1');
    console.log('  Thursday, Oct 16: Main Conference Day 2\n');

    console.log('Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/imports/ITC_Agenda_Events_with_Speakers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('Parsing CSV data...');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });

    console.log(`Found ${records.length} events in CSV\n`);

    // Clear existing data (respecting foreign key constraints)
    console.log('Clearing existing data...');
    await prisma.agendaSession.deleteMany({});
    await prisma.sessionSpeaker.deleteMany({});
    await prisma.favorite.deleteMany({ where: { type: 'session' } });
    await prisma.session.deleteMany({});
    await prisma.favorite.deleteMany({ where: { type: 'speaker' } });
    await prisma.speaker.deleteMany({});

    // Process speakers first
    const speakersMap = new Map();
    records.forEach(record => {
      const speakers = parseSpeakers(record['Speaker(s)']);
      speakers.forEach(speaker => {
        const key = `${speaker.name}-${speaker.company}`;
        if (!speakersMap.has(key)) {
          speakersMap.set(key, speaker);
        }
      });
    });

    console.log(`Found ${speakersMap.size} unique speakers`);

    // Create speakers in database
    const createdSpeakers = new Map();
    for (const [key, speaker] of speakersMap) {
      try {
        const created = await prisma.speaker.create({
          data: {
            name: speaker.name,
            role: speaker.role || 'Speaker',
            company: speaker.company || 'TBD',
            bio: `${speaker.role}${speaker.company ? ' at ' + speaker.company : ''}`
          }
        });
        createdSpeakers.set(key, created);
      } catch (error) {
        console.log(`Error creating speaker ${speaker.name}:`, error.message);
      }
    }

    console.log(`Created ${createdSpeakers.size} speakers in database\n`);

    // Process sessions with correct dates
    let sessionCount = 0;
    const sessionsByDay = { Monday: 0, Tuesday: 0, Wednesday: 0, Thursday: 0 };

    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const lineNumber = i + 2; // +1 for header, +1 for 1-based indexing

      const timeStr = record['Time'];
      const eventName = record['Event'];
      const location = record['Location'];
      const otherDetails = record['Other Details'];

      // Skip empty events
      if (!eventName || eventName === '') continue;

      // Determine the correct day
      const day = determineDay(lineNumber, eventName, location, otherDetails);
      const baseDate = CONFERENCE_DATES[day];

      const times = parseTimeToDate(timeStr, baseDate);

      if (!times) {
        console.log(`Skipping event without valid time: ${eventName} (Line ${lineNumber})`);
        continue;
      }

      const track = determineTrack(location, eventName, otherDetails);
      const tags = extractTags(eventName, otherDetails, day);

      // Extract clean location (remove track info)
      const cleanLocation = location ?
        location.replace(/\s*(Agents Track|Brokers Track|ITC LATAM|Kickoff Summit.*|Event Information|Golf Tournament|Simon-Kucher Masterclass)/gi, '').trim() :
        'TBD';

      try {
        // Create session with correct date
        const session = await prisma.session.create({
          data: {
            title: eventName,
            description: otherDetails || `Join us for ${eventName}`,
            startTime: times.startDate,
            endTime: times.endDate,
            location: cleanLocation || 'TBD',
            track: track,
            level: 'All', // Default level
            tags: tags,
            day: day // Store day for reference
          }
        });

        // Link speakers to session
        const speakers = parseSpeakers(record['Speaker(s)']);
        for (const speaker of speakers) {
          const key = `${speaker.name}-${speaker.company}`;
          const speakerRecord = createdSpeakers.get(key);

          if (speakerRecord) {
            await prisma.sessionSpeaker.create({
              data: {
                sessionId: session.id,
                speakerId: speakerRecord.id
              }
            });
          }
        }

        sessionCount++;
        sessionsByDay[day]++;

        if (sessionCount % 25 === 0) {
          console.log(`  Processed ${sessionCount} sessions...`);
        }
      } catch (error) {
        console.log(`Error creating session "${eventName}" (Line ${lineNumber}):`, error.message);
      }
    }

    // Get final counts
    const finalSessions = await prisma.session.count();
    const finalSpeakers = await prisma.speaker.count();
    const finalMappings = await prisma.sessionSpeaker.count();

    console.log('\n=== Import Complete ===');
    console.log(`Total Sessions: ${finalSessions}`);
    console.log(`Total Speakers: ${finalSpeakers}`);
    console.log(`Session-Speaker mappings: ${finalMappings}\n`);

    console.log('Sessions by Day:');
    Object.entries(sessionsByDay).forEach(([day, count]) => {
      const date = CONFERENCE_DATES[day];
      console.log(`  ${day}, ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: ${count} sessions`);
    });

    // Show sample sessions from each day
    console.log('\n=== Sample Sessions by Day ===');

    for (const day of ['Monday', 'Tuesday', 'Wednesday', 'Thursday']) {
      const daySessions = await prisma.session.findMany({
        where: {
          tags: { has: day.toLowerCase() }
        },
        take: 2,
        orderBy: { startTime: 'asc' },
        include: {
          speakers: {
            include: { speaker: true }
          }
        }
      });

      if (daySessions.length > 0) {
        console.log(`\n${day} (${CONFERENCE_DATES[day].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}):`);
        daySessions.forEach(session => {
          console.log(`  📍 ${session.title.substring(0, 60)}`);
          console.log(`     Time: ${session.startTime?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}`);
          console.log(`     Location: ${session.location}`);
        });
      }
    }

  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCSVAgenda();