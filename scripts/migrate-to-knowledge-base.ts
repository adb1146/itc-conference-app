import prisma from '../lib/db';
import { generateEmbedding } from '../lib/vector-db';

async function migratePSAdvisoryToKnowledgeBase() {
  console.log('Starting migration of PS Advisory content to KnowledgeBase table...');

  try {
    // First, get all PS Advisory content from Sessions table
    const psAdvisorySessions = await prisma.session.findMany({
      where: {
        OR: [
          { sessionType: 'PSADVISORY' },
          { isPSAdvisoryContent: true },
          { track: 'PS Advisory Information' }
        ]
      }
    });

    console.log(`Found ${psAdvisorySessions.length} PS Advisory entries to migrate`);

    // Migrate each entry to KnowledgeBase
    for (const session of psAdvisorySessions) {
      console.log(`Migrating: ${session.title}`);

      // Determine content type based on category or title
      let contentType = 'company_info';
      let category = session.category || null;

      if (session.title.toLowerCase().includes('mission') || session.title.toLowerCase().includes('values')) {
        contentType = 'company_info';
        category = 'mission';
      } else if (session.title.toLowerCase().includes('story') || session.title.toLowerCase().includes('founded')) {
        contentType = 'company_info';
        category = 'history';
      } else if (session.title.toLowerCase().includes('expertise') || session.title.toLowerCase().includes('salesforce')) {
        contentType = 'expertise';
        category = 'capabilities';
      } else if (session.title.toLowerCase().includes('headquarters') || session.title.toLowerCase().includes('location')) {
        contentType = 'company_info';
        category = 'contact';
      }

      // Prepare metadata
      const metadata = {
        originalSessionId: session.id,
        migratedFrom: 'Session',
        migratedAt: new Date().toISOString(),
        learningObjectives: session.learningObjectives,
        targetAudience: session.targetAudience
      };

      // Create KnowledgeBase entry
      await prisma.knowledgeBase.create({
        data: {
          title: session.title,
          content: session.description,
          contentType,
          category,
          source: 'ps_advisory',
          keywords: session.keywords || [],
          metadata,
          embedding: session.embedding || [],
          isActive: true,
          priority: 100, // High priority for PS Advisory content
          relatedLinks: ['https://psadvisory.com']
        }
      });

      console.log(`✓ Migrated: ${session.title}`);
    }

    // Now delete the PS Advisory entries from Session table
    const deleted = await prisma.session.deleteMany({
      where: {
        OR: [
          { sessionType: 'PSADVISORY' },
          { isPSAdvisoryContent: true },
          { track: 'PS Advisory Information' }
        ]
      }
    });

    console.log(`\n✅ Migration complete!`);
    console.log(`- Migrated ${psAdvisorySessions.length} entries to KnowledgeBase`);
    console.log(`- Deleted ${deleted.count} entries from Session table`);

    // Add proper PS Advisory content to KnowledgeBase
    const psAdvisoryContent = [
      {
        title: 'PS Advisory Leadership Team',
        content: `PS Advisory's leadership team brings together decades of insurance and technology expertise:

        **Andrew Bartels (Founder & CEO)**: Founded PS Advisory with the vision that insurance organizations deserve a Salesforce partner that understands their industry as well as the platform. With decades of experience in insurance technology, he leads the company's strategic direction.

        **Hitesh Malhotra (CTO)**: With over 20 years in the Salesforce ecosystem and 25+ certifications, Hitesh has built solutions across Europe, South Africa, and the United States. He translates complexity into clarity and ensures solutions scale with clients' growth.

        **Tom King (Director of Strategy)**: Tom 'grew up in insurance' with roots as an actuary. He's held senior roles at AIG, IBM, Pegasystems, and Salesforce, bringing deep domain knowledge across multiple insurance lines.

        **Nancy Paul (Senior Delivery Manager)**: With 17 years of project management experience, Nancy specializes in helping insurance clients achieve real ROI. She aligns stakeholders and ensures every project delivers on its promise.

        **Judd Lehmkuhl (Solution Architect)**: Deep experience in both sales operations and Salesforce development, excelling at translating client needs into clear requirements.

        **Prateek Shukla (Solution Architect)**: Years of experience across the full tech stack, with expertise in client engagement, DevOps, and team leadership.`,
        contentType: 'company_info',
        category: 'leadership',
        keywords: ['Andrew Bartels', 'Hitesh Malhotra', 'Tom King', 'Nancy Paul', 'Judd Lehmkuhl', 'Prateek Shukla', 'leadership', 'team']
      },
      {
        title: 'PS Advisory Four Quadrant Method™',
        content: `The Four Quadrant Method™ is PS Advisory's strategic framework for evaluating digital transformation initiatives across four critical dimensions:

        **Quadrant 1: Business Impact** - Assessing revenue potential, cost reduction opportunities, market differentiation, and competitive advantage.

        **Quadrant 2: Technical Complexity** - Understanding system integration requirements, data migration needs, infrastructure changes, and security considerations.

        **Quadrant 3: Organizational Readiness** - Evaluating change management requirements, training needs, cultural alignment, and resource availability.

        **Quadrant 4: Time to Value** - Balancing quick wins with long-term investments, phased implementation opportunities, ROI timeline, and risk mitigation strategies.

        This method helps insurance organizations prioritize technology investments, minimize implementation risks, and maximize ROI on digital transformation.`,
        contentType: 'methodology',
        category: 'framework',
        keywords: ['Four Quadrant Method', 'methodology', 'framework', 'digital transformation', 'strategy', 'ROI']
      },
      {
        title: 'PS Advisory Workers Compensation Expertise',
        content: `PS Advisory has deep specialization in Workers Compensation, addressing complex challenges like multi-state compliance, rising medical costs, and injured worker experience.

        **Solutions include:**
        - Automated FNOL processing and intelligent claim triage
        - Medical bill review automation and pharmacy benefit management
        - Return-to-work program tracking and litigation management
        - Multi-state compliance and NCCI reporting
        - EDI solutions for FROI/SROI
        - Predictive modeling for high-cost claims

        **Typical results:**
        - 45% reduction in claim cycle time
        - 30% improvement in return-to-work rates
        - 35% reduction in medical costs
        - 25% decrease in litigation frequency`,
        contentType: 'expertise',
        category: 'workers_comp',
        keywords: ['workers compensation', 'workers comp', 'claims', 'FNOL', 'medical management', 'compliance', 'NCCI', 'FROI', 'SROI']
      }
    ];

    // Add the new comprehensive PS Advisory content
    for (const content of psAdvisoryContent) {
      const embedding = await generateEmbedding(`${content.title} ${content.content} ${content.keywords.join(' ')}`);

      await prisma.knowledgeBase.create({
        data: {
          ...content,
          source: 'ps_advisory',
          embedding: embedding || [],
          isActive: true,
          priority: 100,
          relatedLinks: ['https://psadvisory.com']
        }
      });

      console.log(`✓ Added: ${content.title}`);
    }

    console.log('\n🎉 PS Advisory content successfully migrated to KnowledgeBase table!');

  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migratePSAdvisoryToKnowledgeBase();