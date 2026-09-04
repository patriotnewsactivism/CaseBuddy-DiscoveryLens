import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';
import { requireDocumentRole } from '@/lib/serverAuth';

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requireDocumentRole(request, id, ['viewer']);
    if (!authorization.ok) return authorization.response;
    const supabase = getSupabaseAdmin();

    const { data: document, error } = await (supabase.from('documents') as any)
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Error fetching document:', error);
    return NextResponse.json(
      { error: 'Failed to fetch document', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH /api/documents/[id] - Update a document
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requireDocumentRole(request, id, ['paralegal']);
    if (!authorization.ok) return authorization.response;
    const body = (await request.json()) as {
      analysis?: Database['public']['Tables']['documents']['Row']['analysis'];
      status?: Database['public']['Tables']['documents']['Row']['status'];
      errorMessage?: string | null;
      // Dedicated mirror columns for CaseBuddy compatibility
      summary?: string | null;
      keyFacts?: string[] | string | null;
      extractedText?: string | null;
      evidenceType?: string | null;
      sentiment?: string | null;
      tags?: string[];
      customFields?: Record<string, unknown>;
    };
    const { analysis, status, errorMessage, summary, keyFacts, extractedText, evidenceType, tags, customFields } = body;

    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (analysis !== undefined) {
      updates.analysis = analysis;
      // Flag for CaseBuddy so DiscoveryLens-analyzed docs join the master case
      if (analysis) updates.ai_analyzed = true;
      // Mirror entities into CaseBuddy's shape ({name, type, context})
      const entityList = (analysis as { entities?: unknown } | null)?.entities;
      if (Array.isArray(entityList) && entityList.length > 0) {
        updates.entities = entityList
          .filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
          .map((name) => ({ name: name.trim(), type: 'other', context: 'DiscoveryLens analysis' }));
      }
    }
    if (status !== undefined) {
      if (status === 'processing' || status === 'complete' || status === 'failed') {
        updates.status = status;
      } else {
        return NextResponse.json(
          { error: 'Invalid status value' },
          { status: 400 }
        );
      }
    }
    // NOTE: errorMessage and sentiment have no dedicated columns in the shared
    // schema — they live inside the analysis JSON only. Writing them as columns
    // made the whole update fail, which is why no analysis ever persisted.
    void errorMessage;
    // Mirror individual fields for CaseBuddy querying
    if (summary !== undefined) updates.summary = summary;
    if (keyFacts !== undefined) {
      // key_facts is text[] in the shared schema; accept legacy string payloads
      updates.key_facts = Array.isArray(keyFacts)
        ? keyFacts
        : keyFacts
          ? keyFacts.split('\n').map((s) => s.trim()).filter(Boolean)
          : null;
    }
    if (extractedText !== undefined) {
      updates.extracted_text = extractedText;
      // Mirror into ocr_text so CaseBuddy chat/analysis can quote the content
      if (extractedText) updates.ocr_text = extractedText;
    }
    if (evidenceType !== undefined) updates.document_type = evidenceType;

    const { data: document, error } = await (supabase.from('documents') as any)
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ document });
  } catch (error: any) {
    console.error('Error updating document:', error);
    return NextResponse.json(
      { error: 'Failed to update document', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/documents/[id] - Delete a document
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const authorization = await requireDocumentRole(request, id, ['paralegal']);
    if (!authorization.ok) return authorization.response;
    const supabase = getSupabaseAdmin();

    // Get document to find storage path
    const { data: document } = await (supabase.from('documents') as any)
      .select('storage_path')
      .eq('id', id)
      .single();

    // Delete from storage if exists
    if (document?.storage_path) {
      await supabase.storage
        .from('discovery-files')
        .remove([document.storage_path]);
    }

    // Delete database record
    const { error } = await (supabase.from('documents') as any)
      .delete()
      .eq('id', id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting document:', error);
    return NextResponse.json(
      { error: 'Failed to delete document', details: error.message },
      { status: 500 }
    );
  }
}
