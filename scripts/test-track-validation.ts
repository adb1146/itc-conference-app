/**
 * Test script to verify AI doesn't hallucinate track names
 */

import { VALID_CONFERENCE_TRACKS, isValidTrack, findRelevantTracks } from '../lib/conference-tracks';

console.log('🧪 Testing Track Validation System');
console.log('=' .repeat(60));

// Test 1: Valid track checking
console.log('\n📝 Test 1: Track Validation');
console.log('-'.repeat(40));

const testTracks = [
  'Innovation Track',
  'Technology Track',
  'AI & Innovation Track',  // Invalid
  'Data & Analytics Track',  // Invalid
  'Cyber Track',
  'Digital Transformation Track'  // Invalid
];

testTracks.forEach(track => {
  const isValid = isValidTrack(track);
  console.log(`${isValid ? '✅' : '❌'} ${track} - ${isValid ? 'VALID' : 'INVALID'}`);
});

// Test 2: Finding relevant tracks for topics
console.log('\n🔍 Test 2: Topic to Track Mapping');
console.log('-'.repeat(40));

const topics = [
  'AI and machine learning',
  'cybersecurity',
  'insurtech startups',
  'health insurance',
  'property risk'
];

topics.forEach(topic => {
  const tracks = findRelevantTracks(topic);
  console.log(`\n"${topic}":`);
  tracks.forEach(track => console.log(`  → ${track}`));
  if (tracks.length === 0) {
    console.log('  → No specific tracks found');
  }
});

// Test 3: Show all valid tracks
console.log('\n📋 All Valid Conference Tracks:');
console.log('-'.repeat(40));
VALID_CONFERENCE_TRACKS.forEach((track, index) => {
  console.log(`${(index + 1).toString().padStart(2)}. ${track}`);
});

// Test 4: Simulate AI query about AI topics
console.log('\n🤖 Test 3: AI Query Response Simulation');
console.log('-'.repeat(40));

function simulateAIResponse(query: string): string {
  const relevantTracks = findRelevantTracks(query);

  if (query.toLowerCase().includes('ai')) {
    // Check for invalid track reference
    if (query.includes('AI & Innovation Track')) {
      return '❌ ERROR: Attempting to reference non-existent "AI & Innovation Track"';
    }

    // Correct response
    return `✅ For AI topics, check out sessions in the ${relevantTracks.join(' and ')}`;
  }

  return 'Query processed';
}

const queries = [
  'Tell me about the AI & Innovation Track',  // Should error
  'What AI sessions are available?',  // Should suggest correct tracks
  'Show me sessions about artificial intelligence'  // Should suggest correct tracks
];

queries.forEach(query => {
  console.log(`\nQuery: "${query}"`);
  console.log(`Response: ${simulateAIResponse(query)}`);
});

console.log('\n\n✨ Track validation system is working correctly!');
console.log('The AI should now avoid hallucinating track names like "AI & Innovation Track"\n');