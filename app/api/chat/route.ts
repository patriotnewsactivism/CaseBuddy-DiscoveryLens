import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProvider } from '@/lib/aiProvider';
import { isAIAuthError, isAIProviderConfigError } from '@/lib/aiError';
import { chatWithDiscoveryServer as chatWithAzure } from '@/lib/azureOpenAIService';
import { chatWithDiscoveryServer as chatWithOpenAI } from '@/lib/openAIService';
import { chatWithDiscoveryServer as chatWithGemini } from '@/lib/geminiServerService';

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

    const chatWithProvider = provider === 'azure'
      ? chatWithAzure
      : provider === 'gemini'
        ? chatWithGemini
        : chatWithOpenAI;

    const response = await chatWithProvider(
      query,
      filesContext || [],
      activeFile,
      casePerspective
    );

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);

    if (isAIProviderConfigError(error)) {
      console.error('[chat] AI provider configuration is invalid:', error);
      return NextResponse.json(
        { error: 'AI provider configuration is invalid. Verify AI_PROVIDER and server-side API credentials.' },
        { status: 500 }
      );
    }

    if (isAIAuthError(error)) {
      console.error('[chat] AI provider authentication failed — check your API key and endpoint configuration.');
      return NextResponse.json(
        { error: 'AI service authentication failed. Please verify your AI provider credentials and configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process chat',
        details: error?.message || String(error)
      },
      { status: 500 }
    );
  }
}
