const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const { parse } = require('csv-parse/sync');
const prisma = new PrismaClient();

async function extractMissingSurnames() {
  try {
    // Read the CSV file
    const csvContent = fs.readFileSync('/Users/andrewbartels/Projects/my-itcAI-project/itc-conference-app/itc-conference-app/data/imports/ITC_Agenda_Events_with_Speakers.csv', 'utf-8');
    const records = parse(csvContent, {
      columns: ['time', 'event', 'speakers', 'location', 'other'],
      skip_empty_lines: true,
      from_line: 2
    });
    
    // Extract all speaker mentions from CSV
    const speakerMentions = new Map();
    
    records.forEach(record => {
      if (record.speakers && record.speakers.includes('Speaker')) {
        // Split by pipe to get individual speakers
        const speakerList = record.speakers.split('|');
        
        speakerList.forEach(speakerEntry => {
          if (speakerEntry.includes('Speaker')) {
            // Remove "Speaker" prefix
            let cleanEntry = speakerEntry.replace('Speaker', '').trim();
            
            // Extract name and role patterns like "Colleen ThomasVP" or "Angela GrantChief"
            // Pattern: FirstName + Surname + Role (where role starts with capital letter or VP/CEO/etc)
            const patterns = [
              /^([A-Z][a-z]+)\s+([A-Z][a-z]+)(VP|CEO|CTO|CFO|COO|CIO|Chief|Director|Manager|Head|President|Senior|Lead|Executive)/,
              /^([A-Z][a-z]+)([A-Z][a-z]+)(VP|CEO|CTO|CFO|COO|CIO|Chief|Director|Manager|Head|President|Senior|Lead|Executive)/
            ];
            
            for (const pattern of patterns) {
              const match = cleanEntry.match(pattern);
              if (match) {
                const firstName = match[1];
                const surname = match[2];
                const fullName = firstName + ' ' + surname;
                
                if (!speakerMentions.has(firstName) || speakerMentions.get(firstName).length < fullName.length) {
                  speakerMentions.set(firstName, fullName);
                }
                break;
              }
            }
          }
        });
      }
    });
    
    console.log('Found potential name mappings from CSV:');
    speakerMentions.forEach((fullName, firstName) => {
      console.log(`  ${firstName} -> ${fullName}`);
    });
    
    // Get single-name speakers from database
    const singleNameSpeakers = await prisma.speaker.findMany({
      where: {
        NOT: {
          name: { contains: ' ' }
        }
      }
    });
    
    console.log(`\nProcessing ${singleNameSpeakers.length} single-name speakers...`);
    
    let fixedCount = 0;
    for (const speaker of singleNameSpeakers) {
      // Check if we have a full name mapping
      if (speakerMentions.has(speaker.name)) {
        const fullName = speakerMentions.get(speaker.name);
        
        console.log(`Updating: "${speaker.name}" -> "${fullName}"`);
        
        await prisma.speaker.update({
          where: { id: speaker.id },
          data: { name: fullName }
        });
        
        fixedCount++;
      }
    }
    
    console.log(`\n=== Results ===`);
    console.log(`Fixed ${fixedCount} speaker names`);
    
    // Show remaining single-name speakers
    const remaining = await prisma.speaker.count({
      where: {
        NOT: {
          name: { contains: ' ' }
        }
      }
    });
    
    console.log(`Remaining single-name speakers: ${remaining}`);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

extractMissingSurnames();