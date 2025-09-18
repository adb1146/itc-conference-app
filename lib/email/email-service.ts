// Mark this file as server-only
import 'server-only';
import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Initialize Resend (recommended for production)
// Trim any whitespace/newlines from API key
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY.trim()) : null;

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
    // Trim any whitespace/newlines from environment variables
    this.fromEmail = (process.env.EMAIL_FROM || 'noreply@itc-conference.com').trim();
    this.adminEmail = (process.env.ADMIN_EMAIL || 'admin@itc-conference.com').trim();
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
            .disclaimer { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 5px; color: #78350f; font-size: 13px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>PS Advisory AI Demo</h1>
              <p>ITC Concierge App - Password Reset</p>
            </div>
            <div class="content">
              <h2>Reset Your Password</h2>
              <p>We received a request to reset your password for your <strong>PS Advisory AI Demo ITC Concierge App</strong> account.</p>

              <div class="disclaimer">
                <strong>Important:</strong> This is a demonstration app created by PS Advisory LLC. This is NOT affiliated with the official ITC Vegas 2025 conference or website.
              </div>

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
              <p>© 2025 PS Advisory LLC. All rights reserved.</p>
              <p>This is a demonstration application and is not affiliated with ITC Vegas 2025.</p>
              <p>This email was sent to ${email}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Reset Your Password - PS Advisory AI Demo ITC Concierge App

We received a request to reset your password for your PS Advisory AI Demo ITC Concierge App account.

IMPORTANT: This is a demonstration app created by PS Advisory LLC. This is NOT affiliated with the official ITC Vegas 2025 conference or website.

Click the link below to reset your password. This link will expire in 1 hour.

${resetUrl}

If you didn't request this password reset, you can safely ignore this email.

© 2025 PS Advisory LLC. All rights reserved.
This is a demonstration application and is not affiliated with ITC Vegas 2025.
    `;

    return this.sendEmail({
      to: email,
      subject: 'Reset Your Password - PS Advisory AI Demo',
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
    position?: string;
    organizationType?: string;
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
            .label { font-weight: 600; color: #374151; display: inline-block; min-width: 150px; }
            .value { color: #111827; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
            .action-note { background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New User Registration</h1>
              <p>PS Advisory AI Demo - ITC Concierge App</p>
            </div>
            <div class="content">
              <h2>A new user has registered for the demo app!</h2>

              <div class="action-note">
                <strong>🎯 Follow-up Opportunity:</strong> This user has shown interest in AI-powered conference solutions. Consider reaching out for a consultation.
              </div>

              <div class="user-info">
                <p><span class="label">Name:</span><span class="value">${userData.name}</span></p>
                <p><span class="label">Email:</span><span class="value">${userData.email}</span></p>
                <p><span class="label">Company:</span><span class="value">${userData.company || 'Not provided'}</span></p>
                <p><span class="label">Position/Title:</span><span class="value">${userData.position || 'Not provided'}</span></p>
                <p><span class="label">Role:</span><span class="value">${userData.role || 'Not provided'}</span></p>
                <p><span class="label">Organization Type:</span><span class="value">${userData.organizationType || 'Not provided'}</span></p>
                <p><span class="label">Registration Time:</span><span class="value">${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST</span></p>
              </div>

              <p style="margin-top: 30px;"><strong>Recommended Actions:</strong></p>
              <ul>
                <li>Send personalized follow-up within 24-48 hours</li>
                <li>Offer a free consultation on AI solutions</li>
                <li>Share relevant case studies based on their organization type</li>
              </ul>
            </div>
            <div class="footer">
              <p>© 2025 PS Advisory LLC. All rights reserved.</p>
              <p>This notification was sent to ${this.adminEmail}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
New User Registration - PS Advisory AI Demo

A new user has registered for the demo app!

LEAD DETAILS:
Name: ${userData.name}
Email: ${userData.email}
Company: ${userData.company || 'Not provided'}
Position/Title: ${userData.position || 'Not provided'}
Role: ${userData.role || 'Not provided'}
Organization Type: ${userData.organizationType || 'Not provided'}
Registration Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })} PST

RECOMMENDED ACTIONS:
• Send personalized follow-up within 24-48 hours
• Offer a free consultation on AI solutions
• Share relevant case studies based on their organization type

© 2025 PS Advisory LLC. All rights reserved.
    `;

    return this.sendEmail({
      to: this.adminEmail,
      subject: `🎯 New Lead: ${userData.name} - PS Advisory AI Demo`,
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
            .cta-section { background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%); padding: 25px; border-radius: 10px; margin: 30px 0; text-align: center; }
            .footer { text-align: center; margin-top: 30px; color: #6b7280; font-size: 14px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to PS Advisory AI Demo!</h1>
              <p>Experience the Power of AI-Driven Conference Solutions</p>
            </div>
            <div class="content">
              <h2>Hi ${userData.name.split(' ')[0]},</h2>
              <p>Thank you for signing up for our AI-powered ITC Conference Concierge demonstration app! This innovative tool showcases how artificial intelligence can transform the conference experience.</p>

              <h3>🚀 Powerful Features at Your Fingertips:</h3>

              <div class="feature">
                <strong>📅 Custom AI-Generated Agenda</strong><br>
                Our intelligent algorithm analyzes your preferences, role, and interests to create a personalized conference schedule optimized just for you. No more missing important sessions or scheduling conflicts!
              </div>

              <div class="feature">
                <strong>🤖 AI Concierge Assistant</strong><br>
                Ask any question about sessions, speakers, or topics. Our AI instantly searches through all conference content to provide relevant answers and recommendations.
              </div>

              <div class="feature">
                <strong>⭐ Smart Favorites & Tracking</strong><br>
                Save sessions and speakers you're interested in. The AI learns from your choices to provide increasingly personalized recommendations.
              </div>

              <div class="feature">
                <strong>🔍 Intelligent Search</strong><br>
                Find exactly what you're looking for with semantic search that understands context and intent, not just keywords.
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${process.env.NEXTAUTH_URL}" class="button">Start Exploring the App</a>
              </div>

              <div class="cta-section">
                <h3>🎯 About PS Advisory LLC</h3>
                <p><strong>We specialize in AI-powered solutions for conferences, events, and enterprise applications.</strong></p>

                <p>PS Advisory helps organizations leverage cutting-edge AI technology to enhance user experiences, streamline operations, and drive engagement. This demo app is just one example of what's possible.</p>

                <h4 style="color: #667eea; margin-top: 20px;">📞 Schedule Your Free Consultation</h4>
                <p>Interested in implementing AI solutions for your conference or organization?</p>
                <p><strong>Let's discuss how we can transform your event experience!</strong></p>

                <p>
                  📧 Email: <a href="mailto:contactus@psadvisory.com">contactus@psadvisory.com</a><br>
                  🌐 Visit: <a href="https://psadvisory.com">www.psadvisory.com</a>
                </p>

                <a href="mailto:contactus@psadvisory.com?subject=Free%20AI%20Consultation%20Request&body=Hi%2C%0A%0AI%20just%20signed%20up%20for%20your%20ITC%20Conference%20AI%20Demo%20and%20I'm%20interested%20in%20learning%20more%20about%20PS%20Advisory's%20AI%20solutions.%0A%0AName%3A%20${encodeURIComponent(userData.name)}%0AEmail%3A%20${encodeURIComponent(userData.email)}%0A%0ALooking%20forward%20to%20discussing%20how%20AI%20can%20enhance%20our%20operations.%0A%0ABest%20regards" class="button">
                  Request Free Consultation
                </a>
              </div>

              <p style="margin-top: 30px;">
                Best regards,<br>
                <strong>The PS Advisory Team</strong>
              </p>
            </div>
            <div class="footer">
              <p>© 2025 PS Advisory LLC. All rights reserved.</p>
              <p>This is a demonstration app and is not affiliated with ITC Vegas 2025.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `
Welcome to PS Advisory AI Demo!

Hi ${userData.name.split(' ')[0]},

Thank you for signing up for our AI-powered ITC Conference Concierge demonstration app! This innovative tool showcases how artificial intelligence can transform the conference experience.

🚀 POWERFUL FEATURES:

📅 Custom AI-Generated Agenda
Our intelligent algorithm analyzes your preferences to create a personalized conference schedule optimized just for you.

🤖 AI Concierge Assistant
Ask any question about sessions, speakers, or topics and get instant, relevant answers.

⭐ Smart Favorites & Tracking
The AI learns from your choices to provide increasingly personalized recommendations.

🔍 Intelligent Search
Find exactly what you're looking for with semantic search that understands context and intent.

Visit the app: ${process.env.NEXTAUTH_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 ABOUT PS ADVISORY LLC

We specialize in AI-powered solutions for conferences, events, and enterprise applications.

PS Advisory helps organizations leverage cutting-edge AI technology to enhance user experiences, streamline operations, and drive engagement.

📞 SCHEDULE YOUR FREE CONSULTATION

Interested in implementing AI solutions for your conference or organization?

Contact us:
📧 Email: contactus@psadvisory.com
🌐 Visit: www.psadvisory.com

Best regards,
The PS Advisory Team

© 2025 PS Advisory LLC. All rights reserved.
This is a demonstration app and is not affiliated with ITC Vegas 2025.
    `;

    return this.sendEmail({
      to: userData.email,
      subject: 'Welcome to PS Advisory AI Demo - Transform Your Conference Experience',
      html,
      text,
    });
  }
}

export const emailService = EmailService.getInstance();