const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importFetchedAgenda() {
  try {
    // Read the fetched agenda
    const agendaData = JSON.parse(fs.readFileSync('fetched-agenda.json', 'utf8'));
    
    console.log(`Importing ${agendaData.totalFound} sessions from ITC Vegas 2025...`);
    console.log(`Day breakdown:`, agendaData.byDay);
    
    // Clear existing data first (optional - comment out if you want to keep existing)
    console.log('Clearing existing data...');
    await prisma.sessionSpeaker.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.speaker.deleteMany({});
    
    let savedSessions = 0;
    let savedSpeakers = 0;
    let errors = 0;
    
    for (const session of agendaData.sessions) {
      try {
        // Create session
        const savedSession = await prisma.session.create({
          data: {
            title: session.title || `Session ${savedSessions + 1}`,
            description: session.description || '',
            startTime: session.startTime ? new Date(session.startTime) : new Date('2025-10-15T09:00:00'),
            endTime: session.endTime ? new Date(session.endTime) : new Date('2025-10-15T10:00:00'),
            location: session.location || 'TBD',
            track: session.track || null,
            level: session.level || null,
            tags: session.tags || [],
            sourceUrl: 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda',
          },
        });
        
        // Process speakers if available
        if (session.speakers && Array.isArray(session.speakers) && session.speakers.length > 0) {
          for (const speaker of session.speakers) {
            if (speaker.name) {
              try {
                // Check if speaker exists
                let savedSpeaker = await prisma.speaker.findUnique({
                  where: { name: speaker.name }
                });
                
                if (!savedSpeaker) {
                  // Create new speaker
                  savedSpeaker = await prisma.speaker.create({
                    data: {
                      name: speaker.name,
                      role: speaker.title || null,
                      company: speaker.company || null,
                      bio: speaker.bio || null,
                      imageUrl: speaker.imageUrl || null,
                    },
                  });
                  savedSpeakers++;
                } else {
                  // Update existing speaker if we have new info
                  if ((speaker.title && !savedSpeaker.role) || 
                      (speaker.company && !savedSpeaker.company) ||
                      (speaker.bio && !savedSpeaker.bio) ||
                      (speaker.imageUrl && !savedSpeaker.imageUrl)) {
                    savedSpeaker = await prisma.speaker.update({
                      where: { id: savedSpeaker.id },
                      data: {
                        role: speaker.title || savedSpeaker.role,
                        company: speaker.company || savedSpeaker.company,
                        bio: speaker.bio || savedSpeaker.bio,
                        imageUrl: speaker.imageUrl || savedSpeaker.imageUrl,
                      }
                    });
                  }
                }
                
                // Link speaker to session
                await prisma.sessionSpeaker.create({
                  data: {
                    sessionId: savedSession.id,
                    speakerId: savedSpeaker.id,
                  },
                }).catch(() => {
                  // Ignore duplicate link errors
                });
              } catch (err) {
                console.error(`Error with speaker ${speaker.name}:`, err.message);
              }
            }
          }
        }
        
        savedSessions++;
        
        // Progress indicator
        if (savedSessions % 10 === 0) {
          console.log(`  Processed ${savedSessions} sessions...`);
        }
        
      } catch (error) {
        console.error(`Error saving session "${session.title}":`, error.message);
        errors++;
      }
    }
    
    // Get final stats
    const totalSessions = await prisma.session.count();
    const totalSpeakers = await prisma.speaker.count();
    const totalLinks = await prisma.sessionSpeaker.count();
    
    // Get sessions by day
    const day1 = await prisma.session.count({
      where: { 
        startTime: { 
          gte: new Date('2025-10-14T00:00:00'),
          lt: new Date('2025-10-15T00:00:00')
        }
      }
    });
    
    const day2 = await prisma.session.count({
      where: { 
        startTime: { 
          gte: new Date('2025-10-15T00:00:00'),
          lt: new Date('2025-10-16T00:00:00')
        }
      }
    });
    
    const day3 = await prisma.session.count({
      where: { 
        startTime: { 
          gte: new Date('2025-10-16T00:00:00'),
          lt: new Date('2025-10-17T00:00:00')
        }
      }
    });
    
    console.log('\n=== IMPORT COMPLETE ===');
    console.log(`Sessions imported: ${savedSessions} (${errors} errors)`);
    console.log(`New speakers added: ${savedSpeakers}`);
    console.log('\nDatabase totals:');
    console.log(`  - Total sessions: ${totalSessions}`);
    console.log(`    • Day 1 (Oct 14): ${day1} sessions`);
    console.log(`    • Day 2 (Oct 15): ${day2} sessions`);
    console.log(`    • Day 3 (Oct 16): ${day3} sessions`);
    console.log(`  - Total speakers: ${totalSpeakers}`);
    console.log(`  - Speaker-session links: ${totalLinks}`);
    
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

importFetchedAgenda();