/**
 * Test API Keys Configuration
 */

const { config } = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
config({ path: path.resolve(__dirname, '../.env.local') });

console.log('🔍 Testing API Keys Configuration...\n');

// Check Pinecone API Key
const pineconeKey = process.env.PINECONE_API_KEY;
if (pineconeKey) {
  console.log('✅ PINECONE_API_KEY is set');
  console.log(`   First 10 chars: ${pineconeKey.substring(0, 10)}...`);
  console.log(`   Length: ${pineconeKey.length} characters`);
} else {
  console.log('❌ PINECONE_API_KEY is NOT set');
}

// Check OpenAI API Key
const openaiKey = process.env.OPENAI_API_KEY;
if (openaiKey) {
  console.log('\n✅ OPENAI_API_KEY is set');
  console.log(`   First 10 chars: ${openaiKey.substring(0, 10)}...`);
  console.log(`   Length: ${openaiKey.length} characters`);
} else {
  console.log('\n❌ OPENAI_API_KEY is NOT set');
}

// Check Anthropic API Key (for reference)
const anthropicKey = process.env.ANTHROPIC_API_KEY;
if (anthropicKey) {
  console.log('\n✅ ANTHROPIC_API_KEY is set');
  console.log(`   First 10 chars: ${anthropicKey.substring(0, 10)}...`);
} else {
  console.log('\n❌ ANTHROPIC_API_KEY is NOT set');
}

console.log('\n📝 Instructions if keys are invalid:');
console.log('1. For Pinecone: Sign up at https://www.pinecone.io');
console.log('   - Create a new project');
console.log('   - Go to API Keys section');
console.log('   - Copy the default API key');
console.log('   - Replace PINECONE_API_KEY in .env.local');
console.log('\n2. For OpenAI: Sign up at https://platform.openai.com');
console.log('   - Go to API Keys section');
console.log('   - Create a new secret key');
console.log('   - Replace OPENAI_API_KEY in .env.local');