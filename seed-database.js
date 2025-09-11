const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedDatabase() {
  console.log('Seeding database with ITC Vegas 2025 sessions...');
  
  try {
    // Sample sessions based on the ITC Vegas conference
    const sessions = [
      {
        title: 'Opening Keynote: The Future of InsurTech',
        description: 'Join us for an inspiring opening keynote that explores the transformative power of technology in insurance. Industry leaders will share their vision for the future of InsurTech and discuss emerging trends shaping the industry.',
        startTime: new Date('2025-10-15T09:00:00'),
        endTime: new Date('2025-10-15T10:00:00'),
        location: 'Main Stage',
        track: 'Keynote',
        tags: ['keynote', 'insurtech', 'innovation'],
      },
      {
        title: 'AI-Powered Underwriting Revolution',
        description: 'Discover how artificial intelligence is transforming underwriting processes, enabling faster decisions, improved risk assessment, and enhanced customer experiences.',
        startTime: new Date('2025-10-15T10:30:00'),
        endTime: new Date('2025-10-15T11:30:00'),
        location: 'Technology Stage',
        track: 'AI & Technology',
        tags: ['AI', 'underwriting', 'automation'],
      },
      {
        title: 'Embedded Insurance: The Next Frontier',
        description: 'Explore how embedded insurance is creating new distribution channels and seamless customer experiences through partnerships and API integrations.',
        startTime: new Date('2025-10-15T11:45:00'),
        endTime: new Date('2025-10-15T12:45:00'),
        location: 'Innovation Hub',
        track: 'Distribution',
        tags: ['embedded', 'API', 'partnerships'],
      },
      {
        title: 'Climate Risk and Property Insurance',
        description: 'As climate change accelerates, property insurers face unprecedented challenges. Learn how the industry is adapting to increased catastrophe risks and evolving regulatory requirements.',
        startTime: new Date('2025-10-15T14:00:00'),
        endTime: new Date('2025-10-15T15:00:00'),
        location: 'Property & Casualty Stage',
        track: 'Property & Casualty',
        tags: ['climate', 'property', 'catastrophe'],
      },
      {
        title: 'Digital Claims: From FNOL to Settlement',
        description: 'See how digital transformation is revolutionizing the claims process, from first notice of loss to final settlement, improving speed and customer satisfaction.',
        startTime: new Date('2025-10-15T15:30:00'),
        endTime: new Date('2025-10-15T16:30:00'),
        location: 'Claims Innovation Center',
        track: 'Claims',
        tags: ['claims', 'digital', 'customer experience'],
      },
      {
        title: 'Cyber Insurance in the Age of AI',
        description: 'With AI-powered cyber threats on the rise, insurers must evolve their coverage and risk assessment strategies. Join experts discussing the future of cyber insurance.',
        startTime: new Date('2025-10-16T09:00:00'),
        endTime: new Date('2025-10-16T10:00:00'),
        location: 'Cyber Risk Stage',
        track: 'Cyber',
        tags: ['cyber', 'AI', 'risk'],
      },
      {
        title: 'Building Trust Through Transparency',
        description: 'Learn how insurance companies are using transparency and clear communication to build trust with customers in an increasingly digital world.',
        startTime: new Date('2025-10-16T10:30:00'),
        endTime: new Date('2025-10-16T11:30:00'),
        location: 'Customer Experience Stage',
        track: 'Customer Experience',
        tags: ['trust', 'transparency', 'customer'],
      },
      {
        title: 'The Rise of Parametric Insurance',
        description: 'Parametric insurance is transforming how we think about coverage and claims. Discover real-world applications and the technology enabling instant payouts.',
        startTime: new Date('2025-10-16T14:00:00'),
        endTime: new Date('2025-10-16T15:00:00'),
        location: 'Innovation Stage',
        track: 'Innovation',
        tags: ['parametric', 'innovation', 'technology'],
      },
      {
        title: 'Closing Celebration & Networking',
        description: 'Join us for the closing celebration of ITC Vegas 2025. Network with peers, celebrate innovations, and toast to the future of insurance technology.',
        startTime: new Date('2025-10-16T18:00:00'),
        endTime: new Date('2025-10-16T21:00:00'),
        location: 'Main Venue',
        track: 'Networking',
        tags: ['networking', 'closing', 'celebration'],
      }
    ];

    // Sample speakers
    const speakers = [
      {
        name: 'Sarah Johnson',
        role: 'CEO',
        company: 'TechInsure Solutions',
        bio: 'Sarah is a visionary leader with 20 years of experience in insurance technology.',
      },
      {
        name: 'Michael Chen',
        role: 'Chief Data Officer',
        company: 'DataDriven Insurance',
        bio: 'Michael specializes in leveraging big data and AI for insurance innovation.',
      },
      {
        name: 'Emily Rodriguez',
        role: 'VP of Innovation',
        company: 'FutureRisk Partners',
        bio: 'Emily leads digital transformation initiatives for leading insurance carriers.',
      },
      {
        name: 'David Park',
        role: 'Head of Cyber Risk',
        company: 'CyberSecure Insurance',
        bio: 'David is an expert in cyber risk assessment and insurance coverage.',
      }
    ];

    // Create speakers first
    console.log('Creating speakers...');
    const createdSpeakers = [];
    for (const speaker of speakers) {
      const created = await prisma.speaker.upsert({
        where: { name: speaker.name },
        update: speaker,
        create: speaker,
      });
      createdSpeakers.push(created);
    }
    console.log(`Created ${createdSpeakers.length} speakers`);

    // Create sessions
    console.log('Creating sessions...');
    let sessionCount = 0;
    for (const session of sessions) {
      const created = await prisma.session.upsert({
        where: { title: session.title },
        update: {
          ...session,
          lastUpdated: new Date(),
        },
        create: {
          ...session,
          sourceUrl: 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda',
        },
      });
      
      // Assign 1-2 random speakers to each session
      const numSpeakers = Math.floor(Math.random() * 2) + 1;
      const shuffled = [...createdSpeakers].sort(() => 0.5 - Math.random());
      const sessionSpeakers = shuffled.slice(0, numSpeakers);
      
      for (const speaker of sessionSpeakers) {
        await prisma.sessionSpeaker.upsert({
          where: {
            sessionId_speakerId: {
              sessionId: created.id,
              speakerId: speaker.id,
            },
          },
          update: {},
          create: {
            sessionId: created.id,
            speakerId: speaker.id,
          },
        });
      }
      
      sessionCount++;
    }
    console.log(`Created ${sessionCount} sessions`);

    // Get final counts
    const totalSessions = await prisma.session.count();
    const totalSpeakers = await prisma.speaker.count();
    const totalLinks = await prisma.sessionSpeaker.count();

    console.log('\nDatabase seeded successfully!');
    console.log(`Total sessions: ${totalSessions}`);
    console.log(`Total speakers: ${totalSpeakers}`);
    console.log(`Total session-speaker links: ${totalLinks}`);

  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedDatabase();