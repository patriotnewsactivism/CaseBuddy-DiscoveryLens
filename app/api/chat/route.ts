import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProvider } from '@/lib/aiProvider';
import { chatWithDiscoveryServer as chatWithOpenAI } from '@/lib/openAIService';
import { chatWithDiscoveryServer as chatWithAzure } from '@/lib/azureOpenAIService';

export const maxDuration = 300; // 5 minutes for complex queries

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, filesContext, activeFile, casePerspective } = body;

    // Validate query
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid query' },
        { status: 400 }
      );
    }

    const provider = getConfiguredAIProvider();
    console.log('[chat] Provider selection:', { provider });
    const chatWithDiscoveryServer = provider === 'openai'
      ? chatWithOpenAI
      : chatWithAzure;

    const response = await chatWithDiscoveryServer(
      query,
      filesContext || [],
      activeFile,
      casePerspective
    );

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process chat',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
