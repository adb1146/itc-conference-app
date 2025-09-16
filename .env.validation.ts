/**
 * Environment Variable Validation
 * This file ensures env vars are loaded correctly and warns about issues
 */

const colors = {
  reset: '\x1b[0m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  green: '\x1b[32m'
};

export function validateEnvironment() {
  const issues: string[] = [];

  // Check OPENAI_API_KEY
  const openAIKey = process.env.OPENAI_API_KEY;
  if (openAIKey) {
    if (openAIKey.includes('<') || openAIKey.includes('>') || openAIKey.includes('your_actual')) {
      issues.push(`${colors.red}⚠️  OPENAI_API_KEY contains placeholder text${colors.reset}`);
      issues.push(`   Current value: ${openAIKey.substring(0, 30)}...`);
      issues.push(`   This is likely from a shell export overriding .env.local`);
      issues.push(`   Fix: Run 'unset OPENAI_API_KEY' in your terminal`);
    } else if (openAIKey.length < 40) {
      issues.push(`${colors.yellow}⚠️  OPENAI_API_KEY seems too short (${openAIKey.length} chars)${colors.reset}`);
    }
  }

  // Check for AI routing
  if (process.env.ENABLE_AI_ROUTING !== 'true') {
    issues.push(`${colors.yellow}ℹ️  AI routing is disabled (ENABLE_AI_ROUTING != true)${colors.reset}`);
  }

  // Print issues if any
  if (issues.length > 0) {
    console.log(`\n${colors.yellow}Environment Configuration Issues Detected:${colors.reset}`);
    console.log('─'.repeat(60));
    issues.forEach(issue => console.log(issue));
    console.log('─'.repeat(60));
    console.log(`Run ${colors.green}npx tsx scripts/check-env-setup.ts${colors.reset} for detailed diagnostics\n`);
  }

  return issues.length === 0;
}

// Auto-validate in development
if (process.env.NODE_ENV === 'development') {
  validateEnvironment();
}