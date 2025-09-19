# Security Note: Data Handling and Safety Procedures

## ⚠️ CRITICAL SECURITY NOTICE

This document outlines mandatory security procedures for handling sensitive data in the ITC Conference application.

## Sensitive Data Identified and Removed

On 2025-09-18, we identified and removed the following sensitive data from the repository:

### Removed Files
- `data/exports/database-export-2025-09-12T16-21-18.json`
- `data/exports/database-export-2025-09-16T19-52-03.json`
- `data/exports/database-export-2025-09-17T21-36-04.json`
- `data/exports/latest-export.json`

### Sensitive Data Found
- **Bcrypt password hashes** (32+ instances)
- **User email addresses**
- **Personal information** (names, companies, roles)
- **Database structure** and relationships

## Data Handling Procedures

### ✅ DO
1. **Use Safe Fixtures**: Use `data/fixtures/sample-export.json` for testing
2. **Redact Sensitive Data**: Always replace real passwords with `[REDACTED]`
3. **Local-Only Exports**: Keep database exports in local directories excluded by `.gitignore`
4. **Environment Variables**: Store secrets in environment variables, not in code
5. **Regular Audits**: Run security scans before commits using pre-commit hooks

### ❌ DON'T
1. **Never commit database exports** containing real user data
2. **Never commit password hashes** of any kind (bcrypt, argon2, etc.)
3. **Never commit API keys** or authentication tokens
4. **Never commit environment files** with production secrets
5. **Never commit SSH keys** or certificates

## Safe Data Practices

### Database Exports
```bash
# ✅ GOOD: Export to excluded directory
npm run export-db > data/exports/local-$(date +%Y%m%d).json

# ❌ BAD: Export to tracked location
npm run export-db > data/sample-export.json
```

### Testing Data
- Use `data/fixtures/sample-export.json` for tests
- All passwords are marked as `[REDACTED]`
- All email addresses use `example.com` domain
- All personal data is anonymized

### Environment Configuration
```bash
# ✅ GOOD: Store in .env.local (gitignored)
DATABASE_URL="postgresql://user:pass@localhost/db"

# ❌ BAD: Store in committed files
const dbUrl = "postgresql://user:pass@localhost/db"
```

## Security Tools Implemented

### Pre-commit Hooks
- **Secret detection**: Scans for passwords, API keys, tokens
- **File validation**: Blocks large files and sensitive patterns
- **Format checking**: Ensures consistent code formatting

### GitHub Actions
- **Security scanning**: Automated vulnerability detection
- **Dependency auditing**: Checks for known security issues
- **Code analysis**: Static analysis for security patterns

### Development Tools
- **DOMPurify**: Sanitizes HTML to prevent XSS attacks
- **Path validation**: Prevents path traversal vulnerabilities
- **Input sanitization**: Validates and sanitizes user inputs

## Recovery Procedures

If sensitive data is accidentally committed:

1. **Immediate Actions**:
   ```bash
   # Remove from working directory
   rm -f path/to/sensitive/file

   # Remove from git history (if recent)
   git filter-branch --force --index-filter \
     'git rm --cached --ignore-unmatch path/to/sensitive/file' \
     --prune-empty --tag-name-filter cat -- --all
   ```

2. **Security Assessment**:
   - Identify what data was exposed
   - Determine exposure duration
   - Assess potential impact

3. **Remediation**:
   - Change exposed passwords/tokens
   - Update security documentation
   - Review access logs
   - Notify stakeholders if required

## Compliance and Reporting

### Regular Security Reviews
- Monthly security audits
- Quarterly penetration testing
- Annual compliance assessments

### Incident Reporting
Report security incidents immediately to:
- **Technical Lead**: [contact information]
- **Security Team**: [contact information]
- **Project Manager**: [contact information]

## Contact Information

For security questions or concerns:
- **Security Team**: security@itc-conference.com
- **Technical Lead**: tech-lead@itc-conference.com
- **Emergency Contact**: [24/7 contact]

---

**Last Updated**: 2025-09-18
**Next Review**: 2025-10-18
**Version**: 1.0

⚠️ **This document contains critical security procedures. All team members must read and acknowledge understanding.**