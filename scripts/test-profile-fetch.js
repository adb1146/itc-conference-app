const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testProfileFetch() {
  try {
    console.log('Testing profile fetch functionality...\n');
    
    // Get a sample speaker
    const speaker = await prisma.speaker.findFirst({
      where: { name: { contains: 'Adrian Blidarus' } }
    });
    
    if (!speaker) {
      console.log('Speaker not found');
      return;
    }
    
    console.log('Testing with speaker:', speaker.name);
    console.log('Company:', speaker.company);
    console.log('Role:', speaker.role);
    console.log('Speaker ID:', speaker.id);
    
    // Simulate what the endpoint would do
    const searchQueries = {
      speaker: `${speaker.name} ${speaker.company} ${speaker.role} insurance technology profile`,
      company: `${speaker.company} insurance technology company profile overview`
    };
    
    console.log('\nSearch queries that would be used:');
    console.log('Speaker query:', searchQueries.speaker);
    console.log('Company query:', searchQueries.company);
    
    // Extract expertise keywords (simulating the endpoint logic)
    const expertise = extractKeywords('Mock profile content with AI and Machine Learning expertise', [
      'AI', 'Machine Learning', 'Insurtech', 'Digital Transformation',
      'Claims', 'Underwriting', 'Risk Management', 'Data Analytics',
      'Customer Experience', 'Innovation', 'Blockchain', 'IoT'
    ]);
    
    console.log('\nExtracted expertise:', expertise);
    
    // Update the speaker with mock data
    const updatedSpeaker = await prisma.speaker.update({
      where: { id: speaker.id },
      data: {
        profileSummary: 'Mock profile: Senior technology leader with expertise in insurance innovation',
        companyProfile: 'Mock company profile: Leading insurance technology provider',
        expertise: expertise,
        lastProfileSync: new Date()
      }
    });
    
    console.log('\n✓ Successfully updated speaker profile');
    console.log('Profile Summary:', updatedSpeaker.profileSummary);
    console.log('Company Profile:', updatedSpeaker.companyProfile);
    console.log('Expertise:', updatedSpeaker.expertise);
    console.log('Last Sync:', updatedSpeaker.lastProfileSync);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

function extractKeywords(text, keywords) {
  if (!text) return [];
  
  const found = [];
  const lowerText = text.toLowerCase();
  
  keywords.forEach(keyword => {
    if (lowerText.includes(keyword.toLowerCase())) {
      found.push(keyword);
    }
  });
  
  return found;
}

testProfileFetch();