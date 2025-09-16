#!/usr/bin/env npx tsx

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const key = process.env.OPENAI_API_KEY;

console.log('Raw key:', key);
console.log('Key length:', key?.length);
console.log('First 30 chars:', key?.substring(0, 30));
console.log('Last 30 chars:', key?.substring(key.length - 30));
console.log('Contains <:', key?.includes('<'));
console.log('Contains >:', key?.includes('>'));

// Check for invisible characters
if (key) {
  for (let i = 0; i < key.length; i++) {
    const char = key[i];
    const code = char.charCodeAt(0);
    if (code < 32 || code > 126) {
      console.log(`Non-printable character at position ${i}: code ${code}`);
    }
  }
}