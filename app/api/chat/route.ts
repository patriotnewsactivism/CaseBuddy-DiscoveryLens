import { NextRequest, NextResponse } from 'next/server';
import { getConfiguredAIProviders } from '@/lib/aiProvider';
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

    const providers = getConfiguredAIProviders();
    console.log('[chat] Provider fallback chain:', { providers });

    const isAuthError = (error: any): boolean =>
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Access denied') ||
      error?.message?.includes('invalid subscription key') ||
      error?.message?.includes('Invalid API key') ||
      error?.message?.includes('authentication') ||
      error?.code === 'AuthenticationError';

    let response: string | null = null;

    for (const provider of providers) {
      try {
        console.log(`[chat] Trying provider: ${provider}`);
        const fn = provider === 'azure' ? chatWithAzure
          : provider === 'gemini' ? chatWithGemini
          : chatWithOpenAI;
        response = await fn(query, filesContext || [], activeFile, casePerspective);
        console.log(`[chat] Success with provider: ${provider}`);
        break;
      } catch (err: any) {
        if (isAuthError(err)) {
          console.warn(`[chat] Provider ${provider} auth failed, trying next provider...`, err?.message);
          continue;
        }
        throw err; // Non-auth errors propagate immediately
      }
    }

    if (response === null) {
      console.error('[chat] All providers failed authentication.');
      return NextResponse.json(
        { error: 'AI service authentication failed. Please verify your AI provider credentials and configuration.' },
        { status: 401 }
      );
    }

    return NextResponse.json({ response });
  } catch (error: any) {
    console.error('Chat API error:', error);

    const isAuthErr =
      error?.status === 401 ||
      error?.status === 403 ||
      error?.message?.includes('401') ||
      error?.message?.includes('Access denied') ||
      error?.message?.includes('invalid subscription key') ||
      error?.message?.includes('Invalid API key') ||
      error?.message?.includes('authentication') ||
      error?.code === 'AuthenticationError';

    if (isAuthErr) {
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
