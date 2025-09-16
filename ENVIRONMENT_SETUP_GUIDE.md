# Environment Setup Guide

## Preventing Environment Variable Conflicts

This guide helps prevent issues where shell environment variables override your `.env.local` configuration.

## Quick Check

Run this command to check your environment setup:
```bash
npm run check-env
```

This will verify:
- ✅ No shell variables overriding `.env.local`
- ✅ Valid API keys in `.env.local`
- ✅ AI routing properly configured
- ✅ No conflicting `.env` files
- ✅ Clean shell profiles

## Common Issue: Shell Override

### The Problem
If you have `export OPENAI_API_KEY=xxx` in your shell profile (`.bashrc`, `.zshrc`), it will override the value in `.env.local`.

**Shell variables take precedence over .env files in Next.js!**

### How to Fix

1. **Check for shell exports:**
   ```bash
   echo $OPENAI_API_KEY
   ```
   If this shows a value (especially a placeholder), it's overriding your `.env.local`.

2. **Find where it's set:**
   ```bash
   grep "OPENAI_API_KEY" ~/.bashrc ~/.zshrc ~/.bash_profile ~/.profile 2>/dev/null
   ```

3. **Remove or comment out the export:**
   Edit the file(s) found above and comment out or remove:
   ```bash
   # export OPENAI_API_KEY=sk-<your_actual_api_key_here>  # Comment out or remove
   ```

4. **Apply changes:**
   ```bash
   # For immediate effect in current session:
   unset OPENAI_API_KEY

   # For new terminal sessions:
   source ~/.zshrc  # or ~/.bashrc
   ```

5. **Restart your dev server:**
   ```bash
   npm run dev
   ```

## Proper Configuration

### 1. Use `.env.local` Only

Keep all your environment variables in `.env.local`:
```env
# .env.local
OPENAI_API_KEY=sk-proj-your-real-key-here
ENABLE_AI_ROUTING=true
# ... other vars
```

### 2. Never Export in Shell Profiles

Don't add API keys to shell profiles (`.bashrc`, `.zshrc`, etc.):
```bash
# ❌ DON'T DO THIS in .bashrc/.zshrc:
export OPENAI_API_KEY=sk-xxx

# ✅ Instead, keep it in .env.local only
```

### 3. Use Project-Specific Config

If you need different configs for different projects, use `.env.local` in each project directory rather than global shell exports.

## Automated Checks

### On Startup
The app now validates your environment on startup and will warn if:
- Shell variables are overriding `.env.local`
- API keys appear to be placeholders
- AI routing is disabled

### Manual Check
Run these commands anytime:
```bash
# Full environment check
npm run check-env

# Test AI routing
npm run test:ai
```

## Best Practices

1. **Keep secrets in `.env.local`** - Never commit real API keys to git
2. **Use `.env.example`** - Commit this with placeholder values as documentation
3. **No global exports** - Avoid exporting sensitive vars in shell profiles
4. **Regular checks** - Run `npm run check-env` after environment changes
5. **Clear shell on issues** - Use `unset VARIABLE_NAME` to clear overrides

## Troubleshooting

### Issue: "OPENAI_API_KEY contains placeholder text"
**Solution:** You have a shell export overriding `.env.local`. Follow the "How to Fix" steps above.

### Issue: "AI routing not working correctly"
**Solution:**
1. Ensure `ENABLE_AI_ROUTING=true` in `.env.local`
2. Check OPENAI_API_KEY is valid: `npm run check-env`
3. Restart dev server after changes

### Issue: "Different behavior in production"
**Solution:** Production servers don't load shell profiles, so they'll use `.env.local` correctly. The issue is likely only in development.

## Testing

After making changes, verify everything works:

```bash
# 1. Check environment
npm run check-env

# 2. Test AI routing
npm run test:ai

# 3. Start dev server
npm run dev

# 4. Test in browser
# Visit http://localhost:3011
# Try: "Show me the keynote speakers"
# Should return speaker info, not entertainment
```

## Summary

- ✅ Keep all env vars in `.env.local`
- ❌ Don't export API keys in shell profiles
- 🔍 Run `npm run check-env` to verify setup
- 🚀 The app will warn on startup if issues detected
- 📝 Shell vars override `.env.local` - this is by design in Next.js

Following these practices will prevent environment variable conflicts and ensure your app works correctly.