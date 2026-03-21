/**
 * Export service for DiscoveryLens.
 * Generates downloadable reports from analyzed discovery files.
 *
 * Exports:
 *  - CSV  (spreadsheet-friendly summary)
 *  - JSON (full data dump)
 *  - HTML (printable / PDF-ready report via browser print dialog)
 */

import { DiscoveryFile, CasePerspective } from './types';

// ─── CSV Export ───────────────────────────────────────────────────────────────

function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCSV(files: DiscoveryFile[], projectName: string): void {
  const headers = [
    'Bates Number',
    'File Name',
    'File Type',
    'Evidence Type',
    'Sentiment',
    'Summary',
    'Entities',
    'Dates',
    'Relevant Facts',
    'Transcription',
  ];

  const rows = files.map((f) => [
    f.batesNumber.formatted,
    f.name,
    f.type,
    f.analysis?.evidenceType ?? '',
    f.analysis?.sentiment ?? '',
    f.analysis?.summary ?? '',
    (f.analysis?.entities ?? []).join('; '),
    (f.analysis?.dates ?? []).join('; '),
    (f.analysis?.relevantFacts ?? []).join('; '),
    f.analysis?.transcription ?? '',
  ]);

  const csv = [headers.map(escapeCSV).join(','), ...rows.map((r) => r.map(escapeCSV).join(','))].join('\n');

  downloadBlob(csv, `${slugify(projectName)}-discovery-export.csv`, 'text/csv;charset=utf-8;');
}

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportToJSON(files: DiscoveryFile[], projectName: string, casePerspective: CasePerspective): void {
  const payload = {
    projectName,
    casePerspective,
    exportedAt: new Date().toISOString(),
    fileCount: files.length,
    files: files.map((f) => ({
      batesNumber: f.batesNumber.formatted,
      name: f.name,
      type: f.type,
      mimeType: f.mimeType,
      analysis: f.analysis,
      tags: f.tags,
    })),
  };

  const json = JSON.stringify(payload, null, 2);
  downloadBlob(json, `${slugify(projectName)}-discovery-export.json`, 'application/json');
}

// ─── HTML / PDF Export ────────────────────────────────────────────────────────

export function exportToHTMLReport(files: DiscoveryFile[], projectName: string, casePerspective: CasePerspective): void {
  const analyzedFiles = files.filter((f) => f.analysis);
  const now = new Date().toLocaleString();

  // Group files by evidence type
  const groups: Record<string, DiscoveryFile[]> = {};
  for (const f of analyzedFiles) {
    const cat = f.analysis?.evidenceType || 'Uncategorized';
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(f);
  }

  const perspectiveLabel =
    casePerspective === 'client' ? 'My Matter' : casePerspective === 'defense_support' ? 'Supporting Defendant' : 'Supporting Plaintiff';

  const fileRows = analyzedFiles
    .map(
      (f) => `
    <div class="file-card">
      <div class="file-header">
        <span class="bates">${esc(f.batesNumber.formatted)}</span>
        <span class="evidence-type">${esc(f.analysis?.evidenceType ?? '')}</span>
        ${f.analysis?.sentiment ? `<span class="sentiment sentiment-${f.analysis.sentiment.toLowerCase()}">${esc(f.analysis.sentiment)}</span>` : ''}
      </div>
      <h3>${esc(f.name)}</h3>
      <p class="summary">${esc(f.analysis?.summary ?? 'No analysis available')}</p>
      ${
        f.analysis?.entities?.length
          ? `<div class="section"><strong>Entities:</strong> ${f.analysis.entities.map((e) => esc(e)).join(', ')}</div>`
          : ''
      }
      ${
        f.analysis?.dates?.length
          ? `<div class="section"><strong>Dates:</strong> ${f.analysis.dates.map((d) => esc(d)).join(', ')}</div>`
          : ''
      }
      ${
        f.analysis?.relevantFacts?.length
          ? `<div class="section"><strong>Key Facts:</strong><ul>${f.analysis.relevantFacts.map((fact) => `<li>${esc(fact)}</li>`).join('')}</ul></div>`
          : ''
      }
      ${
        f.analysis?.transcription
          ? `<div class="section transcription"><strong>Transcription:</strong><pre>${esc(f.analysis.transcription)}</pre></div>`
          : ''
      }
    </div>`,
    )
    .join('\n');

  const categorySummary = Object.entries(groups)
    .map(([cat, catFiles]) => `<li><strong>${esc(cat)}</strong>: ${catFiles.length} file${catFiles.length > 1 ? 's' : ''}</li>`)
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(projectName)} - Discovery Report</title>
<style>
  @media print {
    body { font-size: 11pt; }
    .file-card { break-inside: avoid; }
    .no-print { display: none; }
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Georgia', 'Times New Roman', serif; color: #1e293b; background: #fff; padding: 40px; max-width: 900px; margin: 0 auto; line-height: 1.6; }
  h1 { font-size: 28px; margin-bottom: 4px; }
  h2 { font-size: 20px; margin: 32px 0 12px; border-bottom: 2px solid #334155; padding-bottom: 4px; }
  h3 { font-size: 15px; margin: 4px 0 8px; }
  .meta { color: #64748b; font-size: 13px; margin-bottom: 24px; }
  .meta span { margin-right: 20px; }
  .stats { display: flex; gap: 32px; margin: 16px 0 24px; }
  .stat { text-align: center; }
  .stat-num { font-size: 28px; font-weight: bold; color: #4f46e5; }
  .stat-label { font-size: 12px; color: #64748b; text-transform: uppercase; }
  .category-list { margin: 0 0 16px 24px; font-size: 14px; }
  .file-card { border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 16px; background: #f8fafc; }
  .file-header { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; flex-wrap: wrap; }
  .bates { font-family: 'Courier New', monospace; font-size: 12px; font-weight: bold; background: #1e293b; color: #fff; padding: 2px 8px; border-radius: 4px; }
  .evidence-type { font-size: 11px; font-weight: bold; color: #4f46e5; background: #eef2ff; padding: 2px 8px; border-radius: 12px; }
  .sentiment { font-size: 11px; padding: 2px 8px; border-radius: 12px; }
  .sentiment-hostile { background: #fef2f2; color: #dc2626; }
  .sentiment-cooperative { background: #f0fdf4; color: #16a34a; }
  .sentiment-neutral { background: #f1f5f9; color: #64748b; }
  .summary { font-size: 14px; color: #334155; margin-bottom: 8px; }
  .section { font-size: 13px; margin-top: 8px; color: #475569; }
  .section ul { margin: 4px 0 0 20px; }
  .section li { margin-bottom: 2px; }
  .transcription pre { white-space: pre-wrap; word-wrap: break-word; font-size: 12px; background: #f1f5f9; padding: 12px; border-radius: 4px; margin-top: 4px; max-height: 300px; overflow-y: auto; }
  .print-btn { position: fixed; bottom: 20px; right: 20px; background: #4f46e5; color: #fff; border: none; padding: 12px 24px; border-radius: 8px; font-size: 14px; cursor: pointer; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
  .print-btn:hover { background: #4338ca; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center; }
</style>
</head>
<body>
<h1>${esc(projectName)}</h1>
<div class="meta">
  <span>Discovery Report</span>
  <span>Generated: ${esc(now)}</span>
  <span>Perspective: ${esc(perspectiveLabel)}</span>
</div>

<div class="stats">
  <div class="stat"><div class="stat-num">${files.length}</div><div class="stat-label">Total Files</div></div>
  <div class="stat"><div class="stat-num">${analyzedFiles.length}</div><div class="stat-label">Analyzed</div></div>
  <div class="stat"><div class="stat-num">${Object.keys(groups).length}</div><div class="stat-label">Categories</div></div>
  <div class="stat"><div class="stat-num">${analyzedFiles.filter((f) => f.analysis?.sentiment === 'Hostile').length}</div><div class="stat-label">Hostile</div></div>
</div>

<h2>Evidence Categories</h2>
<ul class="category-list">${categorySummary}</ul>

<h2>Evidence Files</h2>
${fileRows}

<div class="footer">
  DiscoveryLens Report &mdash; ${esc(projectName)} &mdash; ${esc(now)}
</div>

<button class="print-btn no-print" onclick="window.print()">Print / Save as PDF</button>
</body>
</html>`;

  // Open in new tab so user can print-to-PDF
  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function esc(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
