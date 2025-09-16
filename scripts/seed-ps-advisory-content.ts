import prisma from '../lib/db';
import { generateEmbedding } from '../lib/vector-db';
import { upsertSessionsToLocalDB } from '../lib/local-vector-db';

// PS Advisory content structured as knowledge articles
const psAdvisoryContent = [
  {
    id: 'ps-advisory-overview',
    title: 'PS Advisory - Salesforce Solutions for Insurance',
    content: `PS Advisory specializes in Salesforce solutions for the insurance industry. We help insurance organizations leverage technology to transform their operations, improve efficiency, and enhance customer experiences. Our focus is on delivering practical, implementable solutions that drive real business value.`,
    category: 'company_info',
    keywords: ['PS Advisory', 'Salesforce', 'insurance', 'consulting', 'technology solutions']
  },
  {
    id: 'ps-advisory-nancy-paul',
    title: 'Nancy Paul - PS Advisory',
    content: `Nancy Paul leads PS Advisory with extensive experience in insurance technology and Salesforce implementations. She specializes in helping insurance organizations modernize their operations through strategic technology solutions. Nancy is actively involved in the insurance technology community and speaks at industry conferences including ITC Vegas.`,
    category: 'leadership',
    keywords: ['Nancy Paul', 'PS Advisory', 'leadership', 'Salesforce', 'insurance technology']
  },
  {
    id: 'ps-advisory-four-quadrant',
    title: 'The Four Quadrant Method™ - Strategic Digital Transformation Framework',
    content: `PS Advisory's Four Quadrant Method is our signature framework for evaluating digital transformation initiatives. Quadrant 1 assesses Business Impact including revenue potential and cost reduction. Quadrant 2 evaluates Technical Complexity covering integration needs and infrastructure. Quadrant 3 measures Organizational Readiness including change management and training requirements. Quadrant 4 analyzes Time to Value, balancing quick wins with strategic investments. This method helps organizations prioritize investments, minimize risks, and maximize ROI on transformation initiatives.`,
    category: 'methodology',
    keywords: ['Four Quadrant Method', 'methodology', 'framework', 'digital transformation', 'strategy']
  },
  {
    id: 'ps-advisory-friction-gap',
    title: 'The Friction Gap Analysis™ - Eliminating Operational Inefficiencies',
    content: `The Friction Gap Analysis identifies and eliminates the disconnect between what technology promises and what it delivers. We analyze customer friction points like quote-to-bind delays and claims bottlenecks, operational friction like manual data entry and system switching overhead, and internal friction like underwriting bottlenecks and data silos. Our solutions include process automation, system integration, workflow optimization, and user experience design. Typical results include 40-60% reduction in processing time and 30% improvement in customer satisfaction.`,
    category: 'methodology',
    keywords: ['Friction Gap Analysis', 'efficiency', 'process optimization', 'automation', 'workflow']
  },
  {
    id: 'ps-advisory-workers-comp',
    title: 'Workers Compensation Transformation Excellence',
    content: `PS Advisory has deep specialization in Workers Compensation, addressing complex challenges like multi-state compliance, rising medical costs, and poor injured worker experience. Our solutions include automated FNOL processing, intelligent claim triage, medical bill review automation, return-to-work program tracking, and litigation management systems. We implement NCCI and state-specific reporting, EDI solutions for FROI/SROI, and predictive modeling for high-cost claims. Typical results include 45% reduction in claim cycle time, 30% improvement in return-to-work rates, and 35% reduction in medical costs.`,
    category: 'expertise',
    keywords: ['workers compensation', 'workers comp', 'claims', 'FNOL', 'medical management', 'compliance']
  },
  {
    id: 'ps-advisory-life-insurance',
    title: 'Life Insurance & Annuities Digital Modernization',
    content: `PS Advisory transforms life insurance operations from new business through claims. We implement automated underwriting engines with instant issue capabilities, integrate third-party data sources (MIB, Rx, MVR), and create digital distribution channels with agent portals and e-applications. Our policy administration solutions include lifecycle management, beneficiary tracking, and premium billing. For annuities, we handle variable, fixed, and indexed products with retirement income planning tools. Results include 80% reduction in underwriting time, 50% reduction in not-taken rates, and 3x faster product launches.`,
    category: 'expertise',
    keywords: ['life insurance', 'annuities', 'underwriting', 'policy administration', 'digital distribution']
  },
  {
    id: 'ps-advisory-salesforce',
    title: 'Salesforce Insurance Cloud Implementation Expertise',
    content: `PS Advisory specializes in Salesforce Insurance Cloud and Financial Services Cloud implementations for insurance organizations. We create custom Lightning components, integrate with existing policy admin systems, and build omnichannel experiences. Our team handles full lifecycle implementations from requirements gathering through deployment and adoption. We ensure seamless integration with your existing technology stack while maximizing the value of Salesforce's insurance-specific capabilities. Our implementations typically achieve 90% user adoption within 90 days.`,
    category: 'technology',
    keywords: ['Salesforce', 'Insurance Cloud', 'Financial Services Cloud', 'CRM', 'implementation']
  },
  {
    id: 'ps-advisory-ai-automation',
    title: 'AI and Automation Solutions for Insurance',
    content: `PS Advisory implements AI and automation solutions that transform insurance operations. Our underwriting automation reduces decision time from days to minutes using predictive models and third-party data integration. For claims, we deploy intelligent triage systems, fraud detection algorithms, and document processing automation. We also build chatbots for customer service, automated quote generation systems, and predictive analytics for risk assessment. These solutions typically reduce manual processing by 60% while improving accuracy and customer satisfaction.`,
    category: 'technology',
    keywords: ['AI', 'automation', 'machine learning', 'predictive analytics', 'underwriting automation']
  },
  {
    id: 'ps-advisory-results',
    title: 'Client Success Metrics and Proven Results',
    content: `PS Advisory clients typically achieve: 70% reduction in policy issuance time, 50% improvement in first-call resolution, 60% decrease in manual processing, 3x increase in agent productivity, 40% reduction in operational costs, 90% user adoption within 90 days, and 25% increase in customer satisfaction scores. We've successfully transformed operations for carriers managing billions in premiums, from Fortune 500 companies to regional carriers and InsurTech startups.`,
    category: 'results',
    keywords: ['results', 'ROI', 'success metrics', 'case studies', 'client success']
  },
  {
    id: 'ps-advisory-services',
    title: 'Comprehensive Insurance Technology Services',
    content: `PS Advisory offers end-to-end services including strategic consulting for technology roadmaps and vendor selection, full lifecycle implementation of CRM and policy admin systems, API development and system integration, custom application development, and change management with user training. We serve P&C carriers, life and health insurers, MGAs and MGUs, brokers and agents, and reinsurance companies. Our approach is technology-agnostic, though we have deep expertise in Salesforce, AWS, Azure, and modern cloud platforms.`,
    category: 'services',
    keywords: ['services', 'consulting', 'implementation', 'integration', 'training']
  },
  {
    id: 'ps-advisory-contact',
    title: 'Connect with PS Advisory',
    content: `To learn more about PS Advisory and our Salesforce solutions for insurance, visit our website at psadvisory.com. You can schedule a consultation to discuss your specific technology needs and explore how we can help your organization. PS Advisory focuses on practical implementations that deliver measurable business value.`,
    category: 'contact',
    keywords: ['contact', 'consultation', 'psadvisory.com', 'schedule meeting']
  },
  {
    id: 'ps-advisory-philosophy',
    title: 'Our Philosophy and Values',
    content: `PS Advisory operates on core principles: Insurance-First Thinking where we start with business needs not technology features, Partnership Approach working alongside your team not above them, Practical Innovation implementing solutions that work today while building for tomorrow, Measurable Impact focusing on outcomes that matter to your bottom line, and Continuous Improvement believing in iterative enhancement over big-bang transformations. We're 100% dedicated to insurance technology, combining domain expertise with technical excellence.`,
    category: 'company_info',
    keywords: ['philosophy', 'values', 'approach', 'principles', 'partnership']
  }
];

async function seedPSAdvisoryContent() {
  console.log('Starting PS Advisory content seeding...');

  try {
    // First, create PS Advisory as a special "session" category in the database
    for (const content of psAdvisoryContent) {
      console.log(`Processing: ${content.title}`);

      // Check if this content already exists
      const existing = await prisma.session.findFirst({
        where: {
          title: content.title
        }
      });

      if (existing) {
        console.log(`Skipping existing content: ${content.title}`);
        continue;
      }

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
            'Understand our methodologies and approach',
            'Discover how we can help your organization'
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
          speakers: [{
            id: 'nancy-paul',
            name: 'Nancy Paul',
            title: 'Founder & Principal Consultant',
            company: 'PS Advisory',
            bio: 'Insurance technology expert with 20+ years experience'
          }]
        }]);
      }
    }

    // Create a special speaker entry for Nancy Paul
    const nancyPaul = await prisma.speaker.findFirst({
      where: { name: 'Nancy Paul' }
    });

    if (!nancyPaul) {
      await prisma.speaker.create({
        data: {
          name: 'Nancy Paul',
          company: 'PS Advisory',
          bio: 'Nancy Paul leads PS Advisory, specializing in Salesforce solutions for the insurance industry. She helps insurance organizations modernize their operations through strategic technology implementations.',
          expertise: [
            'Salesforce Insurance Cloud',
            'Insurance Technology',
            'Digital Transformation',
            'Process Optimization'
          ],
          linkedinUrl: 'https://www.linkedin.com/in/nancypaul',
          isPSAdvisory: true
        }
      });
      console.log('✓ Created Nancy Paul speaker profile');
    }

    console.log('\n✅ PS Advisory content successfully added to vector database!');
    console.log('The AI can now naturally respond to PS Advisory queries using this context.');

  } catch (error) {
    console.error('Error seeding PS Advisory content:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the seeding
seedPSAdvisoryContent();