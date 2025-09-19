import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const debugToken = process.env.DEBUG_TOKEN;
  const authHeader = request.headers.get('authorization');

  if (!debugToken || authHeader !== `Bearer ${debugToken}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || 'not set',
    adminEmail: process.env.ADMIN_EMAIL || 'not set',
    nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set'
  });
}
