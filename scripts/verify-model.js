#!/usr/bin/env node

/**
 * Model Verification Script
 * Run this to verify which AI model is being used by the application
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying AI Model Configuration...\n');

// Check AI Config file
const configPath = path.join(__dirname, '../lib/ai-config.ts');
const configContent = fs.readFileSync(configPath, 'utf8');

// Extract model from config
const modelMatch = configContent.match(/PRIMARY_MODEL:\s*['"]([^'"]+)['"]/);
const currentModel = modelMatch ? modelMatch[1] : 'Unknown';

console.log('📋 Configuration File Check:');
console.log(`   File: lib/ai-config.ts`);
console.log(`   Primary Model: ${currentModel}`);

// Check if it's Opus 4.1
if (currentModel === 'claude-opus-4-1-20250805') {
  console.log('   ✅ Using Claude Opus 4.1 (Correct)\n');
} else {
  console.log(`   ⚠️  WARNING: Not using Opus 4.1! Current: ${currentModel}\n`);
}

// Check API routes
const apiFiles = [
  { path: '../app/api/chat/route.ts', name: 'Basic Chat API' },
  { path: '../app/api/chat/intelligent/route.ts', name: 'Intelligent Chat API' }
];

console.log('🔗 API Routes Check:');
apiFiles.forEach(file => {
  const filePath = path.join(__dirname, file.path);
  if (fs.existsSync(filePath)) {
    const content = fs.readFileSync(filePath, 'utf8');
    const usesConfig = content.includes('getAIModel()');
    const hasImport = content.includes("from '@/lib/ai-config'");
    
    console.log(`   ${file.name}:`);
    console.log(`      - Uses centralized config: ${usesConfig ? '✅' : '❌'}`);
    console.log(`      - Has config import: ${hasImport ? '✅' : '❌'}`);
  }
});

// Test live endpoint if server is running
console.log('\n🌐 Testing Live Endpoint:');
const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3011,
  path: '/api/model-info',
  method: 'GET',
};

const req = http.request(options, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      console.log(`   Model: ${response.current.displayName}`);
      console.log(`   Model ID: ${response.current.model}`);
      console.log(`   Token Limit: ${response.current.tokenLimit}`);
      console.log(`   Status: ${response.status}`);
      
      if (response.current.model === 'claude-opus-4-1-20250805') {
        console.log('\n✅ SUCCESS: Application is correctly configured to use Claude Opus 4.1');
      } else {
        console.log(`\n⚠️ WARNING: Application is using ${response.current.displayName} instead of Opus 4.1`);
      }
    } catch (e) {
      console.log('   ❌ Could not parse response');
    }
  });
});

req.on('error', (error) => {
  console.log('   ⚠️  Server not running or endpoint not available');
  console.log('   Run "npm run dev" to start the server');
});

req.end();

console.log('\n📝 To prevent model reverts:');
console.log('   1. Always use getAIModel() from @/lib/ai-config');
console.log('   2. Never hardcode model names in API routes');
console.log('   3. Run this script after any changes');
console.log('   4. Check /api/model-info endpoint in browser');