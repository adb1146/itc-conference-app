// Mark this file as server-only
import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Initialize Resend (recommended for production)
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Initialize Nodemailer (for development/testing or as fallback)
const createNodemailerTransporter = () => {
  if (process.env.EMAIL_PROVIDER === 'gmail') {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_APP_PASSWORD, // Use app-specific password for Gmail
      },
    });
  }

  // Default SMTP configuration
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

const transporter = !resend && process.env.EMAIL_USER ? createNodemailerTransporter() : null;

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export class EmailService {
  private static instance: EmailService;
  private fromEmail: string;
  private adminEmail: string;

  private constructor() {
    this.fromEmail = process.env.EMAIL_FROM || 'noreply@itc-conference.com';
    this.adminEmail = process.env.ADMIN_EMAIL || 'admin@itc-conference.com';
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  async sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
    try {
      // Use Resend if available (recommended)
      if (resend) {
        const response = await resend.emails.send({
          from: options.from || this.fromEmail,
          to: Array.isArray(options.to) ? options.to : [options.to],
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        return { success: true };
      }

      // Fallback to Nodemailer
      if (transporter) {
        await transporter.sendMail({
          from: options.from || this.fromEmail,
          to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
        });

        return { success: true };
      }

      // No email provider configured
      console.warn('No email provider configured. Email not sent:', options.subject);
      return {
        success: false,
        error: 'Email service not configured. Please set up RESEND_API_KEY or EMAIL_USER in environment variables.'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email'
      };
    }
  }

  // Send password reset email
  async sendPasswordResetEmail(email: string, resetToken: string): Promise<{ success: boolean; error?: string }> {
    const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${resetToken}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>ITC Vegas 2025</h1>
              <p>Password Reset Request</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password for your ITC Vegas 2025 account.</p>
              <p>Click the button below to reset your password. This link will expire in 1 hour.</p>
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              <p>If you didn't request this password reset, you can safely ignore this email.</p>
              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                Or copy and paste this link into your browser:<br>
                <span style="color: #4f46e5;">${resetUrl}</span>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 ITC Vegas Conference. All rights reserved.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Reset Your Password

We received a request to reset your password for your ITC Vegas 2025 account.

Click the link below to reset your password. This link will expire in 1 hour.

${resetUrl}

If you didn't request this password reset, you can safely ignore this email.

© 2025 ITC Vegas Conference. All rights reserved.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - ITC Vegas 2025',
      html,
      text,
    });
  }

  // Send registration notification to admin
  async sendRegistrationNotification(userData: {
    name: string;
    email: string;
    company?: string;
    role?: string;
  }): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .user-info { background: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .label { font-weight: 600; color: #374151; }
            .value { color: #111827; margin-left: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New User Registration</h1>
              <p>ITC Vegas 2025 Conference</p>
            </div>
            <div class="content">
              <h2>A new user has registered!</h2>
              <div class="user-info">
                <p><span class="label">Name:</span><span class="value">${userData.name}</span></p>
                <p><span class="label">Email:</span><span class="value">${userData.email}</span></p>
                <p><span class="label">Company:</span><span class="value">${userData.company || 'Not provided'}</span></p>
                <p><span class="label">Role:</span><span class="value">${userData.role || 'Not provided'}</span></p>
                <p><span class="label">Registration Time:</span><span class="value">${new Date().toLocaleString()}</span></p>
              </div>
              <p style="margin-top: 30px;">You can view all registered users in the admin dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New User Registration - ITC Vegas 2025

A new user has registered:

Name: ${userData.name}
Email: ${userData.email}
Company: ${userData.company || 'Not provided'}
Role: ${userData.role || 'Not provided'}
Registration Time: ${new Date().toLocaleString()}

You can view all registered users in the admin dashboard.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject: `New Registration: ${userData.name} - ITC Vegas 2025`,
      html,
      text,
    });
  }

  // Send welcome email to new user
  async sendWelcomeEmail(userData: {
    name: string;
    email: string;
  }): Promise<{ success: boolean; error?: string }> {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: white; padding: 30px; border: 1px solid #e5e7eb; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .feature { padding: 15px; margin: 10px 0; background: #f9fafb; border-left: 4px solid #667eea; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to ITC Vegas 2025!</h1>
              <p>October 13-15, 2025 • Las Vegas</p>
            </div>
            <div class="content">
              <h2>Hi ${userData.name.split(' ')[0]},</h2>
              <p>Welcome to the ITC Vegas 2025 Conference! We're thrilled to have you join us for the premier insurtech event of the year.</p>

              <h3>What You Can Do Now:</h3>
              <div class="feature">
                <strong>🌟 Save Your Favorites</strong><br>
                Browse sessions and speakers, and save your favorites to build your personalized schedule.
              </div>
              <div class="feature">
                <strong>🤖 Use AI Concierge</strong><br>
                Ask our AI assistant anything about the conference - from finding specific topics to getting recommendations.
              </div>
              <div class="feature">
                <strong>📅 Generate Smart Agenda</strong><br>
                Let AI create your optimal conference schedule based on your interests and favorites.
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL}" class="button">Explore the Conference</a>
              </div>

              <p>If you have any questions, feel free to reach out to our support team.</p>
              <p>See you in Las Vegas!</p>

              <p style="margin-top: 30px;">
                Best regards,<br>
                The ITC Vegas Team
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to ITC Vegas 2025!

Hi ${userData.name.split(' ')[0]},

Welcome to the ITC Vegas 2025 Conference! We're thrilled to have you join us for the premier insurtech event of the year.

What You Can Do Now:

🌟 Save Your Favorites
Browse sessions and speakers, and save your favorites to build your personalized schedule.

🤖 Use AI Concierge
Ask our AI assistant anything about the conference - from finding specific topics to getting recommendations.

📅 Generate Smart Agenda
Let AI create your optimal conference schedule based on your interests and favorites.

Visit: ${process.env.NEXTAUTH_URL}

If you have any questions, feel free to reach out to our support team.

See you in Las Vegas!

Best regards,
The ITC Vegas Team
    `;

    return this.sendEmail({
      to: userData.email,
      subject: 'Welcome to ITC Vegas 2025!',
      html,
      text,
    });
  }
}

export const emailService = EmailService.getInstance();