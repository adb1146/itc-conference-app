import { NextResponse } from 'next/server';
import { AI_CONFIG } from '@/lib/ai-config';

export async function GET() {
  const modelInfo = AI_CONFIG.getCurrentModelInfo();
  
  return NextResponse.json({
    current: {
      model: modelInfo.model,
      displayName: modelInfo.displayName,
      tokenLimit: modelInfo.tokenLimit
    },
    configuration: {
      primaryModel: AI_CONFIG.PRIMARY_MODEL,
      fallbackModel: AI_CONFIG.FALLBACK_MODEL,
      temperature: AI_CONFIG.DEFAULT_TEMPERATURE,
      apiTimeout: AI_CONFIG.API_TIMEOUT
    },
    timestamp: new Date().toISOString(),
    status: 'active'
  });
}