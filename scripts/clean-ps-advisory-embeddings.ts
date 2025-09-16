/**
 * Clean and rebuild PS Advisory embeddings with accurate information
 * This ensures the vector database contains only correct facts
 */

import prisma from '../lib/db';

// ACCURATE PS Advisory content - this is the ONLY truth
const ACCURATE_PS_ADVISORY_CONTENT = [
  {
    id: 'ps-advisory-company',
    title: 'PS Advisory - Technology Consulting Firm',
    content: `PS Advisory is an insurance technology consulting firm founded by Andrew Bartels (NOT Nancy Paul).
    The company specializes in Salesforce solutions for insurance organizations.
    PS Advisory built this ITC Vegas conference app as a technology demonstration.
    IMPORTANT: PS Advisory does NOT have a booth at ITC Vegas and team members are NOT speaking at conference sessions.`,
    keywords: ['PS Advisory', 'consulting', 'Salesforce', 'insurance technology', 'Andrew Bartels founder']
  },
  {
    id: 'ps-advisory-andrew-bartels',
    title: 'Andrew Bartels - Founder and CEO of PS Advisory',
    content: `Andrew Bartels is the Founder and CEO of PS Advisory. He founded the company with a vision to provide
    insurance organizations with Salesforce expertise. Andrew leads the company from Baltimore, Maryland.
    He is the actual founder of PS Advisory, not Nancy Paul.`,
    keywords: ['Andrew Bartels', 'founder', 'CEO', 'PS Advisory founder', 'leadership']
  },
  {
    id: 'ps-advisory-nancy-paul',
    title: 'Nancy Paul - Senior Delivery Manager at PS Advisory',
    content: `Nancy Paul is the Senior Delivery Manager at PS Advisory (she is NOT the founder, NOT the CEO).
    Nancy has 17 years of project management experience helping insurance clients achieve ROI.
    IMPORTANT: Nancy Paul is NOT speaking at any ITC Vegas sessions, NOT presenting at panels, and PS Advisory does NOT have a booth.
    Nancy works for PS Advisory but is not at the conference as a speaker.`,
    keywords: ['Nancy Paul', 'Senior Delivery Manager', 'project management', 'NOT founder', 'NOT CEO']
  },
  {
    id: 'ps-advisory-no-booth',
    title: 'PS Advisory Conference Presence',
    content: `PS Advisory does NOT have a booth at ITC Vegas 2025. They do NOT have a physical presence at the conference.
    PS Advisory team members are NOT speaking at any sessions. The company built this conference app but is not exhibiting.
    To contact PS Advisory, use their website psadvisory.com, not at the conference.`,
    keywords: ['no booth', 'not exhibiting', 'not speaking', 'no physical presence', 'online only']
  },
  {
    id: 'ps-advisory-team',
    title: 'PS Advisory Leadership Team',
    content: `PS Advisory team: Andrew Bartels (Founder & CEO), Nancy Paul (Senior Delivery Manager NOT founder),
    Hitesh Malhotra (CTO), Tom King (Director of Strategy), Judd Lehmkuhl (Solution Architect),
    Prateek Shukla (Solution Architect). None of these team members are speaking at ITC Vegas 2025.`,
    keywords: ['team', 'leadership', 'not speaking at conference']
  },
  {
    id: 'ps-advisory-not-affiliated',
    title: 'People NOT Affiliated with PS Advisory',
    content: `The following people are NOT affiliated with PS Advisory in any way: Agim Emruli (NOT with PS Advisory),
    Clive Thompson (NOT with PS Advisory), and any ITC Vegas conference speakers unless explicitly stated.
    Conference sessions are presented by their listed speakers, not PS Advisory staff.`,
    keywords: ['Agim Emruli not affiliated', 'not PS Advisory', 'conference speakers']
  },
  {
    id: 'ps-advisory-services',
    title: 'PS Advisory Services',
    content: `PS Advisory provides Salesforce consulting services for insurance companies. They specialize in
    digital transformation, CRM implementation, and process optimization. Contact them at psadvisory.com or
    443-424-2857. They do not have a conference booth - contact is digital only.`,
    keywords: ['services', 'Salesforce', 'consulting', 'digital contact only']
  }
];

async function cleanAndRebuildPSAdvisoryContent() {
  console.log('🧹 Starting PS Advisory content cleanup and rebuild...\n');

  try {
    // Step 1: Delete ALL existing PS Advisory content
    console.log('Step 1: Removing all existing PS Advisory content...');
    const deleted = await prisma.session.deleteMany({
      where: {
        OR: [
          { track: 'PS Advisory Information' },
          { isPSAdvisoryContent: true },
          { sessionType: 'PSADVISORY' },
          { description: { contains: 'PS Advisory' } },
          { description: { contains: 'Nancy Paul' } },
          { title: { contains: 'PS Advisory' } },
          { title: { contains: 'Nancy Paul' } }
        ]
      }
    });
    console.log(`✅ Deleted ${deleted.count} PS Advisory entries\n`);

    // Step 2: Create new, accurate content
    console.log('Step 2: Creating accurate PS Advisory content...\n');

    for (const content of ACCURATE_PS_ADVISORY_CONTENT) {
      console.log(`Creating: ${content.title}`);

      // Create the session with accurate content
      // Note: We're not generating embeddings here since OpenAI API isn't configured
      // But the text content is accurate for when embeddings are generated
      const session = await prisma.session.create({
        data: {
          title: content.title,
          description: content.content,
          track: 'PS Advisory Facts', // Different track name to distinguish from old data
          format: 'Fact Sheet',
          level: 'All Levels',
          startTime: new Date('2025-10-14T09:00:00Z'),
          endTime: new Date('2025-10-14T09:30:00Z'),
          location: 'Online Only - psadvisory.com',
          day: 'Not Applicable',
          sessionType: 'PSADVISORY_FACTS', // New type to distinguish
          keywords: content.keywords,
          targetAudience: ['All Attendees'],
          learningObjectives: [
            'Understand PS Advisory accurately',
            'Know that Andrew Bartels is the founder',
            'Know that Nancy Paul is Senior Delivery Manager, not founder',
            'Know that PS Advisory has no booth or speakers at ITC Vegas'
          ],
          isPSAdvisoryContent: true,
          category: 'facts'
        }
      });

      console.log(`✅ Created: ${content.title}`);
    }

    // Step 3: Update Nancy Paul's speaker record
    console.log('\nStep 3: Updating Nancy Paul speaker record...');
    const nancyUpdate = await prisma.speaker.updateMany({
      where: { name: 'Nancy Paul' },
      data: {
        bio: 'Senior Delivery Manager at PS Advisory (NOT the founder). 17 years of project management experience. NOT speaking at ITC Vegas 2025.',
        title: 'Senior Delivery Manager (NOT Founder/CEO)'
      }
    });
    console.log(`✅ Updated ${nancyUpdate.count} Nancy Paul records`);

    // Step 4: Ensure Andrew Bartels is listed as founder
    console.log('\nStep 4: Ensuring Andrew Bartels is correctly listed...');
    const andrewExists = await prisma.speaker.findFirst({
      where: { name: 'Andrew Bartels' }
    });

    if (!andrewExists) {
      await prisma.speaker.create({
        data: {
          name: 'Andrew Bartels',
          company: 'PS Advisory',
          bio: 'Founder and CEO of PS Advisory. Founded the company to provide Salesforce expertise to insurance organizations.',
          title: 'Founder & CEO',
          isPSAdvisory: true
        }
      });
      console.log('✅ Created Andrew Bartels as Founder & CEO');
    } else {
      await prisma.speaker.update({
        where: { id: andrewExists.id },
        data: {
          bio: 'Founder and CEO of PS Advisory. Founded the company to provide Salesforce expertise to insurance organizations.',
          title: 'Founder & CEO'
        }
      });
      console.log('✅ Updated Andrew Bartels as Founder & CEO');
    }

    // Step 5: Verify no incorrect associations remain
    console.log('\nStep 5: Verifying cleanup...');

    // Check for any sessions mentioning Nancy as founder
    const incorrectSessions = await prisma.session.findMany({
      where: {
        AND: [
          { description: { contains: 'Nancy Paul' } },
          {
            OR: [
              { description: { contains: 'founder' } },
              { description: { contains: 'CEO' } }
            ]
          }
        ]
      },
      select: { id: true, title: true }
    });

    if (incorrectSessions.length > 0) {
      console.log(`⚠️  Found ${incorrectSessions.length} sessions still mentioning Nancy as founder`);
      for (const session of incorrectSessions) {
        console.log(`  - ${session.title}`);
      }
    } else {
      console.log('✅ No incorrect Nancy Paul founder references found');
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ PS Advisory content has been cleaned and rebuilt!');
    console.log('\nKey facts now in database:');
    console.log('✅ Andrew Bartels is the Founder & CEO');
    console.log('✅ Nancy Paul is Senior Delivery Manager (not founder)');
    console.log('✅ PS Advisory has NO booth at ITC Vegas');
    console.log('✅ PS Advisory members are NOT speaking at sessions');
    console.log('✅ Agim Emruli is NOT affiliated with PS Advisory');
    console.log('\n⚠️  Note: Embeddings need to be regenerated when OpenAI API is available');

  } catch (error) {
    console.error('Error during cleanup:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the cleanup
cleanAndRebuildPSAdvisoryContent();