const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Parse time string to Date object
function parseTimeToDate(timeStr, dayNumber) {
  // Parse times like "8:00am - 9:00am" or "11:30am - 1:00pm"
  const baseDate = new Date(`2025-10-${13 + dayNumber}`); // Oct 14, 15, 16
  
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

// Parse speaker information
function parseSpeakers(speakerStr) {
  if (!speakerStr || speakerStr === '') return [];
  
  const speakers = [];
  
  // Split by common delimiters
  const speakerParts = speakerStr.split(/\s*\|\s*/);
  
  speakerParts.forEach(part => {
    // Look for patterns like "Name - Title - Company"
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
function extractTags(eventName, otherDetails) {
  const tags = [];
  const text = `${eventName} ${otherDetails}`.toLowerCase();
  
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
    
    console.log(`Created ${createdSpeakers.size} speakers in database`);
    
    // Process sessions
    let sessionCount = 0;
    let currentDay = 1;
    let lastEventName = '';
    
    for (const record of records) {
      const timeStr = record['Time'];
      const eventName = record['Event'];
      const location = record['Location'];
      const otherDetails = record['Other Details'];
      
      // Skip empty events
      if (!eventName || eventName === '') continue;
      
      // Detect day changes (rough heuristic based on event patterns)
      if (eventName.toLowerCase().includes('day 2') || 
          (lastEventName.toLowerCase().includes('closing') && !eventName.toLowerCase().includes('closing'))) {
        currentDay = 2;
      } else if (eventName.toLowerCase().includes('day 3') ||
                 eventName.toLowerCase().includes('final day')) {
        currentDay = 3;
      }
      
      const times = parseTimeToDate(timeStr, currentDay);
      
      if (!times) {
        console.log(`Skipping event without valid time: ${eventName}`);
        continue;
      }
      
      const track = determineTrack(location, eventName, otherDetails);
      const tags = extractTags(eventName, otherDetails);
      
      // Extract clean location (remove track info)
      const cleanLocation = location ? location.replace(/\s*(Agents Track|Brokers Track|ITC LATAM|Kickoff Summit.*|Event Information|Golf Tournament|Simon-Kucher Masterclass)/gi, '').trim() : 'TBD';
      
      try {
        // Add day information to tags
        const sessionTags = [...tags, `day${currentDay}`];
        
        // Create session (without day field since it doesn't exist in schema)
        const session = await prisma.session.create({
          data: {
            title: eventName,
            description: otherDetails || `Join us for ${eventName}`,
            startTime: times.startDate,
            endTime: times.endDate,
            location: cleanLocation || 'TBD',
            track: track,
            level: 'All', // Default level
            tags: sessionTags
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
        if (sessionCount % 10 === 0) {
          console.log(`  Processed ${sessionCount} sessions...`);
        }
        
        lastEventName = eventName;
      } catch (error) {
        console.log(`Error creating session "${eventName}":`, error.message);
      }
    }
    
    // Get final counts
    const finalSessions = await prisma.session.count();
    const finalSpeakers = await prisma.speaker.count();
    const finalMappings = await prisma.sessionSpeaker.count();
    
    console.log('\n=== Import Complete ===');
    console.log(`Sessions: ${finalSessions}`);
    console.log(`Speakers: ${finalSpeakers}`);
    console.log(`Session-Speaker mappings: ${finalMappings}`);
    
    // Show sample sessions
    const sampleSessions = await prisma.session.findMany({
      take: 10,
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
      // Extract day from tags
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
        console.log(`  Tags: ${session.tags.join(', ')}`);
      }
    });
    
  } catch (error) {
    console.error('Error importing CSV:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importCSVAgenda();