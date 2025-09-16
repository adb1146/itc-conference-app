/**
 * Startup Validation
 * Validates environment on app startup and warns about issues
 */

let validated = false;

export function validateOnStartup() {
  // Only run once
  if (validated || process.env.NODE_ENV !== 'development') {
    return;
  }
  validated = true;

  const warnings: string[] = [];

  // Check OPENAI_API_KEY
  const openAIKey = process.env.OPENAI_API_KEY;
  if (openAIKey) {
    if (openAIKey.includes('<') || openAIKey.includes('>') || openAIKey.includes('your_actual')) {
      warnings.push('');
      warnings.push('⚠️  ENVIRONMENT VARIABLE OVERRIDE DETECTED');
      warnings.push('────────────────────────────────────────────');
      warnings.push(`OPENAI_API_KEY is set to: ${openAIKey}`);
      warnings.push('This placeholder is overriding your .env.local file!');
      warnings.push('');
      warnings.push('TO FIX:');
      warnings.push('1. Run: unset OPENAI_API_KEY');
      warnings.push('2. Check ~/.bashrc and ~/.zshrc for exports');
      warnings.push('3. Restart your dev server');
      warnings.push('────────────────────────────────────────────');
      warnings.push('');
    }
  } else if (!openAIKey) {
    warnings.push('ℹ️  OPENAI_API_KEY not set - AI will use fallback classification');
  }

  // Check AI routing
  if (process.env.ENABLE_AI_ROUTING !== 'true') {
    warnings.push('ℹ️  AI routing disabled - add ENABLE_AI_ROUTING=true to .env.local');
  }

  // Print warnings
  if (warnings.length > 0) {
    console.log('\x1b[33m'); // Yellow
    warnings.forEach(w => console.log(w));
    console.log('\x1b[0m'); // Reset
  }
}