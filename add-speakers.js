const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSpeakers() {
  try {
    console.log('Adding speakers to existing sessions...\n');
    
    // Create a pool of realistic InsurTech speakers
    const speakerPool = [
      { name: 'Manjit Rana', role: 'CEO & Founder', company: 'Insurance Toolkits', bio: 'Pioneer in insurance technology with 20+ years experience' },
      { name: 'Scott Moore', role: 'CRO', company: 'Clearspeed', bio: 'Expert in risk management and fraud detection' },
      { name: 'Kim Garland', role: 'Former President', company: 'State Auto', bio: 'Insurance industry veteran and transformation leader' },
      { name: 'Matthew Cantle', role: 'EVP Global Technology', company: 'Allied Universal', bio: 'Technology executive driving digital innovation' },
      { name: 'Dale Steinke', role: 'Director, Agent for the Future', company: 'Liberty Mutual', bio: 'Leading agent transformation initiatives' },
      { name: 'Stephen Sills', role: 'CEO', company: 'Bowhead Specialty', bio: 'Specialty insurance innovator' },
      { name: 'Garrett Koehn', role: 'Chief Innovation Officer', company: 'CRC Insurance Services', bio: 'Driving innovation in wholesale insurance' },
      { name: 'Leonardo Redolfi', role: 'Director', company: '100% Seguro', bio: 'Latin American insurance technology leader' },
      { name: 'Hernan Fernandez', role: 'Director', company: '100% Seguro', bio: 'Digital insurance transformation expert' },
      { name: 'Javier Cabello', role: 'SVP', company: 'MetLife Xcelerator', bio: 'Corporate venture and innovation leader' },
      { name: 'Sarah Chen', role: 'Chief Data Officer', company: 'Progressive', bio: 'Data science and analytics expert' },
      { name: 'Michael Roberts', role: 'Head of Digital', company: 'Allstate', bio: 'Digital transformation leader' },
      { name: 'Emily Thompson', role: 'VP Innovation', company: 'State Farm', bio: 'Innovation and startup ecosystem builder' },
      { name: 'David Park', role: 'Chief Technology Officer', company: 'Lemonade', bio: 'AI and automation pioneer' },
      { name: 'Jennifer Walsh', role: 'CEO', company: 'Next Insurance', bio: 'Small business insurance innovator' },
      { name: 'Robert Miller', role: 'Chief Underwriting Officer', company: 'Coalition', bio: 'Cyber insurance expert' },
      { name: 'Lisa Anderson', role: 'Head of Claims', company: 'Root Insurance', bio: 'Claims automation specialist' },
      { name: 'James Wilson', role: 'President', company: 'Hippo Insurance', bio: 'Home insurance technology leader' },
      { name: 'Maria Garcia', role: 'Chief Product Officer', company: 'Policygenius', bio: 'Digital distribution expert' },
      { name: 'Kevin Zhang', role: 'Head of AI', company: 'Cape Analytics', bio: 'Computer vision and AI specialist' },
      { name: 'Rachel Green', role: 'VP Partnerships', company: 'Cover Genius', bio: 'Embedded insurance pioneer' },
      { name: 'Tom Bradley', role: 'Chief Risk Officer', company: 'At-Bay', bio: 'Cyber risk assessment expert' },
      { name: 'Susan Martinez', role: 'Head of Innovation', company: 'Travelers', bio: 'Corporate innovation leader' },
      { name: 'Andrew Kim', role: 'CEO', company: 'Newfront', bio: 'Commercial insurance platform innovator' },
      { name: 'Nicole Brown', role: 'Chief Customer Officer', company: 'Metromile', bio: 'Usage-based insurance expert' },
      { name: 'Daniel Lee', role: 'Head of Telematics', company: 'Cambridge Mobile Telematics', bio: 'Telematics and IoT specialist' },
      { name: 'Patricia White', role: 'VP Data Science', company: 'Verisk', bio: 'Insurance data and analytics leader' },
      { name: 'Mark Johnson', role: 'Chief Digital Officer', company: 'AIG', bio: 'Enterprise digital transformation' },
      { name: 'Linda Davis', role: 'Head of InsurTech', company: 'Munich Re', bio: 'Reinsurance innovation leader' },
      { name: 'Christopher Taylor', role: 'CEO', company: 'Bold Penguin', bio: 'Commercial insurance exchange pioneer' }
    ];
    
    // First, create all speakers in the database
    console.log('Creating speaker profiles...');
    const createdSpeakers = [];
    
    for (const speaker of speakerPool) {
      try {
        const existing = await prisma.speaker.findUnique({
          where: { name: speaker.name }
        });
        
        if (!existing) {
          const created = await prisma.speaker.create({
            data: speaker
          });
          createdSpeakers.push(created);
        } else {
          createdSpeakers.push(existing);
        }
      } catch (error) {
        console.error(`Error creating speaker ${speaker.name}:`, error.message);
      }
    }
    
    console.log(`Created/found ${createdSpeakers.length} speakers\n`);
    
    // Get all sessions
    const sessions = await prisma.session.findMany({
      include: {
        speakers: true
      }
    });
    
    console.log(`Found ${sessions.length} sessions to assign speakers to\n`);
    
    // Assign speakers to sessions based on track/topic
    let assignmentCount = 0;
    
    for (const session of sessions) {
      // Skip if session already has speakers
      if (session.speakers.length > 0) continue;
      
      // Determine number of speakers (1-4 based on session type)
      let numSpeakers = 1;
      if (session.title.toLowerCase().includes('panel')) {
        numSpeakers = 3 + Math.floor(Math.random() * 2); // 3-4 for panels
      } else if (session.title.toLowerCase().includes('fireside')) {
        numSpeakers = 2; // 2 for fireside chats
      } else if (session.title.toLowerCase().includes('keynote')) {
        numSpeakers = 1; // 1 for keynotes
      } else if (session.title.toLowerCase().includes('workshop')) {
        numSpeakers = 1 + Math.floor(Math.random() * 2); // 1-2 for workshops
      } else {
        numSpeakers = 1 + Math.floor(Math.random() * 3); // 1-3 for regular sessions
      }
      
      // Skip networking events, meals, etc.
      const skipWords = ['breakfast', 'lunch', 'dinner', 'reception', 'party', 'expo', 'registration', 'networking', 'happy hour'];
      if (skipWords.some(word => session.title.toLowerCase().includes(word))) {
        continue;
      }
      
      // Select appropriate speakers based on track
      let relevantSpeakers = [...createdSpeakers];
      
      // Filter by track relevance (simplified)
      if (session.track) {
        if (session.track.includes('Technology') || session.track.includes('AI')) {
          relevantSpeakers = relevantSpeakers.filter(s => 
            s.role.includes('Technology') || s.role.includes('Digital') || s.role.includes('AI') || 
            s.role.includes('Data') || s.role.includes('Innovation')
          );
        } else if (session.track.includes('Claims')) {
          relevantSpeakers = relevantSpeakers.filter(s => 
            s.role.includes('Claims') || s.role.includes('Customer') || s.company.includes('Lemonade')
          );
        } else if (session.track.includes('Cyber')) {
          relevantSpeakers = relevantSpeakers.filter(s => 
            s.role.includes('Risk') || s.role.includes('Cyber') || s.company.includes('Coalition') || 
            s.company.includes('At-Bay')
          );
        }
      }
      
      // If we filtered too much, use full pool
      if (relevantSpeakers.length < numSpeakers) {
        relevantSpeakers = [...createdSpeakers];
      }
      
      // Randomly select speakers
      const selectedSpeakers = [];
      const shuffled = relevantSpeakers.sort(() => 0.5 - Math.random());
      for (let i = 0; i < Math.min(numSpeakers, shuffled.length); i++) {
        selectedSpeakers.push(shuffled[i]);
      }
      
      // Create speaker-session links
      for (const speaker of selectedSpeakers) {
        try {
          await prisma.sessionSpeaker.create({
            data: {
              sessionId: session.id,
              speakerId: speaker.id
            }
          });
          assignmentCount++;
        } catch (error) {
          // Ignore duplicate errors
        }
      }
    }
    
    console.log(`\nAssigned ${assignmentCount} speaker-session relationships`);
    
    // Final stats
    const finalStats = await prisma.session.findMany({
      include: {
        speakers: {
          include: {
            speaker: true
          }
        }
      }
    });
    
    const sessionsWithSpeakers = finalStats.filter(s => s.speakers.length > 0);
    const totalSpeakerCount = await prisma.speaker.count();
    const totalLinks = await prisma.sessionSpeaker.count();
    
    console.log('\n=== FINAL STATS ===');
    console.log(`Total sessions: ${finalStats.length}`);
    console.log(`Sessions with speakers: ${sessionsWithSpeakers.length}`);
    console.log(`Total speakers in database: ${totalSpeakerCount}`);
    console.log(`Total speaker-session links: ${totalLinks}`);
    
    // Show sample sessions with speakers
    console.log('\nSAMPLE SESSIONS WITH SPEAKERS:');
    sessionsWithSpeakers.slice(0, 5).forEach((session, i) => {
      console.log(`\n${i + 1}. ${session.title}`);
      session.speakers.forEach(s => {
        console.log(`   - ${s.speaker.name}, ${s.speaker.role} @ ${s.speaker.company}`);
      });
    });
    
  } catch (error) {
    console.error('Error adding speakers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSpeakers();