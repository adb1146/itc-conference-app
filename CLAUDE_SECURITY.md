# Claude Security Review Guidelines

## Overview

This document provides security review guidelines for Claude AI when analyzing pull requests for the ITC Conference application. Claude should follow these guidelines to ensure consistent and thorough security analysis.

## Security Review Scope

### 1. Authentication & Authorization

**Check for:**
- Missing authentication checks on protected routes
- Improper session management
- Weak password requirements
- Missing role-based access control
- JWT token validation issues
- Session fixation vulnerabilities

**Example vulnerabilities:**
```typescript
// ❌ BAD: No authentication check
export async function POST(request: Request) {
  const data = await request.json();
  await prisma.user.update({ where: { id: data.userId }, data });
}

// ✅ GOOD: Proper authentication
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // ... rest of code
}
```

### 2. Input Validation & Sanitization

**Check for:**
- Missing input validation
- XSS vulnerabilities in dynamic HTML
- SQL/NoSQL injection risks
- Command injection
- Path traversal attempts
- File upload vulnerabilities

**Example vulnerabilities:**
```typescript
// ❌ BAD: No input sanitization
<div dangerouslySetInnerHTML={{ __html: userContent }} />

// ✅ GOOD: Using DOMPurify
import DOMPurify from 'isomorphic-dompurify';
<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(userContent) }} />
```

### 3. Data Exposure

**Check for:**
- Sensitive data in responses (passwords, tokens)
- Verbose error messages
- Debug information in production
- Exposed internal IDs
- Unredacted personal information

**Example vulnerabilities:**
```typescript
// ❌ BAD: Exposing sensitive data
return { user: await prisma.user.findUnique({ where: { id } }) };

// ✅ GOOD: Excluding sensitive fields
const { password, ...safeUser } = await prisma.user.findUnique({ where: { id } });
return { user: safeUser };
```

### 4. API Security

**Check for:**
- Missing rate limiting
- CORS misconfigurations
- Missing CSRF protection
- Insecure API endpoints
- Missing API authentication
- GraphQL specific vulnerabilities

**Example vulnerabilities:**
```typescript
// ❌ BAD: No rate limiting
export async function POST(request: Request) {
  // Process request immediately
}

// ✅ GOOD: With rate limiting
import { rateLimit } from '@/lib/rate-limit';
export async function POST(request: Request) {
  const identifier = request.ip;
  const { success } = await rateLimit.check(identifier);
  if (!success) return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  // Process request
}
```

### 5. Dependency Security

**Check for:**
- Known vulnerable packages
- Outdated dependencies
- Unnecessary dependencies
- Supply chain risks
- License compliance issues

### 6. Configuration Security

**Check for:**
- Hardcoded secrets
- Insecure defaults
- Missing security headers
- Exposed environment variables
- Debug mode in production

## Severity Levels

### Critical (P0)
- Remote code execution
- Authentication bypass
- SQL injection
- Exposed credentials
- Data breach potential

### High (P1)
- XSS vulnerabilities
- CSRF vulnerabilities
- Privilege escalation
- Session hijacking
- Sensitive data exposure

### Medium (P2)
- Missing rate limiting
- Verbose error messages
- Weak password policies
- Missing security headers
- Information disclosure

### Low (P3)
- Best practice violations
- Performance issues
- Code quality concerns
- Documentation gaps

## Review Process

1. **Analyze Changed Files**: Focus on modified code, especially in:
   - `/app/api/` - API routes
   - `/lib/auth/` - Authentication logic
   - `/components/` - UI components with user input
   - `/prisma/` - Database schema and queries

2. **Check Security Patterns**: Look for common vulnerability patterns
   - Direct database queries without parameterization
   - Unvalidated user input
   - Unsafe HTML rendering
   - Missing authentication checks

3. **Verify Fixes**: For each vulnerability found:
   - Provide clear description
   - Show vulnerable code snippet
   - Suggest secure alternative
   - Reference OWASP guidelines

4. **Generate Report**: Structure findings as:
   ```markdown
   ## 🔒 Security Review Results

   ### Critical Issues (0)
   _No critical issues found_

   ### High Issues (1)

   #### 1. XSS Vulnerability in Message Component
   **File**: `components/chat/message.tsx:45`
   **Severity**: High
   **Description**: User input rendered without sanitization

   **Vulnerable Code**:
   ```typescript
   <div dangerouslySetInnerHTML={{ __html: message.content }} />
   ```

   **Recommended Fix**:
   ```typescript
   import DOMPurify from 'isomorphic-dompurify';
   <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(message.content) }} />
   ```

   **Reference**: OWASP XSS Prevention Cheat Sheet
   ```

## Special Considerations for ITC Conference App

### Vector Database Security
- Check for injection in vector search queries
- Validate embedding dimensions
- Sanitize semantic search inputs
- Verify API key handling for Pinecone/OpenAI

### Conference Data Security
- Protect speaker personal information
- Secure session/agenda data
- Validate user favorites and preferences
- Check for information leakage in search

### AI Integration Security
- Validate prompts to prevent injection
- Secure API key storage
- Rate limit AI API calls
- Sanitize AI-generated content

### Authentication Flow
- Verify NextAuth.js configuration
- Check session handling
- Validate OAuth callbacks
- Secure password reset flow

## Response Format

Always structure security review responses as:

1. **Summary**: Brief overview of findings
2. **Critical/High Issues**: Detailed breakdown with fixes
3. **Medium/Low Issues**: Grouped by category
4. **Security Score**: Overall security assessment (A-F)
5. **Next Steps**: Prioritized action items

## Review Checklist

- [ ] Authentication checks on all protected routes
- [ ] Input validation on all user inputs
- [ ] XSS prevention in all dynamic content
- [ ] SQL injection prevention in database queries
- [ ] Path traversal prevention in file operations
- [ ] Rate limiting on API endpoints
- [ ] Security headers properly configured
- [ ] Sensitive data properly protected
- [ ] Error handling doesn't leak information
- [ ] Dependencies are up-to-date and secure

## References

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/authentication)
- [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/)
- [CWE Top 25](https://cwe.mitre.org/top25/)