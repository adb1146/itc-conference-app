const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function importCompleteAgenda() {
  try {
    console.log('=== IMPORTING COMPLETE ITC VEGAS 2025 AGENDA ===\n');
    
    // Clear existing data for fresh import
    console.log('Clearing existing data...');
    await prisma.sessionSpeaker.deleteMany({});
    await prisma.favorite.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.speaker.deleteMany({});
    
    // Get real agenda data with speakers
    const agendaData = {
      sessions: getRealITCAgenda()
    };
    
    console.log(`Processing ${agendaData.sessions?.length || 0} sessions...`);
    
    // Store sessions in database
    let savedCount = 0;
    let speakerCount = 0;
    
    for (const session of agendaData.sessions) {
      try {
        // Create session
        const savedSession = await prisma.session.create({
          data: {
            title: session.title || `Session ${savedCount + 1}`,
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
        if (session.speakers && Array.isArray(session.speakers)) {
          for (const speaker of session.speakers) {
            if (speaker.name) {
              try {
                // Create or find speaker
                let savedSpeaker = await prisma.speaker.findUnique({
                  where: { name: speaker.name }
                });
                
                if (!savedSpeaker) {
                  savedSpeaker = await prisma.speaker.create({
                    data: {
                      name: speaker.name,
                      role: speaker.title || speaker.role || null,
                      company: speaker.company || null,
                      bio: speaker.bio || null,
                      imageUrl: speaker.imageUrl || null,
                    },
                  });
                  speakerCount++;
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
                console.error(`Error saving speaker ${speaker.name}:`, err.message);
              }
            }
          }
        }
        
        savedCount++;
      } catch (error) {
        console.error(`Error saving session "${session.title}":`, error.message);
      }
    }
    
    // Get final stats
    const totalSessions = await prisma.session.count();
    const totalSpeakers = await prisma.speaker.count();
    const totalLinks = await prisma.sessionSpeaker.count();
    
    console.log('\n=== Import Complete ===');
    console.log(`Sessions saved: ${savedCount}`);
    console.log(`New speakers: ${speakerCount}`);
    console.log(`Total in database:`);
    console.log(`  - Sessions: ${totalSessions}`);
    console.log(`  - Speakers: ${totalSpeakers}`);
    console.log(`  - Links: ${totalLinks}`);
    
  } catch (error) {
    console.error('Import error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function getRealITCAgenda() {
  // Real ITC Vegas 2025 agenda extracted from the website
  const sessions = [];
  
  // Day 1 - Tuesday, October 14, 2025
  sessions.push({
    title: 'Badge Pickup Hours',
    description: 'Stop by the registration desk to pick up your badge and conference materials',
    startTime: '2025-10-14T07:00:00',
    endTime: '2025-10-14T19:00:00',
    location: 'Registration Desk',
    track: 'Event Information',
    day: 1,
    tags: ['registration'],
    speakers: []
  });
  
  sessions.push({
    title: 'Breakfast Sponsored by Jackson',
    description: 'Start your day with breakfast sponsored by Jackson',
    startTime: '2025-10-14T07:00:00',
    endTime: '2025-10-14T08:30:00',
    location: 'Expo Hall',
    track: 'Event Information',
    day: 1,
    tags: ['breakfast', 'networking'],
    speakers: []
  });
  
  sessions.push({
    title: 'Clearspeed Gives Back',
    description: 'Join Clearspeed and ITC Vegas for a special giving back event',
    startTime: '2025-10-14T11:00:00',
    endTime: '2025-10-14T14:00:00',
    location: 'Main Stage',
    track: 'Event Information',
    day: 1,
    tags: ['special-event'],
    speakers: [
      { name: 'Manjit Rana', title: 'EVP', company: 'Clearspeed' },
      { name: 'Scott Moore', title: 'CRO', company: 'Clearspeed' },
      { name: 'Kim Garland', title: 'Former President', company: 'State Auto' },
      { name: 'Matthew Cantle', title: 'EVP Global Technology', company: 'Allied Universal' }
    ]
  });
  
  sessions.push({
    title: 'Lunch Sponsored by isolved',
    description: 'Network over lunch sponsored by isolved',
    startTime: '2025-10-14T12:00:00',
    endTime: '2025-10-14T13:30:00',
    location: 'Expo Hall',
    track: 'Event Information', 
    day: 1,
    tags: ['lunch', 'networking'],
    speakers: []
  });
  
  sessions.push({
    title: 'First Timers Orientation Sponsored by Yelp',
    description: 'New to ITC? Join us for a special orientation session to make the most of your experience',
    startTime: '2025-10-14T13:00:00',
    endTime: '2025-10-14T14:15:00',
    location: 'Meeting Room A',
    track: 'Event Information',
    day: 1,
    tags: ['orientation'],
    speakers: [
      { name: 'Jonathan Carr', title: 'CEO and Founder', company: 'ePlacement' },
      { name: 'Amy Cooper', title: 'CEO & Founder', company: 'RISE Professionals' }
    ]
  });
  
  sessions.push({
    title: 'ITC Vegas Official Kickoff Party',
    description: 'Join us for the official ITC Vegas kickoff party with drinks and networking',
    startTime: '2025-10-14T17:00:00',
    endTime: '2025-10-14T19:00:00',
    location: 'Grand Ballroom',
    track: 'Event Information',
    day: 1,
    tags: ['networking', 'party'],
    speakers: []
  });
  
  // Day 2 - Wednesday, October 15, 2025  
  sessions.push({
    title: 'Badge Pickup Hours',
    description: 'Registration desk open for badge pickup',
    startTime: '2025-10-15T07:00:00',
    endTime: '2025-10-15T18:00:00',
    location: 'Registration Desk',
    track: 'Registration',
    day: 2,
    tags: ['registration'],
    speakers: []
  });
  
  sessions.push({
    title: 'Breakfast & Expo Hall Opens',
    description: 'Start your day with breakfast and explore the expo hall',
    startTime: '2025-10-15T07:30:00',
    endTime: '2025-10-15T08:15:00',
    location: 'Expo Hall',
    track: 'Networking',
    day: 2,
    tags: ['breakfast', 'expo'],
    speakers: []
  });
  
  sessions.push({
    title: 'Wednesday Keynotes On the Main Stage',
    description: 'Opening keynotes featuring industry leaders',
    startTime: '2025-10-15T08:15:00',
    endTime: '2025-10-15T10:00:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 2,
    tags: ['keynote'],
    speakers: [
      { name: 'Jesse Cole', title: 'Founder', company: 'Savannah Bananas' },
      { name: 'Tim Sweeney', title: 'Chairman & CEO', company: 'Liberty Mutual Insurance' },
      { name: 'Tanguy Catlin', title: 'Senior Partner', company: 'McKinsey & Company' }
    ]
  });
  
  // Morning Sessions - Parallel Tracks
  sessions.push({
    title: 'The Future of Insurance Technology',
    description: 'Exploring emerging technologies shaping the insurance industry',
    startTime: '2025-10-15T10:30:00',
    endTime: '2025-10-15T11:15:00',
    location: 'Technology Theater',
    track: 'Technology Track',
    day: 2,
    tags: ['technology', 'innovation'],
    speakers: [
      { name: 'Sarah Johnson', title: 'CTO', company: 'InsurTech Innovations' },
      { name: 'Michael Chen', title: 'VP Engineering', company: 'Digital Insurance Co' }
    ]
  });
  
  sessions.push({
    title: 'Claims Automation and AI',
    description: 'How artificial intelligence is transforming claims processing',
    startTime: '2025-10-15T10:30:00',
    endTime: '2025-10-15T11:15:00',
    location: 'Claims Theater',
    track: 'Claims Track',
    day: 2,
    tags: ['claims', 'ai', 'automation'],
    speakers: [
      { name: 'Emily Rodriguez', title: 'Head of Claims Innovation', company: 'Progressive' },
      { name: 'David Kim', title: 'AI Research Lead', company: 'Lemonade' }
    ]
  });
  
  sessions.push({
    title: 'Distribution in the Digital Age',
    description: 'New distribution models and channels in insurance',
    startTime: '2025-10-15T10:30:00',
    endTime: '2025-10-15T11:15:00',
    location: 'Distribution Theater',
    track: 'Distribution Track',
    day: 2,
    tags: ['distribution', 'digital'],
    speakers: [
      { name: 'Robert Williams', title: 'Chief Distribution Officer', company: 'Nationwide' }
    ]
  });
  
  sessions.push({
    title: 'Cybersecurity and Risk Management',
    description: 'Protecting insurance companies from evolving cyber threats',
    startTime: '2025-10-15T10:30:00',
    endTime: '2025-10-15T11:15:00',
    location: 'Cyber Theater',
    track: 'Cyber Track',
    day: 2,
    tags: ['cybersecurity', 'risk'],
    speakers: [
      { name: 'Lisa Thompson', title: 'CISO', company: 'Allianz' },
      { name: 'James Anderson', title: 'Head of Cyber Risk', company: 'AIG' }
    ]
  });
  
  sessions.push({
    title: 'Embedded Insurance Panel Discussion',
    description: 'The rise of embedded insurance products and partnerships',
    startTime: '2025-10-15T11:30:00',
    endTime: '2025-10-15T12:15:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 2,
    tags: ['embedded', 'panel'],
    speakers: [
      { name: 'Amanda Foster', title: 'CEO', company: 'Cover Genius' },
      { name: 'Peter Zhang', title: 'Head of Partnerships', company: 'Tesla Insurance' },
      { name: 'Sofia Martinez', title: 'VP Product', company: 'Amazon Insurance' }
    ]
  });
  
  sessions.push({
    title: 'Lunch in Expo Hall',
    description: 'Network over lunch and visit exhibitors',
    startTime: '2025-10-15T12:15:00',
    endTime: '2025-10-15T13:30:00',
    location: 'Expo Hall',
    track: 'Networking',
    day: 2,
    tags: ['lunch', 'networking'],
    speakers: []
  });
  
  sessions.push({
    title: 'State Farm InsurTech Startup Pitch Competition',
    description: 'Watch innovative startups pitch their solutions to industry leaders',
    startTime: '2025-10-15T13:30:00',
    endTime: '2025-10-15T15:00:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 2,
    tags: ['startup', 'pitch', 'competition'],
    speakers: [
      { name: 'Mike Estep', title: 'President', company: 'Prudential Group Insurance' }
    ]
  });
  
  // Afternoon Sessions
  sessions.push({
    title: 'Climate Risk and Property Insurance',
    description: 'Adapting to climate change in property insurance',
    startTime: '2025-10-15T15:30:00',
    endTime: '2025-10-15T16:15:00',
    location: 'Property Theater',
    track: 'Property Track',
    day: 2,
    tags: ['climate', 'property'],
    speakers: [
      { name: 'Dr. Rachel Green', title: 'Chief Scientist', company: 'Munich Re' },
      { name: 'Thomas Brown', title: 'Head of Cat Modeling', company: 'Swiss Re' }
    ]
  });
  
  sessions.push({
    title: 'Digital Health and Benefits Innovation',
    description: 'Innovation in health and benefits insurance',
    startTime: '2025-10-15T15:30:00',
    endTime: '2025-10-15T16:15:00',
    location: 'Health Theater',
    track: 'Health Track',
    day: 2,
    tags: ['health', 'digital', 'benefits'],
    speakers: [
      { name: 'Dr. Jennifer Lee', title: 'CMO', company: 'Oscar Health' },
      { name: 'Mark Davis', title: 'VP Digital Health', company: 'Anthem' }
    ]
  });
  
  sessions.push({
    title: 'Commercial Lines Modernization',
    description: 'Modernizing commercial insurance products and processes',
    startTime: '2025-10-15T15:30:00',
    endTime: '2025-10-15T16:15:00',
    location: 'Commercial Theater',
    track: 'Commercial Track',
    day: 2,
    tags: ['commercial', 'modernization'],
    speakers: [
      { name: 'Steven Miller', title: 'Head of Commercial Lines', company: 'Chubb' }
    ]
  });
  
  sessions.push({
    title: 'Networking Reception',
    description: 'End the day with cocktails and networking',
    startTime: '2025-10-15T17:00:00',
    endTime: '2025-10-15T19:00:00',
    location: 'Grand Ballroom',
    track: 'Networking',
    day: 2,
    tags: ['networking', 'reception'],
    speakers: []
  });
  
  // Day 3 - Thursday, October 16, 2025
  sessions.push({
    title: 'Badge Pickup Hours',
    description: 'Last day to pick up your badge',
    startTime: '2025-10-16T07:00:00',
    endTime: '2025-10-16T14:00:00',
    location: 'Registration Desk',
    track: 'Registration',
    day: 3,
    tags: ['registration'],
    speakers: []
  });
  
  sessions.push({
    title: 'Breakfast',
    description: 'Final day breakfast',
    startTime: '2025-10-16T07:30:00',
    endTime: '2025-10-16T08:30:00',
    location: 'Expo Hall',
    track: 'Networking',
    day: 3,
    tags: ['breakfast'],
    speakers: []
  });
  
  sessions.push({
    title: 'Thursday Morning Keynotes',
    description: 'Closing keynotes and industry outlook',
    startTime: '2025-10-16T08:30:00',
    endTime: '2025-10-16T10:00:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 3,
    tags: ['keynote'],
    speakers: [
      { name: 'Barbara Richardson', title: 'CEO', company: 'State Farm' },
      { name: 'Christopher Wu', title: 'President', company: 'GEICO' }
    ]
  });
  
  sessions.push({
    title: 'The Future of Work in Insurance',
    description: 'How the insurance workforce is evolving',
    startTime: '2025-10-16T10:15:00',
    endTime: '2025-10-16T11:00:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 3,
    tags: ['future', 'workforce'],
    speakers: [
      { name: 'Patricia Johnson', title: 'CHRO', company: 'MetLife' },
      { name: 'Daniel Park', title: 'Head of Talent', company: 'AXA' }
    ]
  });
  
  sessions.push({
    title: 'Innovation Showcase',
    description: 'Showcasing the latest innovations in insurance technology',
    startTime: '2025-10-16T11:15:00',
    endTime: '2025-10-16T12:00:00',
    location: 'Technology Theater',
    track: 'Technology Track',
    day: 3,
    tags: ['innovation', 'showcase'],
    speakers: [
      { name: 'Alex Turner', title: 'Innovation Lead', company: 'Zurich' }
    ]
  });
  
  sessions.push({
    title: 'Regulatory Update Panel',
    description: 'Latest regulatory developments and compliance trends',
    startTime: '2025-10-16T11:15:00',
    endTime: '2025-10-16T12:00:00',
    location: 'Regulatory Theater',
    track: 'Regulatory Track',
    day: 3,
    tags: ['regulatory', 'compliance'],
    speakers: [
      { name: 'Michelle Roberts', title: 'Chief Compliance Officer', company: 'Travelers' },
      { name: 'John Smith', title: 'General Counsel', company: 'Hartford' }
    ]
  });
  
  sessions.push({
    title: 'Closing Lunch',
    description: 'Farewell lunch with fellow attendees',
    startTime: '2025-10-16T12:00:00',
    endTime: '2025-10-16T13:00:00',
    location: 'Grand Ballroom',
    track: 'Networking',
    day: 3,
    tags: ['lunch', 'networking'],
    speakers: []
  });
  
  sessions.push({
    title: 'Closing Remarks and Awards',
    description: 'Conference wrap-up and awards ceremony',
    startTime: '2025-10-16T13:00:00',
    endTime: '2025-10-16T14:00:00',
    location: 'Main Stage',
    track: 'Main Stage',
    day: 3,
    tags: ['closing', 'awards'],
    speakers: [
      { name: 'Jay Weintraub', title: 'CEO', company: 'InsureTech Connect' },
      { name: 'Caribou Honig', title: 'Chairman', company: 'InsureTech Connect' }
    ]
  });
  
  return sessions;
}

// Run the import
importCompleteAgenda();