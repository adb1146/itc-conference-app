#!/usr/bin/env npx tsx
/**
 * Environment Setup Checker
 * Run this to verify your environment is correctly configured
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
  bold: '\x1b[1m'
};

interface EnvCheck {
  name: string;
  check: () => { passed: boolean; message: string; fix?: string };
}

const checks: EnvCheck[] = [
  {
    name: 'Shell Environment Variables',
    check: () => {
      const shellOpenAI = process.env.OPENAI_API_KEY;
      if (!shellOpenAI) {
        return { passed: true, message: 'No shell override detected' };
      }
      if (shellOpenAI.includes('<') || shellOpenAI.includes('>') || shellOpenAI.includes('your_actual')) {
        return {
          passed: false,
          message: `Shell has placeholder: ${shellOpenAI}`,
          fix: 'Remove or comment out OPENAI_API_KEY from your shell profile (.bashrc/.zshrc)'
        };
      }
      return {
        passed: false,
        message: 'Shell has OPENAI_API_KEY set (may override .env.local)',
        fix: 'Consider removing OPENAI_API_KEY from shell to let .env.local take precedence'
      };
    }
  },
  {
    name: '.env.local File',
    check: () => {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (!fs.existsSync(envPath)) {
        return {
          passed: false,
          message: '.env.local file not found',
          fix: 'Copy .env.example to .env.local and fill in your API keys'
        };
      }

      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      const openAILine = lines.find(line => line.startsWith('OPENAI_API_KEY='));

      if (!openAILine) {
        return {
          passed: false,
          message: 'OPENAI_API_KEY not found in .env.local',
          fix: 'Add OPENAI_API_KEY=your-key to .env.local'
        };
      }

      const key = openAILine.split('=')[1]?.trim();
      if (!key || key.includes('<') || key.includes('xxxxx') || key.length < 40) {
        return {
          passed: false,
          message: 'OPENAI_API_KEY appears to be a placeholder',
          fix: 'Replace with your actual OpenAI API key from https://platform.openai.com/api-keys'
        };
      }

      return { passed: true, message: `Valid key found (${key.substring(0, 20)}...)` };
    }
  },
  {
    name: 'AI Routing Configuration',
    check: () => {
      const envPath = path.resolve(process.cwd(), '.env.local');
      if (!fs.existsSync(envPath)) {
        return { passed: false, message: '.env.local not found' };
      }

      const content = fs.readFileSync(envPath, 'utf-8');
      const hasAIRouting = content.includes('ENABLE_AI_ROUTING=true');

      if (!hasAIRouting) {
        return {
          passed: false,
          message: 'AI routing not enabled',
          fix: 'Add ENABLE_AI_ROUTING=true to .env.local'
        };
      }

      return { passed: true, message: 'AI routing is enabled' };
    }
  },
  {
    name: 'No Conflicting .env Files',
    check: () => {
      const envFile = path.resolve(process.cwd(), '.env');
      if (fs.existsSync(envFile)) {
        const content = fs.readFileSync(envFile, 'utf-8');
        if (content.includes('OPENAI_API_KEY')) {
          return {
            passed: false,
            message: '.env file exists and may conflict with .env.local',
            fix: 'Remove OPENAI_API_KEY from .env or delete .env file'
          };
        }
      }
      return { passed: true, message: 'No conflicting .env files' };
    }
  },
  {
    name: 'Shell Profile Check',
    check: () => {
      const homeDir = process.env.HOME || process.env.USERPROFILE || '';
      const profiles = ['.bashrc', '.zshrc', '.bash_profile', '.profile'];
      const issues: string[] = [];

      for (const profile of profiles) {
        const profilePath = path.join(homeDir, profile);
        if (fs.existsSync(profilePath)) {
          const content = fs.readFileSync(profilePath, 'utf-8');
          if (content.includes('export OPENAI_API_KEY')) {
            const lines = content.split('\n');
            const lineNum = lines.findIndex(l => l.includes('export OPENAI_API_KEY')) + 1;
            issues.push(`${profile} (line ~${lineNum})`);
          }
        }
      }

      if (issues.length > 0) {
        return {
          passed: false,
          message: `Found exports in: ${issues.join(', ')}`,
          fix: `Comment out or remove OPENAI_API_KEY exports from these files`
        };
      }

      return { passed: true, message: 'No OPENAI_API_KEY exports in shell profiles' };
    }
  }
];

async function runChecks() {
  console.log(`\n${colors.blue}${colors.bold}Environment Setup Checker${colors.reset}`);
  console.log(`${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  let allPassed = true;
  const results: Array<{ name: string; passed: boolean; message: string; fix?: string }> = [];

  for (const check of checks) {
    process.stdout.write(`Checking ${check.name}... `);
    const result = check.check();
    results.push({ name: check.name, ...result });

    if (result.passed) {
      console.log(`${colors.green}✓${colors.reset}`);
    } else {
      console.log(`${colors.red}✗${colors.reset}`);
      allPassed = false;
    }
  }

  console.log(`\n${colors.blue}Results:${colors.reset}`);
  console.log(`${colors.gray}${'─'.repeat(60)}${colors.reset}`);

  for (const result of results) {
    const icon = result.passed ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    console.log(`${icon} ${result.name}`);
    console.log(`  ${colors.gray}${result.message}${colors.reset}`);
    if (result.fix) {
      console.log(`  ${colors.yellow}Fix: ${result.fix}${colors.reset}`);
    }
  }

  console.log(`\n${colors.blue}${'─'.repeat(60)}${colors.reset}`);

  if (allPassed) {
    console.log(`${colors.green}${colors.bold}✅ All checks passed! Your environment is properly configured.${colors.reset}`);
  } else {
    console.log(`${colors.yellow}${colors.bold}⚠️  Some issues found. Fix them to ensure proper operation.${colors.reset}`);

    console.log(`\n${colors.blue}Quick Fix Commands:${colors.reset}`);
    console.log(`${colors.gray}1. Remove shell override:${colors.reset}`);
    console.log(`   unset OPENAI_API_KEY`);
    console.log(`${colors.gray}2. Check your shell profile:${colors.reset}`);
    console.log(`   grep "OPENAI_API_KEY" ~/.zshrc ~/.bashrc 2>/dev/null`);
    console.log(`${colors.gray}3. Restart your dev server after fixes:${colors.reset}`);
    console.log(`   npm run dev`);
  }

  console.log(`\n${colors.blue}${'='.repeat(60)}${colors.reset}\n`);

  return allPassed;
}

// Run the checks
runChecks().then(passed => {
  process.exit(passed ? 0 : 1);
});