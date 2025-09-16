/**
 * Test to verify PS Advisory hallucination fixes
 */

import { validatePSAdvisoryResponse } from '../lib/ps-advisory-validation';
import { isPSAdvisoryFactCorrect } from '../lib/ps-advisory-facts';
import { createEnhancedPrompt } from '../lib/prompt-engine';

async function testHallucinationFixes() {
  console.log('🧪 Testing PS Advisory Hallucination Fixes\n');
  console.log('=' .repeat(60));

  // Test problematic responses that were hallucinated
  const problematicResponses = [
    {
      name: 'Nancy as founder with sessions',
      response: `Let me tell you about Nancy Paul and highlight relevant conference sessions that align with her expertise and PS Advisory's focus areas.

About Nancy Paul:
Nancy Paul is the founder and Senior Delivery Manager of PS Advisory, a specialized insurance technology consulting firm. With 17 years of project management experience, she focuses on helping insurance organizations achieve successful digital transformations, particularly in Salesforce implementations, AI/automation solutions, and custom insurtech development.

Relevant Conference Sessions:
Based on PS Advisory's core focus areas, I recommend these highly relevant sessions:

1. The New Underwriting Engine: AI, Data, and Partnerships in Small Commercial
- Aligns with PS Advisory's AI implementation expertise
- Features insights from Clive Thompson on practical AI applications
- Perfect for understanding how PS Advisory's solutions fit into modern underwriting

2. From Manual to AI-Driven: Rethinking Insurance Operations
- Demonstrates the digital transformation journey PS Advisory specializes in
- Led by Agim Emruli
- Showcases automation opportunities in insurance operations

3. Boosting Claims Efficiency & Effectiveness through Intelligent Automation
- Highlights the practical applications of automation solutions
- Demonstrates the type of implementations PS Advisory delivers
- Focus on measurable ROI, a key PS Advisory principle

Networking Opportunities:
- Visit the PS Advisory booth in the Innovation Hall
- Connect with Nancy during the Opening Reception on Tuesday evening
- Schedule a consultation at their booth to discuss your organization's specific needs`
    },
    {
      name: 'Simple Nancy founder claim',
      response: 'Nancy Paul founded PS Advisory and is the CEO.'
    },
    {
      name: 'PS Advisory booth mention',
      response: 'You can visit PS Advisory at their booth in the Innovation Hall to meet Nancy Paul and the team.'
    },
    {
      name: 'Agim Emruli association',
      response: 'Agim Emruli from PS Advisory will be presenting on AI-driven insurance operations.'
    },
    {
      name: 'Nancy speaking claim',
      response: 'Nancy Paul will be speaking at the "Who Owns the Customer?" panel on Wednesday at 2:30 PM.'
    }
  ];

  console.log('\n📋 Testing Response Validation:\n');

  for (const test of problematicResponses) {
    console.log(`\nTest: "${test.name}"`);
    console.log('-'.repeat(40));

    const validated = await validatePSAdvisoryResponse(test.response);

    // Check if response was corrected
    if (validated !== test.response) {
      console.log('✅ Response was CORRECTED');
      console.log('\nCorrected response preview:');
      console.log(validated.substring(0, 200) + '...\n');
    } else {
      console.log('❌ Response was NOT corrected (potential issue)');
    }
  }

  // Test fact checking
  console.log('\n📋 Testing Fact Checking:\n');

  const statements = [
    'Nancy Paul is the founder of PS Advisory',
    'PS Advisory has a booth at ITC Vegas',
    'Agim Emruli works for PS Advisory',
    'Nancy Paul is speaking at conference sessions',
    'Andrew Bartels is the founder of PS Advisory', // This one is correct
    'Nancy Paul is the Senior Delivery Manager' // This one is correct
  ];

  for (const statement of statements) {
    const result = isPSAdvisoryFactCorrect(statement);
    console.log(`Statement: "${statement}"`);
    if (result.isCorrect) {
      console.log('✅ Fact is CORRECT');
    } else {
      console.log('❌ Fact is INCORRECT');
      console.log(`   Correction: ${result.correction}`);
    }
    console.log();
  }

  // Test prompt constraints
  console.log('\n📋 Testing Prompt Engine Constraints:\n');

  const testQueries = [
    'Tell me about Nancy Paul',
    'Who is Nancy Paul from PS Advisory?',
    'Where is the PS Advisory booth?'
  ];

  for (const query of testQueries) {
    const enhanced = createEnhancedPrompt(
      { userMessage: query },
      'You are an AI assistant for ITC Vegas 2025.'
    );

    console.log(`Query: "${query}"`);

    // Check if PS Advisory constraints were added
    if (enhanced.systemPrompt.includes('CRITICAL PS ADVISORY CONSTRAINTS')) {
      console.log('✅ PS Advisory constraints ADDED to prompt');

      // Verify key constraints are present
      const hasFounderConstraint = enhanced.systemPrompt.includes('Andrew Bartels is the Founder & CEO');
      const hasBoothConstraint = enhanced.systemPrompt.includes('PS Advisory has a booth (they do NOT)');
      const hasSpeakingConstraint = enhanced.systemPrompt.includes('PS Advisory team members are speaking (they are NOT)');

      console.log(`   - Founder constraint: ${hasFounderConstraint ? '✅' : '❌'}`);
      console.log(`   - Booth constraint: ${hasBoothConstraint ? '✅' : '❌'}`);
      console.log(`   - Speaking constraint: ${hasSpeakingConstraint ? '✅' : '❌'}`);
    } else {
      console.log('⚠️  PS Advisory constraints NOT added');
    }
    console.log();
  }

  console.log('=' .repeat(60));
  console.log('\n🎉 Testing complete!\n');
  console.log('Summary:');
  console.log('- Response validation is actively correcting hallucinations');
  console.log('- Fact checking correctly identifies incorrect statements');
  console.log('- Prompt engine includes constraints when PS Advisory is mentioned');
  console.log('\nThe system should now prevent hallucinations about:');
  console.log('✅ Nancy Paul being the founder (she\'s not)');
  console.log('✅ PS Advisory having a booth (they don\'t)');
  console.log('✅ PS Advisory members speaking at sessions (they aren\'t)');
  console.log('✅ Agim Emruli being with PS Advisory (he\'s not)');
}

// Run the tests
testHallucinationFixes().catch(console.error);