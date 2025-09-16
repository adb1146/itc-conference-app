#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const pagesToFix = [
  'app/favorites/page.tsx',
  'app/smart-agenda/page.tsx',
  'app/agenda/simple/page.tsx',
  'app/agenda/session/[id]/page.tsx',
  'app/speakers/page.tsx',
  'app/profile/page.tsx',
  'app/agenda/intelligent/page.tsx',
  'app/search/page.tsx',
  'app/locations/page.tsx'
];

const projectRoot = path.join(__dirname, '..');

pagesToFix.forEach(filePath => {
  const fullPath = path.join(projectRoot, filePath);

  try {
    let content = fs.readFileSync(fullPath, 'utf8');

    // Remove Navigation import
    content = content.replace(/import Navigation from ['"]@\/components\/Navigation['"];\n/g, '');

    // Remove Navigation component usage
    content = content.replace(/<Navigation\s*\/>/g, '');

    fs.writeFileSync(fullPath, content);
    console.log(`✅ Fixed: ${filePath}`);
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
});

console.log('\n✨ Duplicate Navigation components removed!');
console.log('The layout.tsx already provides Navigation for all pages.');