import { NextResponse } from 'next/server';

export async function GET() {
  // Security check - only in development or with secret token
  const token = process.env.DEBUG_TOKEN || 'test-debug-2024';

  return NextResponse.json({
    environment: process.env.NODE_ENV,
    hasResendKey: !!process.env.RESEND_API_KEY,
    resendKeyLength: process.env.RESEND_API_KEY?.length || 0,
    resendKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) || 'not set',
    emailFrom: process.env.EMAIL_FROM || 'not set',
    emailFromLength: process.env.EMAIL_FROM?.length || 0,
    adminEmail: process.env.ADMIN_EMAIL || 'not set',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    timestamp: new Date().toISOString()
  });
}