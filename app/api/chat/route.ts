import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProvider } from '@/lib/aiProvider';
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

    const isAuthError =
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Access denied') ||
      error?.message?.includes('invalid subscription key') ||
      error?.message?.includes('Invalid API key') ||
      error?.message?.includes('authentication') ||
      error?.code === 'AuthenticationError';

    if (isAuthError) {
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
