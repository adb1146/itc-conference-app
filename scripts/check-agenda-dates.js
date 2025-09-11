const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAgendaDates() {
  console.log('=== CHECKING AGENDA DATES ===\n');
  
  // Get all sessions
  const sessions = await prisma.session.findMany({
    select: {
      id: true,
      title: true,
      startTime: true,
      endTime: true,
      tags: true,
      location: true
    },
    orderBy: { startTime: 'asc' }
  });
  
  // Group by date
  const dayGroups = {};
  sessions.forEach(s => {
    // Extract date from startTime
    const date = new Date(s.startTime);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });
    const shortDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    if (!dayGroups[dateStr]) {
      dayGroups[dateStr] = { 
        count: 0,
        dayOfWeek: dayOfWeek,
        shortDate: shortDate,
        samples: [],
        tags: new Set(),
        dayNum: null
      };
    }
    dayGroups[dateStr].count++;
    
    // Check tags for day info
    if (s.tags && Array.isArray(s.tags)) {
      s.tags.forEach(tag => {
        if (tag.includes('day') || tag.includes('Day')) {
          dayGroups[dateStr].tags.add(tag);
          // Extract day number from tag
          const dayMatch = tag.match(/day(\d+)/i);
          if (dayMatch) {
            dayGroups[dateStr].dayNum = parseInt(dayMatch[1]);
          }
        }
      });
    }
    
    if (dayGroups[dateStr].samples.length < 3) {
      dayGroups[dateStr].samples.push({
        title: s.title,
        time: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        location: s.location
      });
    }
  });
  
  // Display grouped data
  console.log('=== SESSIONS BY DATE ===');
  Object.keys(dayGroups).sort().forEach(dateStr => {
    const group = dayGroups[dateStr];
    console.log(`\n${dateStr}:`);
    console.log(`  Day of week: ${group.dayOfWeek}`);
    console.log(`  Total sessions: ${group.count}`);
    
    const tags = Array.from(group.tags);
    console.log(`  Day tags found: ${tags.length > 0 ? tags.join(', ') : 'None'}`);
    if (group.dayNum) {
      console.log(`  Day number from tags: Day ${group.dayNum}`);
    }
    
    console.log('  Sample sessions:');
    group.samples.forEach(s => {
      console.log(`    - "${s.title.substring(0, 50)}..." at ${s.time}`);
      console.log(`      Location: ${s.location}`);
    });
  });
  
  // Check for Monday issues
  console.log('\n=== CHECKING FOR MONDAY ISSUES ===');
  
  const mondaySessions = sessions.filter(s => {
    const date = new Date(s.startTime);
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday
    return dayOfWeek === 1;
  });
  
  if (mondaySessions.length > 0) {
    console.log(`\n⚠️  FOUND ${mondaySessions.length} SESSIONS ON MONDAY:`);
    mondaySessions.slice(0, 5).forEach(s => {
      const date = new Date(s.startTime);
      console.log(`  - "${s.title}"`);
      console.log(`    Date: ${date.toLocaleDateString('en-US')}`);
      console.log(`    Time: ${date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`);
      console.log(`    Tags: ${s.tags ? s.tags.filter(t => t.includes('day')).join(', ') : 'none'}`);
    });
  } else {
    console.log('✓ No sessions scheduled on Monday');
  }
  
  // ITC Vegas 2025 is October 15-17 (Tuesday-Thursday)
  console.log('\n=== EXPECTED VS ACTUAL ===');
  console.log('ITC Vegas 2025 runs October 15-17, 2025');
  console.log('  - Day 1 should be: Tuesday, October 15, 2025');
  console.log('  - Day 2 should be: Wednesday, October 16, 2025'); 
  console.log('  - Day 3 should be: Thursday, October 17, 2025');
  console.log('  - There should be NO Monday, October 14 sessions');
  
  // Check which dates we actually have
  console.log('\n=== ACTUAL DATES IN DATABASE ===');
  const uniqueDates = new Set();
  sessions.forEach(s => {
    const date = new Date(s.startTime);
    const dateStr = date.toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
    uniqueDates.add(dateStr);
  });
  
  Array.from(uniqueDates).sort().forEach(date => {
    const isMonday = date.includes('Monday');
    const isCorrect = date.includes('October 15') || 
                     date.includes('October 16') || 
                     date.includes('October 17');
    
    if (isMonday) {
      console.log(`  ❌ ${date} - INCORRECT (Monday should not have sessions)`);
    } else if (isCorrect) {
      console.log(`  ✓ ${date} - Correct`);
    } else {
      console.log(`  ⚠️  ${date} - Unexpected date`);
    }
  });
  
  await prisma.$disconnect();
}

checkAgendaDates().catch(console.error);