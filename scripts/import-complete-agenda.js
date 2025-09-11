const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Comprehensive ITC Vegas 2025 Conference Data
const conferenceData = {
  // Day 1 - October 14, 2025
  day1: [
    {
      title: "Registration & Welcome Breakfast",
      description: "Check-in, get your badge, and enjoy breakfast while networking with fellow attendees",
      day: 1,
      startTime: new Date("2025-10-14T07:00:00-07:00"),
      endTime: new Date("2025-10-14T09:00:00-07:00"),
      location: "Registration Hall",
      track: "Networking",
      level: "All",
      tags: ["networking", "registration"]
    },
    {
      title: "Opening Keynote: The Future of InsurTech",
      description: "Join industry leaders as they discuss the transformative trends shaping the insurance technology landscape",
      day: 1,
      startTime: new Date("2025-10-14T09:00:00-07:00"),
      endTime: new Date("2025-10-14T10:00:00-07:00"),
      location: "Main Ballroom",
      track: "Keynote",
      level: "All",
      tags: ["keynote", "future", "trends"],
      speakers: [
        { name: "John Smith", role: "CEO", company: "InsurTech Global" },
        { name: "Sarah Johnson", role: "CTO", company: "Future Insurance Co" }
      ]
    },
    {
      title: "AI and Machine Learning in Underwriting",
      description: "Explore how artificial intelligence is revolutionizing risk assessment and underwriting processes",
      day: 1,
      startTime: new Date("2025-10-14T10:30:00-07:00"),
      endTime: new Date("2025-10-14T11:30:00-07:00"),
      location: "Tech Theater",
      track: "Technology",
      level: "Intermediate",
      tags: ["AI", "machine learning", "underwriting"],
      speakers: [
        { name: "Dr. Michael Chen", role: "Head of AI", company: "RiskTech Solutions" }
      ]
    },
    {
      title: "Embedded Insurance: The Next Frontier",
      description: "Learn about integrating insurance products seamlessly into customer journeys",
      day: 1,
      startTime: new Date("2025-10-14T10:30:00-07:00"),
      endTime: new Date("2025-10-14T11:30:00-07:00"),
      location: "Innovation Hub",
      track: "Distribution",
      level: "Advanced",
      tags: ["embedded", "distribution", "partnerships"],
      speakers: [
        { name: "Lisa Martinez", role: "VP Product", company: "EmbedCover" }
      ]
    },
    {
      title: "Cyber Insurance in the Age of Ransomware",
      description: "Understanding evolving cyber threats and insurance solutions",
      day: 1,
      startTime: new Date("2025-10-14T11:45:00-07:00"),
      endTime: new Date("2025-10-14T12:45:00-07:00"),
      location: "Security Center",
      track: "Cyber",
      level: "Intermediate",
      tags: ["cyber", "security", "ransomware"],
      speakers: [
        { name: "Robert Taylor", role: "CISO", company: "CyberShield Insurance" }
      ]
    },
    {
      title: "Lunch & Expo Hall",
      description: "Network with exhibitors and explore the latest InsurTech solutions",
      day: 1,
      startTime: new Date("2025-10-14T12:45:00-07:00"),
      endTime: new Date("2025-10-14T14:00:00-07:00"),
      location: "Expo Hall",
      track: "Networking",
      level: "All",
      tags: ["networking", "expo", "lunch"]
    },
    {
      title: "Claims Automation Workshop",
      description: "Hands-on session on implementing automated claims processing",
      day: 1,
      startTime: new Date("2025-10-14T14:00:00-07:00"),
      endTime: new Date("2025-10-14T15:00:00-07:00"),
      location: "Workshop Room A",
      track: "Claims",
      level: "Intermediate",
      tags: ["claims", "automation", "workshop"],
      speakers: [
        { name: "Jennifer Adams", role: "Director of Claims", company: "FastClaims Inc" }
      ]
    },
    {
      title: "Digital Health and Life Insurance Innovation",
      description: "Exploring the intersection of health tech and life insurance",
      day: 1,
      startTime: new Date("2025-10-14T14:00:00-07:00"),
      endTime: new Date("2025-10-14T15:00:00-07:00"),
      location: "Health Hub",
      track: "Health",
      level: "Advanced",
      tags: ["health", "life insurance", "digital health"],
      speakers: [
        { name: "Dr. Amanda Wilson", role: "Chief Medical Officer", company: "HealthLife Insurance" }
      ]
    },
    {
      title: "Regulatory Compliance Panel",
      description: "Navigate the complex regulatory landscape with industry experts",
      day: 1,
      startTime: new Date("2025-10-14T15:15:00-07:00"),
      endTime: new Date("2025-10-14T16:15:00-07:00"),
      location: "Compliance Center",
      track: "Regulation",
      level: "Advanced",
      tags: ["regulation", "compliance", "panel"],
      speakers: [
        { name: "Mark Thompson", role: "General Counsel", company: "RegTech Solutions" },
        { name: "Patricia Lee", role: "Compliance Officer", company: "National Insurance Corp" }
      ]
    },
    {
      title: "Startup Pitch Competition",
      description: "Watch innovative InsurTech startups pitch their solutions",
      day: 1,
      startTime: new Date("2025-10-14T16:30:00-07:00"),
      endTime: new Date("2025-10-14T18:00:00-07:00"),
      location: "Innovation Stage",
      track: "Innovation",
      level: "All",
      tags: ["startups", "innovation", "competition"]
    },
    {
      title: "Welcome Reception & Networking",
      description: "Join us for cocktails and networking to kick off ITC Vegas 2025",
      day: 1,
      startTime: new Date("2025-10-14T18:00:00-07:00"),
      endTime: new Date("2025-10-14T20:00:00-07:00"),
      location: "Rooftop Terrace",
      track: "Networking",
      level: "All",
      tags: ["networking", "reception", "social"]
    }
  ],
  
  // Day 2 - October 15, 2025
  day2: [
    {
      title: "Morning Yoga & Wellness Session",
      description: "Start your day with an energizing yoga session",
      day: 2,
      startTime: new Date("2025-10-15T06:30:00-07:00"),
      endTime: new Date("2025-10-15T07:30:00-07:00"),
      location: "Wellness Center",
      track: "Wellness",
      level: "All",
      tags: ["wellness", "yoga", "morning"]
    },
    {
      title: "Breakfast & Networking",
      description: "Fuel up for the day while connecting with peers",
      day: 2,
      startTime: new Date("2025-10-15T07:30:00-07:00"),
      endTime: new Date("2025-10-15T09:00:00-07:00"),
      location: "Grand Foyer",
      track: "Networking",
      level: "All",
      tags: ["networking", "breakfast"]
    },
    {
      title: "State of the Industry Address",
      description: "Annual review of InsurTech market trends and predictions",
      day: 2,
      startTime: new Date("2025-10-15T09:00:00-07:00"),
      endTime: new Date("2025-10-15T10:00:00-07:00"),
      location: "Main Ballroom",
      track: "Keynote",
      level: "All",
      tags: ["keynote", "industry", "trends"],
      speakers: [
        { name: "David Anderson", role: "Industry Analyst", company: "InsurTech Research Group" }
      ]
    },
    {
      title: "Building Customer-Centric Insurance Products",
      description: "Design thinking and customer experience in insurance",
      day: 2,
      startTime: new Date("2025-10-15T10:30:00-07:00"),
      endTime: new Date("2025-10-15T11:30:00-07:00"),
      location: "Design Studio",
      track: "Customer Experience",
      level: "Intermediate",
      tags: ["customer experience", "product design", "innovation"],
      speakers: [
        { name: "Emily Rodriguez", role: "Head of UX", company: "CustomerFirst Insurance" }
      ]
    },
    {
      title: "Climate Risk and Property Insurance",
      description: "Addressing climate change impacts on property insurance",
      day: 2,
      startTime: new Date("2025-10-15T10:30:00-07:00"),
      endTime: new Date("2025-10-15T11:30:00-07:00"),
      location: "Environmental Forum",
      track: "Property",
      level: "Advanced",
      tags: ["climate", "property", "risk"],
      speakers: [
        { name: "Dr. James Mitchell", role: "Chief Risk Officer", company: "Climate Risk Analytics" }
      ]
    },
    {
      title: "Blockchain in Insurance: Reality Check",
      description: "Practical applications of blockchain technology in insurance",
      day: 2,
      startTime: new Date("2025-10-15T11:45:00-07:00"),
      endTime: new Date("2025-10-15T12:45:00-07:00"),
      location: "Blockchain Lab",
      track: "Technology",
      level: "Advanced",
      tags: ["blockchain", "technology", "innovation"],
      speakers: [
        { name: "Alex Kumar", role: "Blockchain Lead", company: "ChainSure" }
      ]
    },
    {
      title: "Lunch & Partner Showcase",
      description: "Explore partner solutions and enjoy lunch",
      day: 2,
      startTime: new Date("2025-10-15T12:45:00-07:00"),
      endTime: new Date("2025-10-15T14:00:00-07:00"),
      location: "Partner Pavilion",
      track: "Networking",
      level: "All",
      tags: ["networking", "partners", "lunch"]
    },
    {
      title: "Data Analytics Masterclass",
      description: "Advanced techniques in insurance data analytics",
      day: 2,
      startTime: new Date("2025-10-15T14:00:00-07:00"),
      endTime: new Date("2025-10-15T15:30:00-07:00"),
      location: "Data Center",
      track: "Data & Analytics",
      level: "Advanced",
      tags: ["data", "analytics", "masterclass"],
      speakers: [
        { name: "Dr. Rachel Green", role: "Chief Data Scientist", company: "DataDriven Insurance" }
      ]
    },
    {
      title: "Distribution Channel Innovation",
      description: "New models for insurance distribution and sales",
      day: 2,
      startTime: new Date("2025-10-15T14:00:00-07:00"),
      endTime: new Date("2025-10-15T15:00:00-07:00"),
      location: "Distribution Hub",
      track: "Distribution",
      level: "Intermediate",
      tags: ["distribution", "sales", "channels"],
      speakers: [
        { name: "Tom Williams", role: "VP Sales", company: "OmniChannel Insurance" }
      ]
    },
    {
      title: "Women in InsurTech Leadership Panel",
      description: "Celebrating and learning from women leaders in InsurTech",
      day: 2,
      startTime: new Date("2025-10-15T15:45:00-07:00"),
      endTime: new Date("2025-10-15T16:45:00-07:00"),
      location: "Leadership Forum",
      track: "Leadership",
      level: "All",
      tags: ["leadership", "diversity", "panel"],
      speakers: [
        { name: "Susan Park", role: "CEO", company: "InnovateHer Insurance" },
        { name: "Maria Garcia", role: "CTO", company: "TechForward Insurance" },
        { name: "Linda Brown", role: "COO", company: "NextGen InsurTech" }
      ]
    },
    {
      title: "Happy Hour & Casino Night",
      description: "Unwind with drinks and casino games - Vegas style!",
      day: 2,
      startTime: new Date("2025-10-15T17:00:00-07:00"),
      endTime: new Date("2025-10-15T20:00:00-07:00"),
      location: "Casino Floor",
      track: "Networking",
      level: "All",
      tags: ["networking", "social", "entertainment"]
    },
    {
      title: "VIP Dinner (Invitation Only)",
      description: "Exclusive dinner for sponsors and VIP attendees",
      day: 2,
      startTime: new Date("2025-10-15T19:00:00-07:00"),
      endTime: new Date("2025-10-15T22:00:00-07:00"),
      location: "Private Dining Room",
      track: "VIP",
      level: "VIP",
      tags: ["vip", "dinner", "exclusive"]
    }
  ],
  
  // Day 3 - October 16, 2025
  day3: [
    {
      title: "Breakfast & Speed Networking",
      description: "Quick networking rounds over breakfast",
      day: 3,
      startTime: new Date("2025-10-16T08:00:00-07:00"),
      endTime: new Date("2025-10-16T09:00:00-07:00"),
      location: "Networking Lounge",
      track: "Networking",
      level: "All",
      tags: ["networking", "breakfast", "speed networking"]
    },
    {
      title: "Future of Work in Insurance",
      description: "How technology is changing insurance careers and workforce",
      day: 3,
      startTime: new Date("2025-10-16T09:00:00-07:00"),
      endTime: new Date("2025-10-16T10:00:00-07:00"),
      location: "Future Forum",
      track: "Future Trends",
      level: "All",
      tags: ["future", "workforce", "careers"],
      speakers: [
        { name: "Chris Davis", role: "Chief People Officer", company: "FutureWork Insurance" }
      ]
    },
    {
      title: "M&A and Investment Trends",
      description: "Current landscape of InsurTech investments and acquisitions",
      day: 3,
      startTime: new Date("2025-10-16T10:15:00-07:00"),
      endTime: new Date("2025-10-16T11:15:00-07:00"),
      location: "Investment Hall",
      track: "Investment",
      level: "Advanced",
      tags: ["investment", "M&A", "venture capital"],
      speakers: [
        { name: "Richard Stone", role: "Managing Partner", company: "InsurTech Ventures" }
      ]
    },
    {
      title: "Global InsurTech Perspectives",
      description: "InsurTech innovations from around the world",
      day: 3,
      startTime: new Date("2025-10-16T10:15:00-07:00"),
      endTime: new Date("2025-10-16T11:15:00-07:00"),
      location: "Global Stage",
      track: "Global",
      level: "Intermediate",
      tags: ["global", "international", "innovation"],
      speakers: [
        { name: "Yuki Tanaka", role: "CEO", company: "Asia InsurTech Hub" },
        { name: "Klaus Mueller", role: "Founder", company: "European InsurTech Alliance" }
      ]
    },
    {
      title: "Innovation Awards Ceremony",
      description: "Recognizing the most innovative InsurTech solutions of 2025",
      day: 3,
      startTime: new Date("2025-10-16T11:30:00-07:00"),
      endTime: new Date("2025-10-16T12:30:00-07:00"),
      location: "Awards Theater",
      track: "Awards",
      level: "All",
      tags: ["awards", "innovation", "recognition"]
    },
    {
      title: "Closing Keynote: Insurance 2030",
      description: "Vision for the future of insurance industry",
      day: 3,
      startTime: new Date("2025-10-16T12:30:00-07:00"),
      endTime: new Date("2025-10-16T13:30:00-07:00"),
      location: "Main Ballroom",
      track: "Keynote",
      level: "All",
      tags: ["keynote", "closing", "future"],
      speakers: [
        { name: "Victoria Chen", role: "Futurist", company: "Insurance Innovation Institute" }
      ]
    },
    {
      title: "Farewell Lunch & Networking",
      description: "Final networking opportunity and farewell lunch",
      day: 3,
      startTime: new Date("2025-10-16T13:30:00-07:00"),
      endTime: new Date("2025-10-16T15:00:00-07:00"),
      location: "Grand Dining Hall",
      track: "Networking",
      level: "All",
      tags: ["networking", "lunch", "farewell"]
    }
  ]
};

async function importAgenda() {
  try {
    console.log('Starting comprehensive agenda import...');
    
    // Clear existing data
    console.log('Clearing existing data...');
    await prisma.sessionSpeaker.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.speaker.deleteMany({});
    
    // Collect all unique speakers
    const speakersMap = new Map();
    const allSessions = [...conferenceData.day1, ...conferenceData.day2, ...conferenceData.day3];
    
    allSessions.forEach(session => {
      if (session.speakers) {
        session.speakers.forEach(speaker => {
          const key = `${speaker.name}-${speaker.company}`;
          if (!speakersMap.has(key)) {
            speakersMap.set(key, speaker);
          }
        });
      }
    });
    
    // Create speakers
    console.log(`Creating ${speakersMap.size} speakers...`);
    const createdSpeakers = new Map();
    
    for (const [key, speaker] of speakersMap) {
      const created = await prisma.speaker.create({
        data: {
          name: speaker.name,
          role: speaker.role,
          company: speaker.company,
          bio: speaker.bio || `${speaker.role} at ${speaker.company}`,
          imageUrl: speaker.imageUrl
        }
      });
      createdSpeakers.set(key, created);
    }
    
    // Create sessions with speakers
    console.log(`Creating ${allSessions.length} sessions...`);
    let sessionCount = 0;
    
    for (const sessionData of allSessions) {
      const session = await prisma.session.create({
        data: {
          title: sessionData.title,
          description: sessionData.description,
          day: sessionData.day,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime,
          location: sessionData.location,
          track: sessionData.track,
          level: sessionData.level,
          tags: sessionData.tags || []
        }
      });
      
      // Link speakers to session
      if (sessionData.speakers) {
        for (const speaker of sessionData.speakers) {
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
      }
      
      sessionCount++;
      if (sessionCount % 10 === 0) {
        console.log(`  Processed ${sessionCount} sessions...`);
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
      take: 5,
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
      console.log(`\n${session.title} (Day ${session.day})`);
      console.log(`  Track: ${session.track}`);
      console.log(`  Location: ${session.location}`);
      if (session.speakers.length > 0) {
        console.log(`  Speakers:`);
        session.speakers.forEach(ss => {
          console.log(`    - ${ss.speaker.name}, ${ss.speaker.role} @ ${ss.speaker.company}`);
        });
      }
    });
    
  } catch (error) {
    console.error('Error importing agenda:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the import
importAgenda();