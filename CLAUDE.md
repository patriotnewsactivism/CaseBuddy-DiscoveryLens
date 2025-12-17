# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DiscoveryLens** is a legal discovery management application that uses Google's Gemini AI to analyze evidence files (documents, images, audio, video). It provides:
- Automated Bates numbering (e.g., DEF-0001, DEF-0002)
- AI-powered file analysis, transcription, and classification
- Multi-modal chat interface for querying evidence
- Timeline/chronology view for organizing evidence
- Terminal/CLI mode for power users

**Tech Stack**: Next.js 16 + React 19 + TypeScript + TailwindCSS v4 + Google Generative AI SDK

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server (localhost:3000)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Lint code
npm run lint
```

## Environment Configuration

The app requires a Gemini API key. Create a `.env.local` file:
```
GEMINI_API_KEY=your_api_key_here
```

**IMPORTANT**: The API key is server-side only and never exposed to the client. Next.js automatically prevents environment variables without `NEXT_PUBLIC_` prefix from being included in the browser bundle.

## Architecture

### Next.js App Router Structure
- **app/page.tsx**: Entry point that renders the main DiscoveryApp component
- **app/layout.tsx**: Root layout with HTML structure and metadata
- **app/components/**: All UI components (client-side with 'use client')
- **app/api/**: Server-side API routes for Gemini proxy
- **lib/**: Shared utilities and types

### Security: Hybrid Client-Server Architecture
Files stay in the browser (no server storage), but Gemini API calls are proxied through Next.js API routes:
1. Client converts File to base64 using FileReader
2. Client sends base64 + metadata to `/api/analyze` or `/api/chat`
3. Server-side API route calls Gemini with secure API key
4. Response sent back to client

This keeps files private (browser-only) while hiding the API key from the client bundle.

### State Management
All state is managed in app/components/DiscoveryApp.tsx using React hooks (no external state library). Key state:
- `files`: Array of DiscoveryFile objects with Bates numbers and analysis results
- `viewMode`: Controls which view is active (DASHBOARD, EVIDENCE_VIEWER, TIMELINE, CLI)
- `chatMessages`: AI chat history
- `selectedFileId`: Currently viewed file in Evidence Viewer

### Core Data Flow

1. **File Upload** (app/components/DiscoveryApp.tsx:43-89)
   - User selects folder via hidden file input with `webkitdirectory` attribute
   - Files are filtered to exclude system files and assigned sequential Bates numbers
   - Each file gets a UUID, preview URL (blob), and initial DiscoveryFile object
   - Files are added to state immediately as "processing"

2. **AI Analysis** (Hybrid Client-Server Flow)
   - **Client** (lib/geminiService.ts:17-44): Converts file to base64, sends to `/api/analyze`
   - **Server** (app/api/analyze/route.ts → lib/geminiServer.ts:10-60): Receives base64, calls Gemini 3 Flash Preview with API key
   - **Response**: Structured output (summary, evidenceType, entities, dates, relevantFacts, transcription, sentiment) sent back to client
   - Client updates file state (isProcessing: false, analysis: {...})
   - Errors fallback to generic "Error processing file" analysis

3. **Chat System** (Hybrid Client-Server Flow)
   - **Client** (lib/geminiService.ts:50-95): Builds simplified context, sends to `/api/chat`
   - **Server** (app/api/chat/route.ts → lib/geminiServer.ts:66-110): Receives context, calls Gemini 3 Pro Preview with API key
   - If a file is "active" (being viewed), includes full transcription or raw base64
   - Responses cite Bates numbers in brackets [DEF-XXX]

### Component Structure

- **App.tsx**: Main orchestrator with three-panel layout (left sidebar, center view, right chat)
- **FilePreview.tsx**: Tabbed viewer (preview, analysis, transcription) for selected file
- **ChatInterface.tsx**: Right sidebar chat with Bates number highlighting in responses
- **Timeline.tsx**: Chronological view grouping files by extracted dates
- **TerminalInterface.tsx**: CLI mode with commands (hunt, ls, status, inspect, read, ask, clear)
- **BatesBadge.tsx**: Reusable Bates number badge component

### Gemini Integration

The app uses two Gemini models:
- **gemini-3-flash-preview**: Fast multimodal analysis for individual files (services/geminiService.ts:34)
- **gemini-3-pro-preview**: Slower but more powerful for chat/reasoning (services/geminiService.ts:127)

System instructions defined in constants.ts:21-47:
- SYSTEM_INSTRUCTION_ANALYZER: Tells model to extract legal metadata and transcribe verbatim
- SYSTEM_INSTRUCTION_CHAT: Tells model to act as litigation consultant, cite Bates numbers

Evidence categories: 19 predefined types (Contract, Email, Body Cam, etc.) - see constants.ts:3-19

## Key Patterns

### Bates Numbering
- Format: `{PREFIX}-{NNNN}` (e.g., DEF-0001)
- Counter increments globally across all uploads (App.tsx:28, 83)
- Default prefix: "DEF" (constants.ts:1)
- Format helper: `formatBates()` (App.tsx:20-23)

### File Type Detection
Simple MIME-type based detection (App.tsx:13-18):
- `image/*` → IMAGE
- `video/*` → VIDEO
- `audio/*` → AUDIO
- Everything else → DOCUMENT

### Async File Analysis
Files process independently in parallel (App.tsx:87). No blocking - user can interact while files analyze in background. UI shows spinner for `isProcessing: true`.

### View Modes
Four modes controlled by `viewMode` enum (types.ts:46-51):
- DASHBOARD: Overview cards of recent files
- EVIDENCE_VIEWER: Full preview + analysis of selected file
- TIMELINE: Chronological grouping by dates
- CLI: Terminal interface (hides chat sidebar)

### Chat Context Strategy
- Always send summaries of ALL files for context
- If viewing a file, append full transcription + "USER IS CURRENTLY VIEWING" instruction
- This allows AI to answer both broad questions ("find contradictions") and specific file questions

## Cloud Run Deployment

The app is ready for Cloud Run deployment with the included Dockerfile:

```bash
# Build Docker image
docker build --build-arg GEMINI_API_KEY=$GEMINI_API_KEY -t discoverylens .

# Test locally
docker run -p 3000:3000 -e GEMINI_API_KEY=$GEMINI_API_KEY discoverylens

# Deploy to Cloud Run
gcloud builds submit --tag gcr.io/PROJECT_ID/discoverylens
gcloud run deploy discoverylens \
  --image gcr.io/PROJECT_ID/discoverylens \
  --set-env-vars GEMINI_API_KEY=$GEMINI_API_KEY \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --cpu 1 \
  --timeout 300s
```

**Key Features**:
- Next.js standalone output for minimal Docker image size
- Multi-stage build for optimized production image
- Proper user permissions (runs as non-root nextjs user)
- Environment variable support for GEMINI_API_KEY

## File Organization

```
/
├── app/
│   ├── layout.tsx                # Root HTML layout
│   ├── page.tsx                  # Entry point (renders DiscoveryApp)
│   ├── globals.css               # Global styles + Tailwind directives
│   ├── api/                      # Server-side API routes
│   │   ├── analyze/route.ts      # POST /api/analyze - File analysis proxy
│   │   └── chat/route.ts         # POST /api/chat - Chat proxy
│   └── components/               # UI components (client-side)
│       ├── DiscoveryApp.tsx      # Main app logic (was App.tsx)
│       ├── BatesBadge.tsx
│       ├── ChatInterface.tsx
│       ├── FilePreview.tsx
│       ├── TerminalInterface.tsx
│       └── Timeline.tsx
├── lib/
│   ├── geminiServer.ts          # Server-side Gemini SDK (uses API key)
│   ├── geminiService.ts         # Client-side service (calls API routes)
│   ├── types.ts                 # TypeScript type definitions
│   └── constants.ts             # System prompts and categories
├── public/                      # Static assets
├── .env.local                   # GEMINI_API_KEY (gitignored)
├── .env.example                 # Environment template
├── next.config.ts               # Next.js configuration
├── tailwind.config.ts           # Tailwind v4 configuration
├── Dockerfile                   # Docker build for Cloud Run
└── package.json                 # Dependencies and scripts
```

## Important Notes

- **Hybrid architecture**: Files stay in browser (no server storage), API calls proxied through Next.js routes
- **API key security**: GEMINI_API_KEY is server-side only, never exposed to client bundle
- **No persistence**: Files and analysis are stored only in React state. Refreshing loses everything.
- **Folder upload**: Uses non-standard `webkitdirectory` attribute (app/components/DiscoveryApp.tsx:194) - works in Chrome/Edge, may not work in all browsers.
- **Blob URLs**: Files create blob URLs for preview. These consume memory and aren't cleaned up until page refresh.

## Testing the App

1. Create `.env.local` with your Gemini API key
2. Run `npm run dev`
3. Click "Scrape Local Folder" and select a folder with various file types
4. Watch files populate in left sidebar as they're analyzed
5. Click a file to view in Evidence Viewer
6. Use "Discovery AI" chat on right to ask questions like:
   - "Create a timeline of events"
   - "Are there contradictions?"
   - "Who are the key witnesses?"
7. Try Terminal Mode (TERMINAL_MODE button) for CLI experience

## Common Modifications

**Add new evidence category**: Edit `EVIDENCE_CATEGORIES` array in constants.ts:3-19

**Change Bates prefix**: Edit `BATES_PREFIX_DEFAULT` in constants.ts:1

**Adjust AI models**: Edit model names in geminiService.ts:34 (analysis) and :127 (chat)

**Modify system instructions**: Edit `SYSTEM_INSTRUCTION_ANALYZER` and `SYSTEM_INSTRUCTION_CHAT` in constants.ts:21-47

**Add new view mode**: Add to ViewMode enum (types.ts:46-51), add tab in App.tsx:308-330, implement rendering in App.tsx:333-391
