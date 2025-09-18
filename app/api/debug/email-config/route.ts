import { NextResponse } from 'next/server';

export async function GET() {
  // Only allow in development
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'not set',
    adminEmail: process.env.ADMIN_EMAIL || 'not set',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
}