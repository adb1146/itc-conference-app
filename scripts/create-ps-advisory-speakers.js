const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function createPSAdvisorySpeakers() {
  console.log('Creating PS Advisory team speaker records...\n');

  const psAdvisoryTeam = [
    {
      name: 'Andrew Bartels',
      role: 'Founder & CEO',
      title: 'Founder & CEO',
      company: 'PS Advisory',
      bio: 'Andrew Bartels is the Founder and CEO of PS Advisory, a boutique insurance technology consulting firm specializing in Salesforce implementations for insurance carriers and agencies. With decades of experience in insurance technology, Andrew leads PS Advisory in delivering digital transformation strategies, AI and automation solutions for underwriting and claims, and custom insurtech solution development. Under his leadership, PS Advisory has become a trusted partner for insurance organizations seeking to modernize their technology infrastructure.',
      linkedinUrl: 'https://www.linkedin.com/in/andrewbartels/',
      twitterUrl: null,
      websiteUrl: 'https://psadvisory.com',
      imageUrl: null,
      expertise: ['Salesforce Insurance Cloud', 'Digital Transformation', 'Insurance Strategy', 'Technology Leadership', 'AI in Insurance'],
      achievements: ['Founded PS Advisory', 'Built ITC Vegas 2025 Conference App', 'Led numerous successful insurance digital transformations'],
      isPSAdvisory: true,
      profileSummary: 'Founder and CEO of PS Advisory, specializing in insurance technology consulting and Salesforce implementations.',
      companyProfile: 'PS Advisory is a boutique insurance technology consulting firm that helps insurance organizations modernize their technology infrastructure.'
    },
    {
      name: 'Nancy Paul',
      role: 'Senior Delivery Manager',
      title: 'Senior Delivery Manager',
      company: 'PS Advisory',
      bio: 'Nancy Paul is the Senior Delivery Manager at PS Advisory with 17 years of project management experience. She specializes in helping insurance clients achieve real ROI through strategic implementations of Salesforce and other technology solutions. Nancy is instrumental in ensuring successful project delivery, managing complex insurance technology transformations, and building strong client relationships. She is available for meetings throughout ITC Vegas 2025 to discuss how PS Advisory can help your insurance organization leverage technology for growth.',
      linkedinUrl: 'https://www.linkedin.com/in/nancypaul/',
      twitterUrl: null,
      websiteUrl: 'https://psadvisory.com',
      imageUrl: null,
      expertise: ['Project Management', 'Salesforce Delivery', 'Insurance Operations', 'Client Relationship Management', 'ROI Optimization'],
      achievements: ['17 years of project management experience', 'Successfully delivered numerous insurance technology transformations', 'Expert in Salesforce implementations'],
      isPSAdvisory: true,
      profileSummary: 'Senior Delivery Manager at PS Advisory with expertise in insurance technology project management and Salesforce implementations.',
      companyProfile: 'PS Advisory is a boutique insurance technology consulting firm that helps insurance organizations modernize their technology infrastructure.'
    },
    {
      name: 'Tom King',
      role: 'Senior Insurance Consultant',
      title: 'Senior Insurance Consultant',
      company: 'PS Advisory',
      bio: 'Tom King is a Senior Insurance Consultant at PS Advisory with extensive experience in the insurance industry. He brings deep domain expertise in property & casualty, life insurance, and health insurance sectors. Tom specializes in helping insurance organizations identify and implement technology solutions that drive operational efficiency and improve customer experience. His consulting approach combines industry best practices with innovative technology solutions to deliver measurable business value.',
      linkedinUrl: 'https://www.linkedin.com/in/tomking/',
      twitterUrl: null,
      websiteUrl: 'https://psadvisory.com',
      imageUrl: null,
      expertise: ['Insurance Consulting', 'Technology Strategy', 'Process Optimization', 'Digital Innovation', 'P&C Insurance'],
      achievements: ['Extensive experience across P&C, Life, and Health insurance', 'Led successful digital transformation initiatives', 'Expert in insurance operations optimization'],
      isPSAdvisory: true,
      profileSummary: 'Senior Insurance Consultant at PS Advisory with deep expertise in insurance operations and technology strategy.',
      companyProfile: 'PS Advisory is a boutique insurance technology consulting firm that helps insurance organizations modernize their technology infrastructure.'
    }
  ];

  try {
    for (const member of psAdvisoryTeam) {
      // Check if speaker already exists
      const existing = await prisma.speaker.findFirst({
        where: {
          name: member.name,
          company: 'PS Advisory'
        }
      });

      if (existing) {
        console.log(`Speaker ${member.name} already exists. Updating...`);
        await prisma.speaker.update({
          where: { id: existing.id },
          data: member
        });
        console.log(`✅ Updated: ${member.name}`);
      } else {
        const speaker = await prisma.speaker.create({
          data: member
        });
        console.log(`✅ Created: ${member.name} (${member.role} at ${member.company})`);
        console.log(`   ID: ${speaker.id}`);
      }
    }

    console.log('\n✨ PS Advisory team speaker records created successfully!');
    console.log('\nThese speakers are attending ITC Vegas 2025 and are available for meetings.');
    console.log('Nancy Paul is specifically available for meetings throughout the conference.');
    console.log('Contact: contactus@psadvisory.com');

  } catch (error) {
    console.error('Error creating PS Advisory speakers:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPSAdvisorySpeakers().catch(console.error);