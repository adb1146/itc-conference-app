const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse time string to Date object
function parseTimeToDate(timeStr, dayNumber) {
  // Base dates for Oct 14, 15, 16, 2025
  const baseDate = new Date(`2025-10-${13 + dayNumber}T00:00:00-07:00`);
  
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

// Parse speaker information with better extraction
function parseSpeakers(speakerStr) {
  if (!speakerStr || speakerStr === '') return [];
  
  const speakers = [];
  
  // Clean up the speaker string
  let cleanStr = speakerStr.replace(/Speaker\s*\|/g, '');
  
  // Split by common delimiters
  const speakerParts = cleanStr.split(/\s*\|\s*/);
  
  speakerParts.forEach(part => {
    if (part.includes('Session Sponsor')) return;
    if (!part.trim()) return;
    
    // Try to extract name, role, and company
    // Pattern: Name - Role - Company or NameRole - Company
    const patterns = [
      /^([A-Z][a-zA-Z\s]+?)(?:\s*-\s*|\s+)([A-Z][a-zA-Z\s,&]+?)(?:\s*-\s*|\s+at\s+|\s+@\s+)(.+)$/,
      /^([A-Z][a-zA-Z\s]+?)([A-Z]{2,}[a-zA-Z\s]*)\s*-\s*(.+)$/,
      /^([A-Z][a-zA-Z\s]+?)(?:\s*-\s*|\s+)(.+)$/
    ];
    
    let matched = false;
    for (const pattern of patterns) {
      const match = part.trim().match(pattern);
      if (match) {
        const name = match[1].trim();
        const role = match[2] ? match[2].trim() : 'Speaker';
        const company = match[3] ? match[3].trim() : (match[2] || 'TBD');
        
        if (name && !name.includes('Show more')) {
          speakers.push({ 
            name: name.replace(/\s+/g, ' '), 
            role: role.replace(/\s+/g, ' '), 
            company: company.replace(/\s+/g, ' ')
          });
          matched = true;
          break;
        }
      }
    }
    
    // Fallback: treat the whole part as a name
    if (!matched && part.trim() && !part.includes('Show more')) {
      const name = part.trim().replace(/\s+/g, ' ');
      if (name.match(/^[A-Z]/)) {
        speakers.push({ name, role: 'Speaker', company: 'TBD' });
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
  
  if (locationLower.includes('agents track') || eventLower.includes('itc agents')) return 'Agents';
  if (locationLower.includes('brokers track') || eventLower.includes('broker')) return 'Brokers';
  if (locationLower.includes('itc latam')) return 'LATAM';
  if (locationLower.includes('wiise')) return 'WIISE';
  if (locationLower.includes('masterclass')) return 'Masterclass';
  if (locationLower.includes('kickoff summit') || locationLower.includes('summit')) return 'Summit';
  if (eventLower.includes('golf')) return 'Golf';
  if (eventLower.includes('breakfast') || eventLower.includes('lunch') || eventLower.includes('dinner') || eventLower.includes('happy hour')) return 'Networking';
  if (eventLower.includes('expo')) return 'Expo';
  if (eventLower.includes('keynote')) return 'Keynote';
  if (locationLower.includes('main stage')) return 'Main Stage';
  if (detailsLower.includes('ai recommended')) return 'AI Track';
  if (eventLower.includes('claims')) return 'Claims';
  if (eventLower.includes('data')) return 'Data & Analytics';
  if (eventLower.includes('cyber')) return 'Cyber';
  
  return 'General';
}

// Extract tags from event details
function extractTags(eventName, otherDetails, location) {
  const tags = [];
  const text = `${eventName} ${otherDetails} ${location}`.toLowerCase();
  
  if (text.includes('ai ')) tags.push('AI');
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
  if (text.includes('cyber')) tags.push('cyber');
  if (text.includes('data')) tags.push('data');
  if (text.includes('analytics')) tags.push('analytics');
  if (text.includes('recommended')) tags.push('recommended');
  
  return [...new Set(tags)]; // Remove duplicates
}

// Detect day based on patterns in the CSV
function detectDayChange(eventName, previousEvent, currentIndex) {
  const eventLower = eventName.toLowerCase();
  
  // Day 1 indicators (Oct 14)
  if (currentIndex < 100) return 1;
  
  // Day 2 indicators (Oct 15)
  if (currentIndex >= 100 && currentIndex < 200) return 2;
  
  // Day 3 indicators (Oct 16)
  if (currentIndex >= 200) return 3;
  
  // Also check for explicit day mentions
  if (eventLower.includes('day 1') || eventLower.includes('october 14')) return 1;
  if (eventLower.includes('day 2') || eventLower.includes('october 15')) return 2;
  if (eventLower.includes('day 3') || eventLower.includes('october 16')) return 3;
  
  return 1; // Default to day 1
}

async function importFetchedAgenda() {
  try {
    console.log('Reading CSV file...');
    const csvPath = path.join(__dirname, '../data/imports/ITC_Agenda_Events_with_Speakers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    
    console.log('Parsing CSV data...');
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} events in CSV`);
    
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.sessionSpeaker.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.speaker.deleteMany({});
    
    // Process speakers first
    const speakersMap = new Map();
    records.forEach(record => {
      const speakers = parseSpeakers(record['Speaker(s)']);
      speakers.forEach(speaker => {
        const key = `${speaker.name}|||${speaker.company}`;
        if (!speakersMap.has(key)) {
          speakersMap.set(key, speaker);
        }
      });
    });
    
    console.log(`Found ${speakersMap.size} unique speakers`);
    
    // Create speakers in database
    const createdSpeakers = new Map();
    let speakerCount = 0;
    for (const [key, speaker] of speakersMap) {
      try {
        const created = await prisma.speaker.create({
          data: {
            name: speaker.name,
            role: speaker.role || 'Speaker',
            company: speaker.company || 'TBD',
            bio: `${speaker.role}${speaker.company && speaker.company !== 'TBD' ? ' at ' + speaker.company : ''}`
          }
        });
        createdSpeakers.set(key, created);
        speakerCount++;
        if (speakerCount % 50 === 0) {
          console.log(`  Created ${speakerCount} speakers...`);
        }
      } catch (error) {
        console.log(`Error creating speaker ${speaker.name}:`, error.message);
      }
    }
    
    console.log(`Created ${createdSpeakers.size} speakers in database`);
    
    // Process sessions with better day detection
    let sessionCount = 0;
    let skippedCount = 0;
    let currentDay = 1;
    let previousEventName = '';
    const sessionTitles = new Set();
    
    for (let i = 0; i < records.length; i++) {
      const record = records[i];
      const timeStr = record['Time'];
      const eventName = record['Event'];
      const location = record['Location'];
      const otherDetails = record['Other Details'];
      
      // Skip empty events
      if (!eventName || eventName === '') {
        skippedCount++;
        continue;
      }
      
      // Detect day changes
      currentDay = detectDayChange(eventName, previousEventName, i);
      
      const times = parseTimeToDate(timeStr, currentDay);
      
      if (!times) {
        console.log(`Skipping event without valid time: ${eventName}`);
        skippedCount++;
        continue;
      }
      
      const track = determineTrack(location, eventName, otherDetails);
      const tags = extractTags(eventName, otherDetails, location);
      
      // Add day tag
      tags.push(`day${currentDay}`);
      
      // Extract clean location
      const cleanLocation = location ? 
        location.replace(/\s*(Agents Track|Brokers Track|ITC LATAM|Kickoff Summit.*|Event Information|Golf Tournament|Simon-Kucher Masterclass|Show more)/gi, '')
          .replace(/\s+/g, ' ')
          .trim() : 'TBD';
      
      // Create unique title by appending day if duplicate
      let uniqueTitle = eventName;
      if (sessionTitles.has(eventName)) {
        uniqueTitle = `${eventName} (Day ${currentDay})`;
        console.log(`  Duplicate found: "${eventName}" -> "${uniqueTitle}"`);
      }
      sessionTitles.add(eventName);
      
      try {
        // Create session
        const session = await prisma.session.create({
          data: {
            title: uniqueTitle,
            description: otherDetails || `Join us for ${eventName}`,
            startTime: times.startDate,
            endTime: times.endDate,
            location: cleanLocation || 'TBD',
            track: track,
            level: 'All',
            tags: tags
          }
        });
        
        // Link speakers to session
        const speakers = parseSpeakers(record['Speaker(s)']);
        for (const speaker of speakers) {
          const key = `${speaker.name}|||${speaker.company}`;
          const speakerRecord = createdSpeakers.get(key);
          
          if (speakerRecord) {
            try {
              await prisma.sessionSpeaker.create({
                data: {
                  sessionId: session.id,
                  speakerId: speakerRecord.id
                }
              });
            } catch (error) {
              console.log(`Error linking speaker ${speaker.name} to session:`, error.message);
            }
          }
        }
        
        sessionCount++;
        if (sessionCount % 20 === 0) {
          console.log(`  Processed ${sessionCount} sessions...`);
        }
        
        previousEventName = eventName;
      } catch (error) {
        console.log(`Error creating session "${uniqueTitle}":`, error.message);
        skippedCount++;
      }
    }
    
    // Get final counts
    const finalSessions = await prisma.session.count();
    const finalSpeakers = await prisma.speaker.count();
    const finalMappings = await prisma.sessionSpeaker.count();
    
    console.log('\n=== Import Complete ===');
    console.log(`Total records in CSV: ${records.length}`);
    console.log(`Sessions created: ${finalSessions}`);
    console.log(`Sessions skipped: ${skippedCount}`);
    console.log(`Speakers: ${finalSpeakers}`);
    console.log(`Session-Speaker mappings: ${finalMappings}`);
    
    // Show sessions by day
    const day1Sessions = await prisma.session.count({
      where: { tags: { has: 'day1' } }
    });
    const day2Sessions = await prisma.session.count({
      where: { tags: { has: 'day2' } }
    });
    const day3Sessions = await prisma.session.count({
      where: { tags: { has: 'day3' } }
    });
    
    console.log('\n=== Sessions by Day ===');
    console.log(`Day 1 (Oct 14): ${day1Sessions} sessions`);
    console.log(`Day 2 (Oct 15): ${day2Sessions} sessions`);
    console.log(`Day 3 (Oct 16): ${day3Sessions} sessions`);
    
    // Show sessions by track
    const tracks = await prisma.session.groupBy({
      by: ['track'],
      _count: true,
      orderBy: { _count: { track: 'desc' } }
    });
    
    console.log('\n=== Sessions by Track ===');
    tracks.forEach(track => {
      console.log(`${track.track}: ${track._count} sessions`);
    });
    
    // Show sample sessions
    const sampleSessions = await prisma.session.findMany({
      take: 5,
      orderBy: { startTime: 'asc' },
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
    
    console.log('\n=== Sample Sessions ===');
    sampleSessions.forEach(session => {
      const dayTag = session.tags.find(tag => tag.startsWith('day'));
      const day = dayTag ? dayTag.replace('day', '') : '?';
      
      console.log(`\n${session.title}`);
      console.log(`  Day: ${day}, Track: ${session.track}`);
      console.log(`  Time: ${session.startTime?.toLocaleTimeString()} - ${session.endTime?.toLocaleTimeString()}`);
      console.log(`  Location: ${session.location}`);
      if (session.speakers.length > 0) {
        console.log(`  Speakers:`);
        session.speakers.forEach(ss => {
          console.log(`    - ${ss.speaker.name}, ${ss.speaker.role} @ ${ss.speaker.company}`);
        });
      }
      if (session.tags.length > 0) {
        console.log(`  Tags: ${session.tags.filter(t => !t.startsWith('day')).join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importFetchedAgenda();