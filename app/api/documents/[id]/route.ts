import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import type { Database } from '@/types/database.types';

// GET /api/documents/[id] - Get a single document
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = getSupabaseAdmin();

    const { data: document, error } = await supabase
      .from('documents')
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
    const body = (await request.json()) as {
      analysis?: Database['public']['Tables']['documents']['Row']['analysis'];
      status?: Database['public']['Tables']['documents']['Row']['status'];
      errorMessage?: string | null;
      // Dedicated mirror columns for CaseBuddy compatibility
      summary?: string | null;
      keyFacts?: string | null;
      extractedText?: string | null;
      evidenceType?: string | null;
      sentiment?: string | null;
    };
    const { analysis, status, errorMessage, summary, keyFacts, extractedText, evidenceType, sentiment } = body;

    const supabase = getSupabaseAdmin();

    const updates: Record<string, unknown> = {};
    if (analysis !== undefined) updates.analysis = analysis;
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
    if (errorMessage !== undefined) updates.error_message = errorMessage;
    // Mirror individual fields for CaseBuddy querying
    if (summary !== undefined) updates.summary = summary;
    if (keyFacts !== undefined) updates.key_facts = keyFacts;
    if (extractedText !== undefined) updates.extracted_text = extractedText;
    if (evidenceType !== undefined) updates.evidence_type = evidenceType;
    if (sentiment !== undefined) updates.sentiment = sentiment;

    const { data: document, error } = await supabase
      .from('documents')
      .update(updates as any)
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
    const supabase = getSupabaseAdmin();

    // Get document to find storage path
    const { data: document } = await supabase
      .from('documents')
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
    const { error } = await supabase
      .from('documents')
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
