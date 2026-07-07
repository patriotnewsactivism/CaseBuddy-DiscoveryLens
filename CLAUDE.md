# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DiscoveryLens** is a legal discovery management application that analyzes evidence files (documents, zip archives, images, audio, video) end to end: Bates numbering, text extraction/OCR, AI analysis, audio/video transcription, a cross-document chronology, and a synthesized "Key Evidence" digest. It shares a Supabase Postgres backend with the case-companion app (the `projects`/`documents`/`cases` tables are the same database - migrations are additive-only, never rename/drop existing columns).

Core capabilities:
- Automated, atomically-reserved Bates numbering (e.g., DEF-0001, DEF-0002) that persists across sessions
- Zip archives are unpacked client-side into their constituent files, each becoming its own Bates-numbered discovery item (recursive, nested zips supported)
- Multi-provider AI analysis (Gemini / OpenAI / Azure OpenAI), auto-detected or forced via `AI_PROVIDER`
- Video/audio: ffmpeg strips + downsamples audio, then transcribes via Deepgram (nova-3, primary) with AssemblyAI as automatic fallback
- Structured case chronology (`timelineEvents`) parsed with `chrono-node`, not a flat/lexicographic date list
- Cross-document "Key Evidence" synthesis: admissions, contradictions, smoking guns, credibility issues, cited by Bates number
- Full-text search index (Postgres `tsvector`) over document name/summary/extracted text
- A background job queue (`job_queue` table + `lib/worker.ts`) for extract/analyze/transcribe jobs, independent of the synchronous per-file flow the UI uses today
- Terminal/CLI mode for power users

**Tech Stack**: Next.js 16 + React 19 + TypeScript + TailwindCSS v4 + Supabase (Postgres + Storage) + `@google/genai` / `openai` SDKs

## Development Commands

```bash
npm install          # Install dependencies
npm run dev           # Dev server (localhost:3000)
npm run build          # Production build
npm start              # Production server
npm run lint            # Lint
npm test                 # Vitest
```

## Environment Configuration

See `.env.example` for the full list. Minimum to run:

```
GEMINI_API_KEY=...                # or OPENAI_API_KEY, or AZURE_OPENAI_ENDPOINT+KEY+DEPLOYMENT
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

For audio/video transcription: `DEEPGRAM_API_KEY` (recommended, fastest+most accurate) and/or `ASSEMBLYAI_API_KEY` (fallback). Without either, audio/video analysis falls back to sending the raw file straight to the multimodal LLM (slower, more expensive, no verbatim-transcript guarantee).

All server-side keys stay server-side; Next.js only exposes `NEXT_PUBLIC_*` vars to the client bundle.

## Architecture

### Provider abstraction pattern

Three parallel concerns each follow the same "auto-detect + override + graceful fallback" shape:

1. **AI provider** (`lib/aiProvider.ts` → `getConfiguredAIProvider()`): azure > openai > gemini, or force via `AI_PROVIDER`. Implementations live in `lib/geminiServerService.ts`, `lib/openAIService.ts`, `lib/azureOpenAIService.ts`, each exporting `analyzeFileServer()`, `chatWithDiscoveryServer()`, and `generateInsightsServer()` with matching signatures. `app/api/analyze/route.ts`, `app/api/chat/route.ts`, `app/api/insights/route.ts`, and `lib/worker.ts` all dispatch through this same abstraction - if you add a fourth provider, wire it into all four call sites.
2. **Transcription provider** (`lib/transcriptionProvider.ts` → `transcribeMedia()`): deepgram > assemblyai, or force via `TRANSCRIPTION_PROVIDER`. Always runs ffmpeg extraction (`lib/mediaTranscoder.ts::transcodeToMonoWav`) once, then routes to `lib/deepgramTranscriber.ts` or `lib/assemblyTranscriber.ts`; auto-retries with the other provider if the primary fails at request time. Used by `app/api/transcribe/route.ts` and `lib/worker.ts`.
3. **Text extraction** (`lib/extractionService.ts::extractTextFromBase64`): format-specific extraction for PDF (with Azure Document Intelligence OCR fallback for scanned pages), DOCX, JSON/XML/HTML/CSV/YAML/RTF/email, and a fallback for a whole zip that reaches the server (shallow - only pulls text-like entries). The primary zip path is client-side (see below).

### Zip / archive handling

Zips are **not** processed as a single opaque file server-side. `app/components/DiscoveryApp.tsx::explodeArchives()` unpacks a zip client-side with JSZip (recursive, depth-capped at 5, entry-capped at 2000, skips `__MACOSX`/`.DS_Store`/junk), guesses each entry's MIME type from its extension via `mime-types`, and feeds each entry into the exact same per-file Bates + extraction + transcription + analysis pipeline as a manually-selected file. `lib/extractionService.ts::extractFromZip` remains as a server-side fallback only for a zip that somehow reaches `/api/analyze` whole (e.g. via the terminal `read` command).

### Video/audio pipeline

For `FileType.AUDIO`/`FileType.VIDEO`, `lib/geminiService.ts::analyzeFile()` calls `transcribeMediaFile()` (→ `/api/transcribe` → `transcriptionProvider.transcribeMedia()`) **before** calling `/api/analyze`. The verbatim transcript is sent as `extractedText` instead of raw base64 media - cheaper, faster, and more reliable for legal citation than asking the analysis LLM to transcribe audio itself. If transcription fails for any reason, it falls back gracefully to the old raw-multimodal path. The ffmpeg binary must be present (installed via the Dockerfile's `apk add ffmpeg` - do not remove this) or video transcription throws.

### Bates numbering & project/case persistence

`app/api/projects/[id]/reserve-bates` calls the Postgres function `reserve_bates_numbers(project_id, count)` (see `supabase/migrations/20260706000000_atomic_bates_and_search.sql`), which atomically increments `projects.bates_counter` and returns the starting number of the reserved block. `DiscoveryApp.tsx::handleFileUpload` reserves a block for the whole batch up front rather than incrementing a local counter - this avoids both a race condition (concurrent uploads/tabs) and the old bug where reloading the page created a brand-new project and silently reset numbering to 1.

On mount, `initializeProject()` resumes the most recently updated project (`listProjects()` + `getProject()`, which now also attaches fresh signed URLs per document) and rehydrates `files` state from the saved `documents` rows via `mapCloudDocumentToDiscoveryFile()`. Rehydrated files have no live browser `File` handle (`DiscoveryFile.file` is optional) - previews fall back to the signed URL, and re-save/re-upload flows skip them since they're already persisted. Use the "New Case" button to explicitly start a fresh project instead of continuing the most recent one.

### State Management

All state lives in `app/components/DiscoveryApp.tsx` via React hooks. Key state:
- `files: DiscoveryFile[]` - Bates numbers, analysis, tags, cloud storage refs
- `currentProject: Project | null` - the active Supabase `projects` row (drives Bates reservation)
- `viewMode`: DASHBOARD, EVIDENCE_VIEWER, TIMELINE, HIGHLIGHTS, CLI
- `casePerspective`: reframes "hostile/cooperative" sentiment relative to client/defense-support/plaintiff-support

### Chronology (Timeline.tsx)

The analysis prompt (`SYSTEM_INSTRUCTION_ANALYZER` in `lib/constants.ts`) asks every provider for `timelineEvents: {date, description}[]` - paired, not a flat date list. `Timeline.tsx` parses each `date` string with `chrono-node`, sorts genuinely chronologically, dedupes identical (file, date, description) triples, buckets unparseable dates separately rather than sorting them lexicographically, and supports keyword/evidence-type/sentiment filtering plus CSV export. Older analyses without `timelineEvents` fall back to the legacy flat `dates` array with a generic description.

### Key Evidence ("jewels") synthesis

`SYSTEM_INSTRUCTION_INSIGHTS` (`lib/constants.ts`) + `generateInsightsServer()` (implemented per-provider, dispatched in `app/api/insights/route.ts`) synthesize the 5-15 most case-critical facts across every analyzed document - tagged Admission/Contradiction/Smoking Gun/Credibility Issue/Key Fact, ranked Critical/High/Medium, each citing Bates numbers. Rendered in `app/components/CaseHighlights.tsx` under the "Key Evidence" tab. Requires at least 2 analyzed documents; results are cached in-memory (same LRU cache as analysis) keyed by the file set + case perspective.

### Component Structure

- **DiscoveryApp.tsx**: Main orchestrator (three-panel layout, upload/archive-expansion, Bates reservation, project resume)
- **FilePreview.tsx**: Tabbed viewer (preview/analysis/transcription); preview falls back from blob URL to signed URL for resumed files
- **ChatInterface.tsx**: Right sidebar chat with Bates citations
- **Timeline.tsx**: Chronology view (see above)
- **CaseHighlights.tsx**: Key Evidence view (see above)
- **TerminalInterface.tsx**: CLI mode (hunt, ls, status, inspect, read, ask, clear)
- **BatesBadge.tsx**: Reusable Bates badge

### Background job queue (lib/worker.ts, lib/workerManager.ts)

A separate, currently UI-unused pathway: `job_queue` table + `JobWorker` polls for `extract`/`analyze`/`transcribe` jobs and processes them via the same provider abstractions as the synchronous flow. Useful for bulk/background processing without keeping a browser tab open; if you wire the UI to enqueue jobs instead of calling `/api/analyze` directly, make sure both paths keep using the shared abstractions (`aiProvider.ts`, `transcriptionProvider.ts`) rather than hardcoding a provider.

## Key Patterns

### Bates Numbering
- Format: `{PREFIX}-{NNNN}` (e.g., DEF-0001), prefix default "DEF" (`lib/constants.ts`)
- Reserved atomically per upload batch via `reserve_bates_numbers()` RPC - never increment a local-only counter
- `formatBates()` helper in `DiscoveryApp.tsx`

### File Type Detection
MIME-type based (`getFileType()` in `DiscoveryApp.tsx`): `image/*` → IMAGE, `video/*` → VIDEO, `audio/*` → AUDIO, else → DOCUMENT. Files unpacked from a zip get their MIME type inferred from file extension (zips don't store MIME types) before this check runs.

### View Modes
`ViewMode` enum (`lib/types.ts`): DASHBOARD, EVIDENCE_VIEWER, TIMELINE, HIGHLIGHTS, CLI.

## Cloud Run Deployment

```bash
docker build --build-arg GEMINI_API_KEY=$GEMINI_API_KEY -t discoverylens .
docker run -p 3000:3000 -e GEMINI_API_KEY=$GEMINI_API_KEY discoverylens
gcloud builds submit --tag gcr.io/PROJECT_ID/discoverylens
gcloud run deploy discoverylens \
  --image gcr.io/PROJECT_ID/discoverylens \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY,DEEPGRAM_API_KEY=$DEEPGRAM_API_KEY \
  --platform managed --region us-central1 --allow-unauthenticated \
  --memory 512Mi --cpu 1 --timeout 300s
```

The base image installs `ffmpeg` (required for video transcription) alongside the native-module build tools - don't remove it from the Dockerfile's `apk add` line.

## Important Notes

- **Files DO persist** across reloads: each analyzed document is saved to Supabase Storage + the `documents` table as it's processed, and the most recent project/case is rehydrated on load. This superseded the old "no persistence" behavior.
- **API keys are server-side only**, never exposed to the client bundle.
- **Shared schema with case-companion**: `documents`/`projects`/`cases` tables are the same Postgres database as the case-companion app. Any migration must be additive (new columns/functions/indexes), never rename or drop existing columns.
- **Folder upload** uses the non-standard `webkitdirectory` attribute - works in Chrome/Edge, may not work in all browsers.

## Common Modifications

**Add new evidence category**: Edit `EVIDENCE_CATEGORIES` in `lib/constants.ts`.

**Change Bates prefix**: Edit `BATES_PREFIX_DEFAULT` in `lib/constants.ts` (existing projects keep their own `bates_prefix` column value).

**Add/adjust an AI provider**: Implement `analyzeFileServer`/`chatWithDiscoveryServer`/`generateInsightsServer` with matching signatures in a new `lib/<provider>Service.ts`, then wire it into `lib/aiProvider.ts` and the four dispatch sites (`app/api/analyze`, `app/api/chat`, `app/api/insights`, `lib/worker.ts`).

**Add/adjust a transcription provider**: Implement a transcriber module accepting a pre-extracted mono WAV buffer, then wire it into `lib/transcriptionProvider.ts`.

**Modify system instructions**: `SYSTEM_INSTRUCTION_ANALYZER`, `SYSTEM_INSTRUCTION_CHAT`, `SYSTEM_INSTRUCTION_INSIGHTS` in `lib/constants.ts`.

**Add a new view mode**: Add to `ViewMode` enum (`lib/types.ts`), add a tab button + render branch in `DiscoveryApp.tsx`.
