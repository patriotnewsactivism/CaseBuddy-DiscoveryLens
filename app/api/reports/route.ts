import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabaseClient';
import { requireAuthenticatedUser, requireProjectRole } from '@/lib/serverAuth';

// POST /api/reports - Record an export event in the document_reports table
export async function POST(request: NextRequest) {
  try {
    const authentication = await requireAuthenticatedUser(request);
    if (!authentication.ok) return authentication.response;

    const body = await request.json();
    const { projectId, documentIds, format, fieldsIncluded, reportName } = body;

    if (!projectId || !format || !Array.isArray(documentIds)) {
      return NextResponse.json(
        { error: 'Missing required fields: projectId, format, documentIds' },
        { status: 400 }
      );
    }

    const authorization = await requireProjectRole(request, projectId, ['paralegal']);
    if (!authorization.ok) return authorization.response;

    const validFormats = ['pdf', 'csv', 'json'];
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        { error: `Invalid format. Must be one of: ${validFormats.join(', ')}` },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdmin();

    const uniqueDocumentIds = [...new Set(documentIds)];
    const { data: documents, error: documentError } = await supabase
      .from('documents')
      .select('id')
      .eq('project_id', projectId)
      .in('id', uniqueDocumentIds);
    if (documentError) throw documentError;
    if ((documents ?? []).length !== uniqueDocumentIds.length) {
      return NextResponse.json({ error: 'Every documentId must belong to the project' }, { status: 400 });
    }

    const { data: report, error } = await supabase
      .from('document_reports' as any)
      .insert({
        project_id: projectId,
        report_name: reportName || `Export — ${format.toUpperCase()} — ${new Date().toISOString()}`,
        format,
        fields_included: fieldsIncluded ?? {},
        document_ids: documentIds,
      })
      .select()
      .single();

    if (error) {
      // Non-fatal: document_reports table may not exist yet in all environments
      console.warn('Failed to record export report (table may not exist yet):', error.message);
      return NextResponse.json({ skipped: true, reason: error.message });
    }

    return NextResponse.json({ report }, { status: 201 });
  } catch (error: any) {
    console.error('Error recording report:', error);
    return NextResponse.json(
      { error: 'Failed to record report', details: error.message },
      { status: 500 }
    );
  }
}

// GET /api/reports - List export reports for a project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    const authorization = await requireProjectRole(request, projectId, ['viewer']);
    if (!authorization.ok) return authorization.response;

    const supabase = getSupabaseAdmin();

    let query = supabase
      .from('document_reports' as any)
      .select('*')
      .order('generated_at', { ascending: false })
      .limit(50);

    query = query.eq('project_id', projectId);

    const { data: reports, error } = await query;

    if (error) {
      console.warn('Failed to list reports (table may not exist yet):', error.message);
      return NextResponse.json({ reports: [] });
    }

    return NextResponse.json({ reports });
  } catch (error: any) {
    console.error('Error listing reports:', error);
    return NextResponse.json(
      { error: 'Failed to list reports', details: error.message },
      { status: 500 }
    );
  }
}
