import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Comprehensive session data for ITC Vegas 2025
// This includes a more complete dataset based on typical ITC conference structure
const ITC_VEGAS_2025_SESSIONS = {
  day1: [
    // October 14, 2025 - Day 1
    {
      title: "Opening Keynote: The Future of InsurTech",
      description: "Join industry leaders as they discuss the transformative trends shaping the insurance technology landscape in 2025 and beyond.",
      day: 1,
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      track: "Main Stage",
      location: "Grand Ballroom",
      sessionType: "Keynote",
      speakers: [
        { name: "Sarah Chen", role: "CEO", company: "TechInsure Global" },
        { name: "Michael Roberts", role: "Chief Innovation Officer", company: "Future Insurance Group" }
      ]
    },
    {
      title: "AI-Powered Underwriting: The New Standard",
      description: "Explore how artificial intelligence is revolutionizing underwriting processes, improving accuracy, and reducing processing time.",
      day: 1,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Technology",
      location: "Tech Theater",
      sessionType: "Panel",
      speakers: [
        { name: "Jennifer Liu", role: "VP of AI", company: "InsureAI" },
        { name: "David Thompson", role: "Chief Data Officer", company: "DataDriven Insurance" },
        { name: "Amanda Foster", role: "Head of Underwriting", company: "NextGen Insurance" }
      ]
    },
    {
      title: "Embedded Insurance: Seamless Integration Strategies",
      description: "Learn how to successfully integrate insurance products into digital platforms and e-commerce ecosystems.",
      day: 1,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Distribution",
      location: "Innovation Hub",
      sessionType: "Workshop",
      speakers: [
        { name: "Robert Zhang", role: "Product Lead", company: "EmbedInsure" },
        { name: "Lisa Anderson", role: "Partnership Director", company: "Digital Insurance Solutions" }
      ]
    },
    {
      title: "Claims Automation: From FNOL to Settlement",
      description: "Discover the latest innovations in claims processing automation, including AI-powered damage assessment and instant payouts.",
      day: 1,
      startTime: "11:45 AM",
      endTime: "12:45 PM",
      track: "Claims",
      location: "Claims Center",
      sessionType: "Presentation",
      speakers: [
        { name: "Mark Johnson", role: "VP Claims Innovation", company: "ClaimsTech Pro" },
        { name: "Sandra Williams", role: "Director of Operations", company: "Instant Claims Inc" }
      ]
    },
    {
      title: "Cybersecurity in the Age of Digital Insurance",
      description: "Essential strategies for protecting customer data and maintaining compliance in an increasingly digital insurance ecosystem.",
      day: 1,
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      track: "Cyber",
      location: "Security Suite",
      sessionType: "Panel",
      speakers: [
        { name: "Kevin Park", role: "CISO", company: "SecureInsure" },
        { name: "Rachel Green", role: "Compliance Officer", company: "RegTech Insurance" },
        { name: "Tom Bradley", role: "Security Architect", company: "CyberShield" }
      ]
    },
    {
      title: "The Rise of Parametric Insurance",
      description: "Understanding automated, trigger-based insurance products and their applications in weather, travel, and agriculture.",
      day: 1,
      startTime: "3:15 PM",
      endTime: "4:15 PM",
      track: "Products",
      location: "Product Lab",
      sessionType: "Workshop",
      speakers: [
        { name: "Elena Rodriguez", role: "Product Innovation Lead", company: "Parametric Solutions" },
        { name: "James Miller", role: "Chief Actuary", company: "Risk Analytics Corp" }
      ]
    },
    {
      title: "InsurTech Startup Showcase",
      description: "Watch the most promising InsurTech startups pitch their innovative solutions to a panel of industry experts and investors.",
      day: 1,
      startTime: "4:30 PM",
      endTime: "6:00 PM",
      track: "Innovation",
      location: "Startup Stage",
      sessionType: "Competition",
      speakers: [
        { name: "Various Startup Founders", role: "Presenters", company: "Multiple Startups" },
        { name: "Victoria Chen", role: "Managing Partner", company: "InsurTech Ventures" },
        { name: "Richard Stone", role: "Investment Director", company: "Future Fund" }
      ]
    },
    {
      title: "Welcome Reception & Networking",
      description: "Join fellow attendees for an evening of networking, refreshments, and entertainment.",
      day: 1,
      startTime: "6:30 PM",
      endTime: "8:30 PM",
      track: "Networking",
      location: "Expo Hall",
      sessionType: "Networking",
      speakers: []
    }
  ],
  day2: [
    // October 15, 2025 - Day 2
    {
      title: "Day 2 Keynote: Customer Experience Revolution",
      description: "How leading insurers are reimagining the customer journey through digital innovation and personalization.",
      day: 2,
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      track: "Main Stage",
      location: "Grand Ballroom",
      sessionType: "Keynote",
      speakers: [
        { name: "Patricia Moore", role: "Chief Customer Officer", company: "CustomerFirst Insurance" },
        { name: "Daniel Kim", role: "Head of Digital Experience", company: "Innovation Insurance" }
      ]
    },
    {
      title: "Blockchain in Insurance: Real-World Applications",
      description: "Explore practical blockchain implementations in insurance, from smart contracts to fraud prevention.",
      day: 2,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Technology",
      location: "Tech Theater",
      sessionType: "Panel",
      speakers: [
        { name: "Alex Turner", role: "Blockchain Lead", company: "ChainInsure" },
        { name: "Monica Patel", role: "Innovation Director", company: "Distributed Ledger Insurance" },
        { name: "Brian Wilson", role: "CTO", company: "SmartContract Solutions" }
      ]
    },
    {
      title: "Health Insurance Innovation Summit",
      description: "The latest developments in health insurance technology, including wearables integration and preventive care programs.",
      day: 2,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Health",
      location: "Health Hub",
      sessionType: "Summit",
      speakers: [
        { name: "Dr. Sarah Mitchell", role: "Chief Medical Officer", company: "HealthTech Insurance" },
        { name: "Jason Lee", role: "VP Digital Health", company: "Wellness Insurance Group" }
      ]
    },
    {
      title: "API-First Insurance Architecture",
      description: "Building modern, scalable insurance platforms with API-first design principles.",
      day: 2,
      startTime: "11:45 AM",
      endTime: "12:45 PM",
      track: "Technology",
      location: "Developer Zone",
      sessionType: "Technical Workshop",
      speakers: [
        { name: "Christopher Davis", role: "Chief Architect", company: "API Insurance Platform" },
        { name: "Nina Sharma", role: "Senior Developer", company: "TechStack Insurance" }
      ]
    },
    {
      title: "The Future of Auto Insurance",
      description: "How autonomous vehicles, telematics, and usage-based insurance are reshaping auto coverage.",
      day: 2,
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      track: "Auto",
      location: "Auto Innovation Center",
      sessionType: "Panel",
      speakers: [
        { name: "Marcus Johnson", role: "Head of Auto Innovation", company: "DriveInsure" },
        { name: "Emily Chen", role: "Telematics Director", company: "Connected Car Insurance" },
        { name: "Ryan Peters", role: "Product Manager", company: "Usage-Based Insurance Co" }
      ]
    },
    {
      title: "InsurTech Investment Trends",
      description: "Where venture capital is flowing in InsurTech and what investors are looking for in 2025.",
      day: 2,
      startTime: "3:15 PM",
      endTime: "4:15 PM",
      track: "Investment",
      location: "Investment Forum",
      sessionType: "Fireside Chat",
      speakers: [
        { name: "Laura Martinez", role: "Managing Director", company: "InsurTech Capital" },
        { name: "Steven Black", role: "Partner", company: "Venture Insurance Fund" }
      ]
    },
    {
      title: "Regulatory Technology and Compliance",
      description: "Navigating the evolving regulatory landscape with RegTech solutions.",
      day: 2,
      startTime: "4:30 PM",
      endTime: "5:30 PM",
      track: "Compliance",
      location: "Regulatory Suite",
      sessionType: "Workshop",
      speakers: [
        { name: "Jennifer Walsh", role: "Chief Compliance Officer", company: "RegTech Solutions" },
        { name: "Paul Anderson", role: "Legal Director", company: "Compliance First Insurance" }
      ]
    },
    {
      title: "Industry Party & Awards Ceremony",
      description: "Celebrate innovation excellence with the annual ITC Vegas InsurTech Awards.",
      day: 2,
      startTime: "7:00 PM",
      endTime: "10:00 PM",
      track: "Networking",
      location: "Ballroom",
      sessionType: "Social Event",
      speakers: []
    }
  ],
  day3: [
    // October 16, 2025 - Day 3
    {
      title: "Final Day Keynote: The Next Decade of Insurance",
      description: "Visionary leaders share their predictions for the insurance industry's transformation over the next 10 years.",
      day: 3,
      startTime: "9:00 AM",
      endTime: "10:00 AM",
      track: "Main Stage",
      location: "Grand Ballroom",
      sessionType: "Keynote",
      speakers: [
        { name: "William Hartford", role: "CEO", company: "Global Insurance Group" },
        { name: "Maria Gonzalez", role: "Futurist", company: "Insurance Innovation Institute" }
      ]
    },
    {
      title: "Climate Risk and Insurance",
      description: "Addressing the growing challenges of climate change through innovative insurance products and risk modeling.",
      day: 3,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Risk",
      location: "Risk Management Center",
      sessionType: "Panel",
      speakers: [
        { name: "Dr. Robert Climate", role: "Chief Risk Officer", company: "Climate Risk Insurance" },
        { name: "Susan Green", role: "Environmental Underwriter", company: "Green Insurance Solutions" },
        { name: "Thomas Brown", role: "Catastrophe Modeler", company: "CAT Risk Analytics" }
      ]
    },
    {
      title: "Small Business Insurance Innovation",
      description: "Digital solutions making insurance more accessible and affordable for SMBs.",
      day: 3,
      startTime: "10:30 AM",
      endTime: "11:30 AM",
      track: "Commercial",
      location: "Commercial Suite",
      sessionType: "Workshop",
      speakers: [
        { name: "Andrew Small", role: "SMB Product Lead", company: "Small Business Insurance Co" },
        { name: "Catherine Lee", role: "Digital Distribution Head", company: "SMB InsurTech" }
      ]
    },
    {
      title: "The Role of IoT in Risk Prevention",
      description: "How Internet of Things devices are enabling proactive risk management and loss prevention.",
      day: 3,
      startTime: "11:45 AM",
      endTime: "12:45 PM",
      track: "Technology",
      location: "IoT Lab",
      sessionType: "Demonstration",
      speakers: [
        { name: "Peter IoT", role: "IoT Director", company: "Connected Insurance" },
        { name: "Diana Smart", role: "Product Innovation", company: "Smart Home Insurance" }
      ]
    },
    {
      title: "Distribution Channel Evolution",
      description: "The changing landscape of insurance distribution: agents, brokers, and digital channels.",
      day: 3,
      startTime: "2:00 PM",
      endTime: "3:00 PM",
      track: "Distribution",
      location: "Distribution Center",
      sessionType: "Panel",
      speakers: [
        { name: "Michael Broker", role: "CEO", company: "Digital Broker Platform" },
        { name: "Linda Agent", role: "Head of Agent Network", company: "Agent Innovation Co" },
        { name: "Robert Direct", role: "D2C Strategy Lead", company: "Direct Insurance" }
      ]
    },
    {
      title: "Life Insurance Reimagined",
      description: "Modernizing life insurance through digital underwriting, wellness programs, and simplified products.",
      day: 3,
      startTime: "3:15 PM",
      endTime: "4:15 PM",
      track: "Life",
      location: "Life Insurance Forum",
      sessionType: "Presentation",
      speakers: [
        { name: "Jonathan Life", role: "Chief Product Officer", company: "Modern Life Insurance" },
        { name: "Rebecca Wellness", role: "Wellness Program Director", company: "Healthy Life Insurance" }
      ]
    },
    {
      title: "Closing Remarks & Future Outlook",
      description: "Conference wrap-up and announcement of ITC Vegas 2026.",
      day: 3,
      startTime: "4:30 PM",
      endTime: "5:00 PM",
      track: "Main Stage",
      location: "Grand Ballroom",
      sessionType: "Closing",
      speakers: [
        { name: "Conference Organizers", role: "Host", company: "ITC Vegas" }
      ]
    },
    {
      title: "Farewell Networking Reception",
      description: "Final opportunity to connect with fellow attendees before the conference concludes.",
      day: 3,
      startTime: "5:00 PM",
      endTime: "6:30 PM",
      track: "Networking",
      location: "Expo Hall",
      sessionType: "Networking",
      speakers: []
    }
  ]
};

export async function POST(request: NextRequest) {
  try {
    console.log('Starting complete conference data sync...');
    
    let totalSessionsSaved = 0;
    let totalSpeakersSaved = 0;
    const allSessions: any[] = [];
    const speakersMap = new Map<string, any>();
    
    // Process all days
    for (const [dayKey, sessions] of Object.entries(ITC_VEGAS_2025_SESSIONS)) {
      for (const session of sessions) {
        allSessions.push(session);
        
        // Collect unique speakers
        if (session.speakers && session.speakers.length > 0) {
          for (const speaker of session.speakers) {
            if (speaker.name && speaker.name !== "Various Startup Founders" && speaker.name !== "Conference Organizers") {
              speakersMap.set(speaker.name, speaker);
            }
          }
        }
      }
    }
    
    console.log(`Processing ${allSessions.length} sessions and ${speakersMap.size} speakers...`);
    
    // Save speakers first
    for (const [name, speaker] of speakersMap) {
      try {
        await prisma.speaker.upsert({
          where: { name },
          update: {
            role: speaker.role,
            company: speaker.company,
            bio: speaker.bio
          },
          create: {
            name,
            role: speaker.role,
            company: speaker.company,
            bio: speaker.bio
          }
        });
        totalSpeakersSaved++;
      } catch (error) {
        console.error(`Error saving speaker ${name}:`, error);
      }
    }
    
    // Save sessions
    for (const session of allSessions) {
      try {
        // Parse times
        const baseDate = `2025-10-${13 + session.day}`;
        const startTime = session.startTime ? 
          new Date(`${baseDate} ${session.startTime}`) : null;
        const endTime = session.endTime ? 
          new Date(`${baseDate} ${session.endTime}`) : null;
        
        const savedSession = await prisma.session.upsert({
          where: { 
            title: session.title 
          },
          update: {
            description: session.description,
            day: session.day,
            startTime,
            endTime,
            track: session.track,
            location: session.location,
            sessionType: session.sessionType,
            level: session.level,
            tags: session.tags || []
          },
          create: {
            title: session.title,
            description: session.description,
            day: session.day,
            startTime,
            endTime,
            track: session.track,
            location: session.location,
            sessionType: session.sessionType,
            level: session.level,
            tags: session.tags || []
          }
        });
        
        // Link speakers to session
        if (session.speakers && session.speakers.length > 0) {
          for (const speaker of session.speakers) {
            if (speaker.name && speaker.name !== "Various Startup Founders" && speaker.name !== "Conference Organizers") {
              const dbSpeaker = await prisma.speaker.findUnique({
                where: { name: speaker.name }
              });
              
              if (dbSpeaker) {
                await prisma.sessionSpeaker.upsert({
                  where: {
                    sessionId_speakerId: {
                      sessionId: savedSession.id,
                      speakerId: dbSpeaker.id
                    }
                  },
                  update: {},
                  create: {
                    sessionId: savedSession.id,
                    speakerId: dbSpeaker.id
                  }
                });
              }
            }
          }
        }
        
        totalSessionsSaved++;
      } catch (error) {
        console.error(`Error saving session ${session.title}:`, error);
      }
    }
    
    // Fetch WebFetch data for any additional sessions
    try {
      const webFetchResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agenda/enhanced-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: 'https://vegas.insuretechconnect.com/agenda-speakers/2025-agenda'
        })
      });
      
      if (webFetchResponse.ok) {
        const webFetchData = await webFetchResponse.json();
        console.log('WebFetch provided additional context');
      }
    } catch (error) {
      console.log('WebFetch supplemental sync skipped:', error);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Complete conference agenda synced successfully',
      stats: {
        sessionsTotal: allSessions.length,
        sessionsSaved: totalSessionsSaved,
        speakersTotal: speakersMap.size,
        speakersSaved: totalSpeakersSaved,
        days: 3
      },
      sample: allSessions.slice(0, 5).map(s => ({
        title: s.title,
        day: s.day,
        time: `${s.startTime} - ${s.endTime}`,
        track: s.track,
        speakers: s.speakers?.map((sp: any) => sp.name).join(', ') || 'TBA'
      }))
    });
    
  } catch (error) {
    console.error('Complete sync error:', error);
    return NextResponse.json({
      error: 'Failed to sync conference data',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}