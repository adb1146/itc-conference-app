import prisma from '../lib/db';
import { generateEmbedding } from '../lib/vector-db';
import { upsertSessionsToLocalDB } from '../lib/local-vector-db';

// Updated PS Advisory content based on the new About page information
const updatedPSAdvisoryContent = [
  {
    id: 'ps-advisory-overview',
    title: 'PS Advisory - Insurance-Focused Salesforce Expertise',
    content: `PS Advisory was founded with a singular mission: to help insurance companies leverage the full power of Salesforce to transform their operations and customer experiences. Insurance organizations deserve a Salesforce partner that understands their industry as well as the platform.`,
    category: 'company_info',
    keywords: ['PS Advisory', 'Salesforce', 'insurance', 'expertise', 'transformation', 'customer experiences']
  },
  {
    id: 'ps-advisory-story',
    title: 'PS Advisory Story - Founded by Andrew Bartels',
    content: `PS Advisory was founded by Andrew Bartels with a simple but powerful vision: insurance organizations deserve a Salesforce partner that understands their industry as well as the platform. With decades of experience in insurance technology, Andrew launched PS Advisory to close that gap by offering strategic, certified Salesforce expertise tailored to the needs of brokers, MGAs, carriers, and reinsurers. What began as a focused vision has grown into a full-service Salesforce consultancy with deep expertise across P&C, Life, and Health insurance domains. Today, our team includes certified Salesforce architects, developers, and business analysts who share a passion for insurance innovation. Together, our team combines technical depth, insurance industry fluency, and a relentless focus on outcomes. We don't just implement Salesforce; we help transform the way insurance organizations work.`,
    category: 'company_info',
    keywords: ['Andrew Bartels', 'founder', 'story', 'vision', 'P&C', 'Life', 'Health', 'insurance domains']
  },
  {
    id: 'ps-advisory-mission',
    title: 'PS Advisory Mission & Values',
    content: `To empower insurance organizations with technology solutions that transform customer experiences, streamline operations, and drive growth. Our core values include: Industry Expertise - We deeply understand insurance workflows, regulations, and customer expectations. Client Partnership - We view ourselves as an extension of your team, committed to your long-term success. Continuous Innovation - We constantly explore new ways to leverage Salesforce capabilities for insurance-specific challenges. Quality Delivery - We maintain rigorous standards in our implementations, ensuring robust, scalable solutions.`,
    category: 'mission',
    keywords: ['mission', 'values', 'industry expertise', 'client partnership', 'continuous innovation', 'quality delivery']
  },
  {
    id: 'ps-advisory-andrew-bartels',
    title: 'Andrew Bartels - Founder & CEO - PS Advisory',
    content: `Andrew Bartels is the Founder & CEO of PS Advisory. Andrew founded PS Advisory with a vision that insurance organizations deserve a Salesforce partner that understands their industry as well as the platform. With decades of experience in insurance technology, he launched PS Advisory to close that gap. His quote: "Insurance organizations deserve a Salesforce partner that understands their industry as well as the platform."`,
    category: 'leadership',
    keywords: ['Andrew Bartels', 'Founder', 'CEO', 'PS Advisory', 'leadership', 'insurance technology']
  },
  {
    id: 'ps-advisory-hitesh-malhotra',
    title: 'Hitesh Malhotra - CTO - PS Advisory',
    content: `Hitesh Malhotra serves as CTO at PS Advisory. With over 20 years of experience in the Salesforce ecosystem and 25+ certifications, Hitesh has built solutions across Europe, South Africa, and the United States. He translates complexity into clarity and ensures our solutions scale with our clients' growth.`,
    category: 'leadership',
    keywords: ['Hitesh Malhotra', 'CTO', 'Salesforce certifications', 'global experience', 'scalable solutions']
  },
  {
    id: 'ps-advisory-tom-king',
    title: 'Tom King - Director of Strategy - PS Advisory',
    content: `Tom King is the Director of Strategy at PS Advisory. Tom 'grew up in insurance' with roots as an actuary and training in the performing arts. He's held senior roles at AIG, IBM, Pegasystems, and Salesforce, bringing deep domain knowledge across multiple insurance lines.`,
    category: 'leadership',
    keywords: ['Tom King', 'Director of Strategy', 'actuary', 'AIG', 'IBM', 'Pegasystems', 'Salesforce']
  },
  {
    id: 'ps-advisory-nancy-paul',
    title: 'Nancy Paul - Senior Delivery Manager - PS Advisory',
    content: `Nancy Paul is the Senior Delivery Manager at PS Advisory. With 17 years of project management experience, Nancy specializes in helping insurance clients achieve real ROI. She aligns stakeholders, manages complex implementations, and ensures every project delivers on its promise.`,
    category: 'leadership',
    keywords: ['Nancy Paul', 'Senior Delivery Manager', 'project management', 'ROI', 'stakeholder alignment']
  },
  {
    id: 'ps-advisory-judd-lehmkuhl',
    title: 'Judd Lehmkuhl - Solution Architect - PS Advisory',
    content: `Judd Lehmkuhl is a Solution Architect at PS Advisory. With deep experience in both sales operations and Salesforce development, Judd not only knows how to configure and build on the Salesforce platform, but also excels at translating client needs into clear, actionable requirements for developers.`,
    category: 'leadership',
    keywords: ['Judd Lehmkuhl', 'Solution Architect', 'sales operations', 'Salesforce development', 'requirements translation']
  },
  {
    id: 'ps-advisory-prateek-shukla',
    title: 'Prateek Shukla - Solution Architect - PS Advisory',
    content: `Prateek Shukla is a Solution Architect at PS Advisory. With years of experience across the full tech stack—including Salesforce and other platforms—Prateek brings a unique ability to understand client requirements and translate them into functional solutions, while also managing responsibilities ranging from client engagement to DevOps and team leadership.`,
    category: 'leadership',
    keywords: ['Prateek Shukla', 'Solution Architect', 'full stack', 'DevOps', 'team leadership', 'client engagement']
  },
  {
    id: 'ps-advisory-location',
    title: 'PS Advisory Headquarters - Baltimore, MD',
    content: `PS Advisory is headquartered in Baltimore, Maryland. You can reach us at 443-424-2857 or email contactus@psadvisory.com. Our Baltimore office serves as the hub for our insurance-focused Salesforce consultancy, supporting clients across the United States.`,
    category: 'contact',
    keywords: ['Baltimore', 'Maryland', 'headquarters', 'contact', '443-424-2857', 'contactus@psadvisory.com']
  },
  {
    id: 'ps-advisory-insurance-expertise',
    title: 'PS Advisory - Deep Insurance Industry Expertise',
    content: `PS Advisory brings deep insurance industry expertise across P&C, Life, and Health insurance domains. We understand insurance workflows, regulations, and customer expectations. Our team has experience with brokers, MGAs, carriers, and reinsurers. We combine technical Salesforce expertise with insurance industry fluency to deliver solutions that transform how insurance organizations work.`,
    category: 'expertise',
    keywords: ['insurance expertise', 'P&C insurance', 'Life insurance', 'Health insurance', 'brokers', 'MGAs', 'carriers', 'reinsurers']
  },
  {
    id: 'ps-advisory-salesforce-focus',
    title: 'PS Advisory - Certified Salesforce Consultancy',
    content: `PS Advisory is a full-service Salesforce consultancy with certified architects, developers, and business analysts. Our team holds 25+ Salesforce certifications and brings decades of experience in the Salesforce ecosystem. We don't just implement Salesforce; we help transform the way insurance organizations work, ensuring robust, scalable solutions that drive real business outcomes.`,
    category: 'technology',
    keywords: ['Salesforce consultancy', 'certified architects', 'Salesforce developers', 'business analysts', 'certifications', 'scalable solutions']
  }
];

async function updatePSAdvisoryContent() {
  console.log('Starting PS Advisory content update...');

  try {
    // First, remove existing PS Advisory content
    const deleted = await prisma.session.deleteMany({
      where: {
        OR: [
          { track: 'PS Advisory Information' },
          { isPSAdvisoryContent: true },
          { sessionType: 'PSADVISORY' }
        ]
      }
    });

    console.log(`Removed ${deleted.count} existing PS Advisory entries`);

    // Now add the updated content
    for (const content of updatedPSAdvisoryContent) {
      console.log(`Processing: ${content.title}`);

      // Generate embedding for the content
      let embedding: number[] | null = null;
      try {
        const fullText = `${content.title} ${content.content} ${content.keywords.join(' ')}`;
        embedding = await generateEmbedding(fullText);
      } catch (error) {
        console.error(`Failed to generate embedding for ${content.id}:`, error);
      }

      // Create a special "session" entry for PS Advisory content
      const session = await prisma.session.create({
        data: {
          title: content.title,
          description: content.content,
          track: 'PS Advisory Information',
          format: 'Knowledge Article',
          level: 'All Levels',
          startTime: new Date('2025-10-14T09:00:00Z'), // Default time
          endTime: new Date('2025-10-14T09:30:00Z'),
          location: 'PS Advisory',
          day: 'Resources',
          sessionType: 'PSADVISORY',
          keywords: content.keywords,
          targetAudience: ['All Attendees'],
          learningObjectives: [
            'Learn about PS Advisory services and expertise',
            'Understand our leadership team and vision',
            'Discover how we can help transform your insurance operations'
          ],
          // Store embedding if available
          embedding: embedding || undefined,
          isPSAdvisoryContent: true, // Custom flag to identify PS Advisory content
          category: content.category
        }
      });

      console.log(`✓ Created PS Advisory content: ${content.title}`);

      // Also update local vector DB
      if (embedding) {
        await upsertSessionsToLocalDB([{
          ...session,
          speakers: []
        }]);
      }
    }

    // Update speaker profiles for the leadership team
    const leadershipTeam = [
      {
        name: 'Andrew Bartels',
        company: 'PS Advisory',
        title: 'Founder & CEO',
        bio: 'Andrew founded PS Advisory with a vision that insurance organizations deserve a Salesforce partner that understands their industry as well as the platform. With decades of experience in insurance technology, he launched PS Advisory to close that gap.'
      },
      {
        name: 'Hitesh Malhotra',
        company: 'PS Advisory',
        title: 'CTO',
        bio: 'With over 20 years of experience in the Salesforce ecosystem and 25+ certifications, Hitesh has built solutions across Europe, South Africa, and the United States. He translates complexity into clarity and ensures our solutions scale with our clients\' growth.'
      },
      {
        name: 'Tom King',
        company: 'PS Advisory',
        title: 'Director of Strategy',
        bio: 'Tom \'grew up in insurance\' with roots as an actuary and training in the performing arts. He\'s held senior roles at AIG, IBM, Pegasystems, and Salesforce, bringing deep domain knowledge across multiple insurance lines.'
      },
      {
        name: 'Nancy Paul',
        company: 'PS Advisory',
        title: 'Senior Delivery Manager',
        bio: 'With 17 years of project management experience, Nancy specializes in helping insurance clients achieve real ROI. She aligns stakeholders, manages complex implementations, and ensures every project delivers on its promise.'
      },
      {
        name: 'Judd Lehmkuhl',
        company: 'PS Advisory',
        title: 'Solution Architect',
        bio: 'With deep experience in both sales operations and Salesforce development, Judd not only knows how to configure and build on the Salesforce platform, but also excels at translating client needs into clear, actionable requirements for developers.'
      },
      {
        name: 'Prateek Shukla',
        company: 'PS Advisory',
        title: 'Solution Architect',
        bio: 'With years of experience across the full tech stack—including Salesforce and other platforms—Prateek brings a unique ability to understand client requirements and translate them into functional solutions, while also managing responsibilities ranging from client engagement to DevOps and team leadership.'
      }
    ];

    for (const member of leadershipTeam) {
      const existing = await prisma.speaker.findFirst({
        where: { name: member.name }
      });

      if (existing) {
        await prisma.speaker.update({
          where: { id: existing.id },
          data: {
            company: member.company,
            bio: member.bio,
            expertise: [
              'Salesforce',
              'Insurance Technology',
              'Digital Transformation',
              'Process Optimization'
            ],
            isPSAdvisory: true
          }
        });
        console.log(`✓ Updated ${member.name} speaker profile`);
      } else {
        await prisma.speaker.create({
          data: {
            name: member.name,
            company: member.company,
            bio: member.bio,
            expertise: [
              'Salesforce',
              'Insurance Technology',
              'Digital Transformation',
              'Process Optimization'
            ],
            isPSAdvisory: true
          }
        });
        console.log(`✓ Created ${member.name} speaker profile`);
      }
    }

    console.log('\n✅ PS Advisory content successfully updated in vector database!');
    console.log('The AI can now respond with the updated PS Advisory information.');

  } catch (error) {
    console.error('Error updating PS Advisory content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the update
updatePSAdvisoryContent();