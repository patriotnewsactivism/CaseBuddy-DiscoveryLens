import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProvider } from '@/lib/aiProvider';
import { generateInsightsServer as generateWithAzure } from '@/lib/azureOpenAIService';
import { generateInsightsServer as generateWithOpenAI } from '@/lib/openAIService';
import { generateInsightsServer as generateWithGemini } from '@/lib/geminiServerService';
import type { InsightsFileContext } from '@/lib/insightsTypes';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files, casePerspective } = body as { files: InsightsFileContext[]; casePerspective?: string };

    if (!Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'Missing required field: files (non-empty array of analyzed document summaries)' },
        { status: 400 }
      );
    }

    const provider = getConfiguredAIProvider();
    const generateWithProvider =
      provider === 'azure' ? generateWithAzure : provider === 'gemini' ? generateWithGemini : generateWithOpenAI;

    const highlights = await generateWithProvider(files, casePerspective);

    return NextResponse.json({ highlights, provider });
  } catch (error: any) {
    console.error('Insights API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate case highlights', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
