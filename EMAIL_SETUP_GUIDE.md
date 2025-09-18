# Email Setup Guide for ITC Conference App

## Overview
The ITC Conference App now includes comprehensive email functionality for:
- Password reset via email
- Welcome emails for new registrations
- Admin notifications when users register

## Features Implemented

### 1. Password Reset Flow
- Users can request password reset from the sign-in page
- Secure token generation with SHA256 hashing
- Tokens expire after 1 hour for security
- Email contains a secure link to reset password
- Clean, branded HTML email templates

### 2. Registration Notifications
- **Welcome Email**: Sent to new users upon registration
- **Admin Alert**: Notifies admins of new registrations with user details
- Emails are sent asynchronously (won't block registration if email fails)

### 3. Email Service Architecture
- Supports multiple providers (Resend, Gmail, Custom SMTP)
- Graceful fallback if email service isn't configured
- Professional HTML email templates with ITC branding

## Setup Instructions

### Option 1: Using Resend (Recommended for Production)

1. **Sign up for Resend**
   - Go to https://resend.com
   - Create an account (free tier available)
   - Get your API key from the dashboard

2. **Configure Environment Variables**
   Add to your `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
   EMAIL_FROM=noreply@your-domain.com
   ADMIN_EMAIL=your-admin@email.com
   ```

3. **Verify Your Domain** (for production)
   - Add Resend's DNS records to your domain
   - This allows sending from your domain email

### Option 2: Using Gmail (Good for Development)

1. **Enable 2-Factor Authentication**
   - Go to your Google Account settings
   - Enable 2-factor authentication

2. **Generate App Password**
   - Visit https://myaccount.google.com/apppasswords
   - Generate a new app password for "Mail"
   - Copy the 16-character password

3. **Configure Environment Variables**
   Add to your `.env.local`:
   ```
   EMAIL_PROVIDER=gmail
   EMAIL_USER=your-email@gmail.com
   EMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
   EMAIL_FROM=your-email@gmail.com
   ADMIN_EMAIL=admin@your-company.com
   ```

### Option 3: Custom SMTP Server

Add to your `.env.local`:
```
EMAIL_PROVIDER=smtp
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_USER=your-email@domain.com
EMAIL_PASSWORD=your-password
EMAIL_FROM=noreply@your-domain.com
ADMIN_EMAIL=admin@your-company.com
```

## Testing the Email Functionality

### Test Password Reset
1. Go to `/auth/signin`
2. Click "Forgot password?"
3. Enter a registered email address
4. Check the email inbox for reset link
5. Click the link and set new password

### Test Registration Email
1. Go to `/auth/register`
2. Create a new account
3. Check for:
   - Welcome email to the user
   - Notification email to admin

### Test Without Email Provider
The system works even without email configuration:
- Registration will still succeed
- Password reset will show success message (but no email sent)
- Check console logs for email attempts

## Email Templates

### Included Templates:
1. **Password Reset** - Clean, secure reset link with instructions
2. **Welcome Email** - Introduces new users to conference features
3. **Admin Notification** - Alerts admin of new registrations with details

### Customizing Templates
Edit email templates in `/lib/email/email-service.ts`:
- Modify HTML/CSS for branding
- Update copy and messaging
- Add new email types as needed

## Security Considerations

1. **Token Security**
   - Reset tokens are hashed with SHA256 before storage
   - Tokens expire after 1 hour
   - Tokens are single-use only

2. **Email Best Practices**
   - Never log sensitive information
   - Always use HTTPS URLs in emails
   - Validate email addresses before sending

3. **Rate Limiting** (Recommended)
   - Consider adding rate limiting to prevent abuse
   - Limit password reset requests per IP/email

## Troubleshooting

### Emails Not Sending
1. Check environment variables are set correctly
2. Verify API keys/passwords are valid
3. Check console logs for error messages
4. For Gmail: Ensure app password (not regular password) is used

### Reset Link Not Working
1. Ensure `NEXTAUTH_URL` is set correctly in `.env.local`
2. Check if token has expired (1 hour limit)
3. Verify database connection for token storage

### Gmail Specific Issues
- Enable "Less secure app access" if needed (not recommended)
- Use app-specific password, not your regular password
- Check if 2FA is enabled on your Google account

## API Endpoints

### POST `/api/auth/forgot-password`
Request password reset
```json
{
  "email": "user@example.com"
}
```

### POST `/api/auth/reset-password`
Reset password with token
```json
{
  "token": "reset-token-from-email",
  "password": "new-password"
}
```

## Database Schema

The `PasswordResetToken` model stores reset tokens:
```prisma
model PasswordResetToken {
  id        String   @id @default(cuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  used      Boolean  @default(false)
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## Next Steps

### Recommended Enhancements:
1. **Add Email Verification**
   - Verify user emails on registration
   - Require verification before certain actions

2. **Email Preferences**
   - Let users manage email preferences
   - Unsubscribe links in emails

3. **Rate Limiting**
   - Limit password reset requests
   - Prevent email spam/abuse

4. **Email Analytics**
   - Track email opens/clicks
   - Monitor delivery rates

5. **Additional Email Types**
   - Session reminders
   - Conference updates
   - Networking invitations

## Support

For issues or questions:
- Check console logs for detailed error messages
- Review environment variables configuration
- Ensure database migrations are applied
- Test with different email providers