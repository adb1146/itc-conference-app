/**
 * Test script for interactive preference selector
 * Tests the flow of preference collection and agenda building
 */

import { getPreferenceOptions } from '../lib/tools/schedule/guest-agenda-builder';

// Test the preference options structure
console.log('🧪 Testing Interactive Preference Selector\n');
console.log('=' .repeat(80));

const options = getPreferenceOptions();

// Group options by category
const grouped = options.reduce((acc, option) => {
  if (!acc[option.category]) {
    acc[option.category] = [];
  }
  acc[option.category].push(option);
  return acc;
}, {} as Record<string, typeof options>);

console.log('\n📋 Available Preference Options:\n');

// Display grouped options
Object.entries(grouped).forEach(([category, items]) => {
  const categoryLabels = {
    interest: '🎯 Topics of Interest',
    role: '👤 Your Role',
    focus: '📚 Session Focus',
    days: '📅 Conference Days'
  };

  console.log(`${categoryLabels[category as keyof typeof categoryLabels]}:`);
  items.forEach(item => {
    console.log(`  • ${item.label} (${item.id}): "${item.value}"`);
  });
  console.log();
});

// Simulate user selections
const simulatedSelections = [
  options.find(o => o.id === 'ai'),
  options.find(o => o.id === 'cyber'),
  options.find(o => o.id === 'technical'),
  options.find(o => o.id === 'technical_sessions'),
  options.find(o => o.id === 'business_sessions'),
  options.find(o => o.id === 'day1'),
  options.find(o => o.id === 'day2'),
  options.find(o => o.id === 'day3')
].filter(Boolean);

console.log('🎮 Simulated User Selections:\n');
simulatedSelections.forEach(selection => {
  if (selection) {
    console.log(`  ✓ ${selection.label} (${selection.category})`);
  }
});

// Generate prompt from selections
function generatePromptFromSelections(selections: typeof options): string {
  const interests = selections.filter(opt => opt.category === 'interest');
  const roles = selections.filter(opt => opt.category === 'role');
  const focus = selections.filter(opt => opt.category === 'focus');
  const days = selections.filter(opt => opt.category === 'days');

  let prompt = "I'm ";

  // Add role
  if (roles.length > 0) {
    prompt += `a ${roles.map(r => r.value).join(' and ')}`;
  }

  // Add interests
  if (interests.length > 0) {
    if (roles.length > 0) prompt += ' interested in ';
    else prompt += 'interested in ';

    if (interests.length === 1) {
      prompt += interests[0].value;
    } else if (interests.length === 2) {
      prompt += `${interests[0].value} and ${interests[1].value}`;
    } else {
      const lastInterest = interests[interests.length - 1];
      const otherInterests = interests.slice(0, -1);
      prompt += `${otherInterests.map(i => i.value).join(', ')}, and ${lastInterest.value}`;
    }
  }

  // Add focus preference
  if (focus.length > 0) {
    prompt += '. I\'m looking for ';
    prompt += focus.map(f => f.value).join(' and ');
  }

  // Add days
  if (days.length > 0) {
    prompt += '. I\'m attending ';
    if (days.length === 3) {
      prompt += 'all three days';
    } else {
      prompt += days.map(d => d.value).join(' and ');
    }
  }

  prompt += '. Build me a personalized agenda.';

  return prompt;
}

const generatedPrompt = generatePromptFromSelections(simulatedSelections as any);

console.log('\n💬 Generated Prompt:\n');
console.log(`"${generatedPrompt}"`);

console.log('\n✅ Expected Flow:\n');
console.log('1. User asks for agenda: "Build me an agenda"');
console.log('2. AI responds with preference questions and interactive selector');
console.log('3. User clicks on multiple preference options');
console.log('4. System generates a natural language prompt from selections');
console.log('5. Prompt is auto-filled in the input field');
console.log('6. User can edit the prompt if desired');
console.log('7. User clicks Send to submit preferences');
console.log('8. AI processes the prompt and builds personalized agenda');

console.log('\n🎯 Key Features:\n');
console.log('• Multiple selections allowed across categories');
console.log('• Real-time prompt generation as selections change');
console.log('• Editable prompt before submission');
console.log('• Visual feedback for selected options');
console.log('• Mobile-responsive design');

console.log('\n' + '='.repeat(80));
console.log('✅ Interactive Preference Selector Ready for Testing!');