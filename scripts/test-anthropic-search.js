const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAnthropicSearch() {
  try {
    console.log('Testing Anthropic Web Search functionality...\n');
    
    // Get a test speaker
    const speaker = await prisma.speaker.findFirst({
      where: { 
        name: { contains: 'Adrian Blidarus' }
      }
    });
    
    if (!speaker) {
      console.log('Speaker not found');
      return;
    }
    
    console.log('Testing with speaker:', speaker.name);
    console.log('Company:', speaker.company);
    console.log('Role:', speaker.role);
    console.log('\n----------------------------\n');
    
    // Test the web search API directly
    console.log('Testing web search API...');
    const searchResponse = await fetch('http://localhost:3011/api/web-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: `${speaker.name} ${speaker.company} insurtech profile`,
        context: 'Find professional background and expertise',
        allowedDomains: ['linkedin.com', 'insuretechconnect.com']
      })
    });
    
    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      console.log('\n✓ Web search successful!');
      console.log('Query:', searchResult.query);
      console.log('Content preview:', searchResult.content?.substring(0, 200) + '...');
      console.log('Sources found:', searchResult.sources?.length || 0);
      
      if (searchResult.sources?.length > 0) {
        console.log('Sample sources:', searchResult.sources.slice(0, 3));
      }
    } else {
      console.error('✗ Web search failed:', searchResponse.status);
      const error = await searchResponse.text();
      console.error('Error:', error);
    }
    
    console.log('\n----------------------------\n');
    
    // Now test the full profile fetch endpoint
    console.log('Testing full profile fetch endpoint...');
    const profileResponse = await fetch(`http://localhost:3011/api/speakers/${speaker.id}/fetch-profile`, {
      method: 'POST'
    });
    
    if (profileResponse.ok) {
      const profileResult = await profileResponse.json();
      console.log('✓ Profile fetch successful!');
      
      // Check the updated speaker
      const updatedSpeaker = await prisma.speaker.findUnique({
        where: { id: speaker.id }
      });
      
      console.log('\nUpdated speaker profile:');
      console.log('- Has profile summary:', !!updatedSpeaker.profileSummary);
      console.log('- Has company profile:', !!updatedSpeaker.companyProfile);
      console.log('- Expertise areas:', updatedSpeaker.expertise?.length || 0);
      console.log('- LinkedIn URL:', updatedSpeaker.linkedinUrl || 'Not found');
      
      if (updatedSpeaker.profileSummary) {
        console.log('\nProfile Summary preview:');
        console.log(updatedSpeaker.profileSummary.substring(0, 200) + '...');
      }
      
      if (updatedSpeaker.expertise?.length > 0) {
        console.log('\nExpertise areas:', updatedSpeaker.expertise.join(', '));
      }
    } else {
      console.error('✗ Profile fetch failed:', profileResponse.status);
      const error = await profileResponse.text();
      console.error('Error:', error);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAnthropicSearch();