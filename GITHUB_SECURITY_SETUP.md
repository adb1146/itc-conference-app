# GitHub Security Review Setup Guide

## Overview

This guide walks you through setting up automated Claude security reviews for GitHub pull requests in the ITC Conference application.

## Prerequisites

- GitHub repository admin access
- Anthropic API key with Claude access
- GitHub CLI (`gh`) installed locally (optional, for testing)

## Setup Steps

### 1. Obtain Anthropic API Key

1. Visit [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key with the following permissions:
   - Claude API access
   - Model: claude-3-5-sonnet-20241022
5. Copy the API key (starts with `sk-ant-api...`)

### 2. Add GitHub Secrets

Add the following secrets to your GitHub repository:

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add these secrets:

#### Required Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `ANTHROPIC_API_KEY` | Your Anthropic API key | `sk-ant-api03-...` |
| `GITHUB_TOKEN` | Auto-provided by GitHub Actions | (automatic) |

#### Optional Secrets

| Secret Name | Description | Example Value |
|------------|-------------|---------------|
| `SEMGREP_APP_TOKEN` | Semgrep Cloud token for enhanced scanning | `sem_...` |
| `SLACK_WEBHOOK_URL` | Slack webhook for notifications | `https://hooks.slack.com/...` |

### 3. Configure Workflow Permissions

1. Go to **Settings** → **Actions** → **General**
2. Under **Workflow permissions**, select:
   - ✅ Read and write permissions
   - ✅ Allow GitHub Actions to create and approve pull requests

### 4. Enable GitHub Actions

1. Go to **Actions** tab in your repository
2. If Actions are disabled, click **Enable Actions**
3. The workflows will automatically appear once pushed to the repository

## Testing the Setup

### Local Testing

Test the security review script locally:

```bash
# Make the script executable
chmod +x scripts/claude-security-review.js

# Set your API key (temporary, for testing only)
export ANTHROPIC_API_KEY="your-api-key-here"

# Test with staged changes
git add .
node scripts/claude-security-review.js --diff

# Test specific files
node scripts/claude-security-review.js --files "app/api/auth/route.ts,lib/security.ts"

# Test all security-critical files
node scripts/claude-security-review.js --all
```

### GitHub Actions Testing

1. Create a test branch:
```bash
git checkout -b test-security-review
```

2. Make a small change to trigger the workflow:
```bash
echo "// Test security review" >> app/page.tsx
git add app/page.tsx
git commit -m "Test: Security review workflow"
git push origin test-security-review
```

3. Create a pull request
4. Watch the Actions tab to see the security review running
5. Check the PR comments for the security review results

## Workflow Triggers

The security reviews are triggered by:

### Pull Request Reviews (`claude-security-review.yml`)
- Triggers on: PR opened, synchronized, reopened
- Reviews only changed files
- Posts results as PR comment
- Blocks merge if critical issues found

### Comprehensive Security (`security.yml`)
- Triggers on:
  - Push to main/develop branches
  - Pull requests to main/develop
  - Daily at 2 AM UTC
  - Manual trigger (workflow_dispatch)
- Runs multiple security tools:
  - TruffleHog (secret detection)
  - Semgrep (SAST analysis)
  - NPM audit (dependency check)
  - Claude AI review

## Customization

### Adjust Review Sensitivity

Edit `.github/workflows/claude-security-review.yml`:

```yaml
system_prompt: |
  # Add custom rules here
  Focus on your specific security concerns...
```

### Change File Patterns

Edit the `paths` section to review different files:

```yaml
paths:
  - '**.js'
  - '**.ts'
  - 'your/custom/path/**'
```

### Modify Severity Thresholds

To change when builds fail, edit:

```yaml
- name: Check for Critical Issues
  if: contains(env.CLAUDE_REVIEW_OUTPUT, 'Critical')
  run: exit 1  # Fail the build
```

## Security Best Practices

### API Key Security

1. **Never commit API keys** to the repository
2. **Rotate keys regularly** (every 90 days recommended)
3. **Use least privilege** - create keys with minimal required permissions
4. **Monitor usage** in the Anthropic Console

### Workflow Security

1. **Limit workflow permissions** to minimum required
2. **Review third-party actions** before using
3. **Pin action versions** to specific commits
4. **Enable branch protection** to require reviews

### Cost Management

1. **Monitor API usage** in Anthropic Console
2. **Set up billing alerts** for unexpected usage
3. **Consider rate limiting** for large repositories
4. **Cache common reviews** to reduce API calls

## Troubleshooting

### Common Issues

#### 1. Workflow Not Triggering
- Check workflow file syntax
- Verify file is in `.github/workflows/`
- Ensure Actions are enabled in repository settings

#### 2. API Key Not Working
```
Error: API Error: Invalid authentication
```
- Verify secret name is exactly `ANTHROPIC_API_KEY`
- Check key hasn't expired
- Ensure key has proper permissions

#### 3. PR Comments Not Appearing
```
Error: Resource not accessible by integration
```
- Check workflow has `pull-requests: write` permission
- Verify GITHUB_TOKEN is available

#### 4. Rate Limiting
```
Error: API Error: Rate limit exceeded
```
- Implement caching for common reviews
- Reduce review frequency
- Consider upgrading API plan

### Debug Mode

Enable debug logging:

```yaml
env:
  ACTIONS_RUNNER_DEBUG: true
  ACTIONS_STEP_DEBUG: true
```

### Manual Workflow Run

1. Go to **Actions** tab
2. Select the workflow
3. Click **Run workflow**
4. Choose branch and parameters
5. Click **Run workflow** button

## Monitoring & Alerts

### Set Up Notifications

1. **Slack Integration**:
```yaml
- name: Notify Slack
  if: failure()
  uses: slack-notify@v1
  with:
    webhook_url: ${{ secrets.SLACK_WEBHOOK_URL }}
    message: "Security review failed on PR #${{ github.event.number }}"
```

2. **Email Notifications**:
- Go to **Settings** → **Notifications**
- Configure email alerts for workflow failures

### Review Metrics

Track security review effectiveness:

1. Check **Actions** → **Security** tab for trends
2. Monitor time to resolution for security issues
3. Track false positive rate
4. Measure coverage of security reviews

## Maintenance

### Regular Tasks

- **Weekly**: Review security findings and trends
- **Monthly**: Update security rules and patterns
- **Quarterly**: Rotate API keys and tokens
- **Annually**: Audit workflow permissions and access

### Updating Workflows

When updating security workflows:

1. Test changes in a feature branch first
2. Review workflow runs in test PRs
3. Get security team approval for changes
4. Document any custom rules or exceptions

## Support & Resources

### Documentation
- [Claude API Documentation](https://docs.anthropic.com/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [OWASP Security Guidelines](https://owasp.org/)

### Getting Help
- Check workflow logs in Actions tab
- Review [CLAUDE_SECURITY.md](./CLAUDE_SECURITY.md) for security guidelines
- Contact security team for custom rules
- Open an issue for workflow problems

## Compliance & Reporting

### Security Reports

Security reviews generate reports in:
- PR comments (immediate feedback)
- Actions artifacts (downloadable reports)
- `security-reviews/` directory (local runs)

### Audit Trail

All security reviews are logged with:
- Timestamp
- Files reviewed
- Issues found
- Review ID
- Reviewer (Claude model version)

### Export Reports

To export security reports:

```bash
# Download from GitHub Actions
gh run download <run-id> -n security-report

# Generate local report
node scripts/claude-security-review.js --all > security-audit.md
```

---

## Quick Start Checklist

- [ ] Obtain Anthropic API key
- [ ] Add `ANTHROPIC_API_KEY` to GitHub Secrets
- [ ] Push workflow files to repository
- [ ] Configure workflow permissions
- [ ] Test with a sample PR
- [ ] Review security findings
- [ ] Set up notifications (optional)
- [ ] Document custom rules (if any)

**Need Help?** Open an issue or contact the security team.