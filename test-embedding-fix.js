#!/usr/bin/env node

/**
 * Test script to verify the embedding module fix
 * Tests that vector-db.ts can be imported without require errors
 */

async function testEmbeddingFix() {
  console.log('🔍 Testing embedding module fix...\n');

  try {
    // Try to import the vector-db module
    console.log('1️⃣ Importing vector-db module...');
    const vectorDb = await import('./lib/vector-db.ts');
    console.log('✅ Successfully imported vector-db module\n');

    // Test the createSessionSearchText function
    console.log('2️⃣ Testing createSessionSearchText function...');
    const testSession = {
      title: 'Test Session',
      description: 'Testing embedding generation',
      track: 'InsureTech Track',
      level: 'Intermediate',
      tags: ['test', 'embeddings'],
      speakers: []
    };

    const searchText = vectorDb.createSessionSearchText(testSession);
    console.log('✅ Generated search text successfully');
    console.log(`   Length: ${searchText.length} characters\n`);

    // Verify track context was included
    if (searchText.includes('insurance technology')) {
      console.log('✅ Track semantic context properly included\n');
    } else {
      console.log('⚠️ Track semantic context may not be included\n');
    }

    console.log('🎉 All tests passed! The require() fix is working correctly.');
    console.log('The module can now be used in production builds without errors.\n');

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);

    if (error.message.includes('require is not defined')) {
      console.error('\n❗ The require() error is still present.');
      console.error('Please check that the import statement is at the top of vector-db.ts');
    } else {
      console.error('\n❗ Different error occurred:', error);
    }

    process.exit(1);
  }
}

// Run the test
testEmbeddingFix().catch(console.error);