#!/usr/bin/env node

/**
 * Claude Security Review Script
 *
 * This script performs automated security reviews using the Claude API.
 * It can be run locally or as part of CI/CD pipelines.
 *
 * Usage:
 *   node scripts/claude-security-review.js [options]
 *
 * Options:
 *   --pr <number>    Review a specific PR
 *   --files <list>   Review specific files (comma-separated)
 *   --all            Review all security-critical files
 *   --diff           Review git diff (staged changes)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const https = require('https');

// Configuration
const CONFIG = {
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: 'claude-3-5-sonnet-20241022',
  maxTokens: 8192,
  temperature: 0,
  securityCriticalPaths: [
    'app/api/**/*.{ts,tsx,js,jsx}',
    'lib/auth/**/*.{ts,tsx,js,jsx}',
    'lib/security/**/*.{ts,tsx,js,jsx}',
    'components/**/*.{ts,tsx,js,jsx}',
    'prisma/schema.prisma'
  ]
};

// Security review prompt
const SECURITY_PROMPT = `You are a security expert reviewing code for vulnerabilities.
Follow the guidelines in CLAUDE_SECURITY.md for this review.

Focus on:
1. Authentication & Authorization issues
2. Input validation & sanitization
3. XSS, SQL injection, path traversal
4. Data exposure & sensitive information
5. API security & rate limiting
6. Dependency vulnerabilities

Provide findings in this format:
- Issue title and severity (Critical/High/Medium/Low)
- File and line number
- Description of vulnerability
- Recommended fix with code example
- OWASP reference if applicable`;

/**
 * Call Claude API for security review
 */
async function callClaudeAPI(content) {
  return new Promise((resolve, reject) => {
    const requestData = JSON.stringify({
      model: CONFIG.model,
      max_tokens: CONFIG.maxTokens,
      temperature: CONFIG.temperature,
      system: SECURITY_PROMPT,
      messages: [
        {
          role: 'user',
          content: `Please review the following code for security vulnerabilities:\n\n${content}`
        }
      ]
    });

    const options = {
      hostname: 'api.anthropic.com',
      path: '/v1/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CONFIG.apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Length': Buffer.byteLength(requestData)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          if (res.statusCode === 200) {
            resolve(response);
          } else {
            reject(new Error(`API Error: ${response.error?.message || 'Unknown error'}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${e.message}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(new Error(`Request failed: ${e.message}`));
    });

    req.write(requestData);
    req.end();
  });
}

/**
 * Get files to review based on command line arguments
 */
function getFilesToReview() {
  const args = process.argv.slice(2);
  const files = [];

  if (args.includes('--diff')) {
    // Review staged changes
    try {
      const diff = execSync('git diff --cached --name-only', { encoding: 'utf8' });
      files.push(...diff.split('\n').filter(f => f && isSecurityRelevant(f)));
    } catch (e) {
      console.error('Failed to get git diff:', e.message);
    }
  } else if (args.includes('--files')) {
    // Review specific files
    const fileIndex = args.indexOf('--files');
    if (fileIndex !== -1 && args[fileIndex + 1]) {
      const fileList = args[fileIndex + 1].split(',');
      files.push(...fileList.filter(f => fs.existsSync(f)));
    }
  } else if (args.includes('--all')) {
    // Review all security-critical files
    CONFIG.securityCriticalPaths.forEach(pattern => {
      try {
        const globFiles = execSync(`find . -path "${pattern}" -type f`, { encoding: 'utf8' });
        files.push(...globFiles.split('\n').filter(f => f));
      } catch (e) {
        // Ignore errors for patterns that don't match
      }
    });
  } else if (args.includes('--pr')) {
    // Review PR changes (requires GitHub CLI)
    const prIndex = args.indexOf('--pr');
    if (prIndex !== -1 && args[prIndex + 1]) {
      try {
        const prNumber = args[prIndex + 1];
        const prFiles = execSync(`gh pr view ${prNumber} --json files -q '.files[].path'`, { encoding: 'utf8' });
        files.push(...prFiles.split('\n').filter(f => f && isSecurityRelevant(f)));
      } catch (e) {
        console.error('Failed to get PR files (ensure gh CLI is installed):', e.message);
      }
    }
  }

  return [...new Set(files)]; // Remove duplicates
}

/**
 * Check if a file is security-relevant
 */
function isSecurityRelevant(filepath) {
  const relevantPatterns = [
    /\.(ts|tsx|js|jsx)$/,
    /prisma\/.*\.prisma$/,
    /\.env/,
    /auth/i,
    /security/i,
    /api\//
  ];

  return relevantPatterns.some(pattern => pattern.test(filepath));
}

/**
 * Read file content with context
 */
function readFileWithContext(filepath) {
  try {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');

    // Add line numbers for easier reference
    const numberedContent = lines.map((line, idx) =>
      `${(idx + 1).toString().padStart(4, ' ')} | ${line}`
    ).join('\n');

    return {
      path: filepath,
      content: numberedContent,
      rawContent: content
    };
  } catch (e) {
    console.error(`Failed to read ${filepath}:`, e.message);
    return null;
  }
}

/**
 * Format review results for output
 */
function formatReviewResults(results, files) {
  const timestamp = new Date().toISOString();
  let output = `# Security Review Report\n\n`;
  output += `**Generated**: ${timestamp}\n`;
  output += `**Files Reviewed**: ${files.length}\n\n`;

  if (results.length === 0) {
    output += `## ✅ No Security Issues Found\n\n`;
    output += `All reviewed files passed security checks.\n`;
  } else {
    output += `## 🔒 Security Findings\n\n`;
    results.forEach((result, idx) => {
      output += `### ${idx + 1}. ${result.file}\n\n`;
      output += result.review + '\n\n';
      output += '---\n\n';
    });
  }

  output += `\n## Files Reviewed\n\n`;
  files.forEach(file => {
    output += `- ${file}\n`;
  });

  return output;
}

/**
 * Save review results
 */
function saveResults(content, format = 'md') {
  const timestamp = Date.now();
  const outputDir = path.join(process.cwd(), 'security-reviews');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const filename = `security-review-${timestamp}.${format}`;
  const filepath = path.join(outputDir, filename);

  fs.writeFileSync(filepath, content);
  console.log(`\n📄 Review saved to: ${filepath}`);

  return filepath;
}

/**
 * Main execution
 */
async function main() {
  console.log('🔒 Claude Security Review\n');

  // Check for API key
  if (!CONFIG.apiKey) {
    console.error('❌ Error: ANTHROPIC_API_KEY environment variable not set');
    console.log('\nTo set up:');
    console.log('  export ANTHROPIC_API_KEY="your-api-key-here"');
    process.exit(1);
  }

  // Get files to review
  const files = getFilesToReview();

  if (files.length === 0) {
    console.log('No files to review. Use one of the following options:');
    console.log('  --diff           Review staged changes');
    console.log('  --files <list>   Review specific files');
    console.log('  --all            Review all security-critical files');
    console.log('  --pr <number>    Review a GitHub PR');
    process.exit(0);
  }

  console.log(`Found ${files.length} files to review:\n`);
  files.forEach(f => console.log(`  - ${f}`));
  console.log('');

  const results = [];
  const errors = [];

  // Review each file
  for (const filepath of files) {
    console.log(`Reviewing ${filepath}...`);

    const fileData = readFileWithContext(filepath);
    if (!fileData) {
      errors.push(`Failed to read: ${filepath}`);
      continue;
    }

    try {
      // Limit content size to avoid token limits
      const contentToReview = fileData.content.substring(0, 30000);

      const response = await callClaudeAPI(
        `File: ${filepath}\n\n${contentToReview}`
      );

      if (response.content && response.content[0]) {
        const review = response.content[0].text;

        // Check if issues were found
        if (review.toLowerCase().includes('critical') ||
            review.toLowerCase().includes('high') ||
            review.toLowerCase().includes('vulnerability')) {
          console.log(`  ⚠️  Security issues found`);
          results.push({ file: filepath, review });
        } else {
          console.log(`  ✅ No issues found`);
        }
      }
    } catch (e) {
      console.log(`  ❌ Review failed: ${e.message}`);
      errors.push(`${filepath}: ${e.message}`);
    }
  }

  // Generate report
  console.log('\n📊 Generating report...\n');
  const report = formatReviewResults(results, files);

  // Display summary
  console.log('=' .repeat(50));
  console.log('SECURITY REVIEW SUMMARY');
  console.log('='.repeat(50));
  console.log(`Files reviewed: ${files.length}`);
  console.log(`Issues found: ${results.length}`);
  console.log(`Errors: ${errors.length}`);

  if (results.length > 0) {
    console.log('\n⚠️  Security issues detected!');
    console.log('Please review the findings and address them before merging.');
  } else {
    console.log('\n✅ All files passed security review!');
  }

  // Save report
  const reportPath = saveResults(report);

  // Exit with appropriate code
  process.exit(results.length > 0 ? 1 : 0);
}

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}

module.exports = { callClaudeAPI, getFilesToReview, formatReviewResults };