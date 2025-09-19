# Contributing to ITC Conference App

Welcome to the ITC Conference App! We're excited to have you contribute to this project. Please follow these guidelines to ensure a smooth and secure development process.

## 🔒 Security Guidelines

### Critical Security Requirements

**BEFORE MAKING ANY COMMITS**, please review our [SECURITY_NOTE.md](./SECURITY_NOTE.md) document. It contains mandatory procedures for handling sensitive data.

#### Pre-Commit Security Checks

Our pre-commit hooks automatically scan for:
- **Password hashes** (bcrypt, argon2, etc.)
- **API keys and tokens**
- **Database connection strings**
- **Large files** that might contain data dumps
- **Sensitive file patterns** (.sql, .dump, .backup, etc.)

#### What You MUST NOT Commit

❌ **NEVER commit these items:**
- Database exports with real user data
- Password hashes of any kind
- API keys or authentication tokens
- Environment files with production secrets
- SSH keys or certificates
- Large data dumps or backups

#### Safe Development Practices

✅ **DO:**
- Use `data/fixtures/sample-export.json` for testing
- Store secrets in `.env.local` (gitignored)
- Use `[REDACTED]` for password fields in test data
- Run security scans before pushing
- Review the security checklist below

### Security Checklist

Before submitting a PR, ensure:

- [ ] No real password hashes in any files
- [ ] No hardcoded API keys or secrets
- [ ] No database exports with real data
- [ ] All test data uses anonymized information
- [ ] Large files (>1MB) are justified and don't contain sensitive data
- [ ] Environment variables are properly configured
- [ ] Security tests pass locally

## 🏗️ Development Guidelines

### Architecture

We're actively refactoring to follow clean architecture principles. Please consult:

1. **[ARCHITECTURE_REDESIGN.md](./ARCHITECTURE_REDESIGN.md)** - Complete redesign blueprint
2. **[LESSONS_LEARNED.md](./LESSONS_LEARNED.md)** - Critical debugging insights

### Code Organization

```
src/
├── api/routes/          # Thin route handlers only
├── application/services/ # Business logic services
├── domain/             # Core business entities
└── infrastructure/     # External integrations
```

### Development Workflow

1. **Fork the repository**
2. **Create a feature branch** from `develop`
3. **Review security guidelines** in SECURITY_NOTE.md
4. **Implement your changes** following architecture patterns
5. **Write tests** for new functionality
6. **Run security checks** locally
7. **Submit a pull request**

## 🧪 Testing

### Running Tests

```bash
# Run all tests
npm test

# Run security tests
npm run test:security

# Run with coverage
npm run test:coverage
```

### Test Requirements

- **Unit tests** for new services and utilities
- **Integration tests** for API endpoints
- **Security tests** for sensitive operations
- **90% coverage target** for new code

## 🔧 Development Setup

### Prerequisites

- Node.js 18+
- npm 9+
- PostgreSQL 14+

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone [repository-url]
   cd itc-conference-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Set up database**
   ```bash
   npm run db:setup
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

### Pre-commit Setup

Pre-commit hooks are automatically installed with Husky. They will:
- Scan for secrets and sensitive data
- Check file sizes and patterns
- Run linting and type checking
- Validate security requirements

## 📋 Pull Request Guidelines

### PR Requirements

- [ ] Descriptive title and description
- [ ] Reference related issues
- [ ] Include screenshots for UI changes
- [ ] Pass all security checks
- [ ] Include appropriate tests
- [ ] Update documentation if needed
- [ ] Follow code style guidelines

### PR Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Security fix

## Security Checklist
- [ ] No sensitive data in commits
- [ ] Security tests pass
- [ ] No new security vulnerabilities
- [ ] Followed security guidelines

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests pass
- [ ] Manual testing completed

## Documentation
- [ ] Code comments updated
- [ ] Documentation updated
- [ ] Architecture docs updated if needed
```

## 🛡️ Security Incident Response

If you discover a security vulnerability:

1. **DO NOT** create a public issue
2. **Email security team** immediately: security@itc-conference.com
3. **Provide details** about the vulnerability
4. **Wait for response** before disclosing publicly

## 🎯 Code Style

### TypeScript/JavaScript

- Use TypeScript for all new code
- Follow ESLint configuration
- Use Prettier for formatting
- Include JSDoc comments for public APIs

### React Components

- Use functional components with hooks
- Implement proper error boundaries
- Sanitize user inputs (use DOMPurify)
- Follow accessibility guidelines

### API Design

- Use RESTful conventions
- Implement proper error handling
- Include input validation
- Add rate limiting for public endpoints
- Use dependency injection for testability

## 🔍 Code Review Process

### For Contributors

1. **Self-review** your changes
2. **Test thoroughly** on multiple scenarios
3. **Check security implications** of your changes
4. **Update documentation** as needed

### For Reviewers

1. **Check security aspects** first
2. **Verify architecture compliance**
3. **Test the changes** locally
4. **Provide constructive feedback**
5. **Approve only when confident**

## 📚 Resources

### Documentation

- [Architecture Redesign](./ARCHITECTURE_REDESIGN.md)
- [Security Guidelines](./SECURITY_NOTE.md)
- [Lessons Learned](./LESSONS_LEARNED.md)
- [AI Tools Guidelines](./AI_TOOLS_GUIDELINES.md)

### Tools

- [GitHub Issues](../../issues) - Bug reports and feature requests
- [GitHub Projects](../../projects) - Development roadmap
- [Security Dashboard](../../security) - Vulnerability tracking

## 🤝 Community

### Getting Help

- **Technical questions**: Create a GitHub issue
- **Security concerns**: Email security@itc-conference.com
- **General discussion**: Use GitHub Discussions

### Code of Conduct

We follow a standard code of conduct:
- Be respectful and inclusive
- Focus on constructive feedback
- Maintain professional communication
- Prioritize security and user safety

## 📖 License

By contributing to this project, you agree that your contributions will be licensed under the same license as the project.

---

**Thank you for contributing to ITC Conference App!** 🎉

Your contributions help make this project better and more secure for everyone.