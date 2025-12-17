# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**DiscoveryLens** is a legal discovery management application that uses Google's Gemini AI to analyze evidence files (documents, images, audio, video). It provides:
- Automated Bates numbering (e.g., DEF-0001, DEF-0002)
- AI-powered file analysis, transcription, and classification
- Multi-modal chat interface for querying evidence
- Timeline/chronology view for organizing evidence
- Terminal/CLI mode for power users

**Tech Stack**: React 19 + TypeScript + Vite + TailwindCSS + Google Generative AI SDK

## Development Commands

```bash
# Install dependencies
npm install

# Run dev server (localhost:3000)
npm run dev

# Build for production
npm run build

# Preview production build
npm preview
```

## Environment Configuration

The app requires a Gemini API key. Create a `.env.local` file:
```
GEMINI_API_KEY=your_api_key_here
```

The Vite config (vite.config.ts:14-15) injects this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` at build time.

## Architecture

### State Management
All state is managed in App.tsx using React hooks (no external state library). Key state:
- `files`: Array of DiscoveryFile objects with Bates numbers and analysis results
- `viewMode`: Controls which view is active (DASHBOARD, EVIDENCE_VIEWER, TIMELINE, CLI)
- `chatMessages`: AI chat history
- `selectedFileId`: Currently viewed file in Evidence Viewer

### Core Data Flow

1. **File Upload** (App.tsx:43-89)
   - User selects folder via hidden file input with `webkitdirectory` attribute
   - Files are filtered to exclude system files and assigned sequential Bates numbers
   - Each file gets a UUID, preview URL (blob), and initial DiscoveryFile object
   - Files are added to state immediately as "processing"

2. **AI Analysis** (App.tsx:91-121, services/geminiService.ts:31-82)
   - Each file is analyzed in parallel via `processFileAnalysis()`
   - `analyzeFile()` converts file to base64 and sends to Gemini 3 Flash Preview
   - Structured output schema extracts: summary, evidenceType, entities, dates, relevantFacts, transcription, sentiment
   - Analysis result updates the file's state (isProcessing: false, analysis: {...})
   - Errors fallback to generic "Error processing file" analysis

3. **Chat System** (services/geminiService.ts:87-141)
   - `chatWithDiscovery()` builds context from ALL file summaries
   - If a file is "active" (being viewed), includes full transcription or raw file
   - Uses Gemini 3 Pro Preview for chat responses
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

## Cloud Run Deployment Issue

**Current Problem**: The app fails to deploy to Cloud Run because:
1. Vite dev server is not suitable for production (uses port 3000 by default)
2. Cloud Run expects apps to listen on the PORT environment variable (typically 8080)
3. Frontend apps need proper production build + static file serving

**To Fix**:
- Build the app with `npm run build` (creates `dist/` folder)
- Serve the `dist/` folder with a static file server (e.g., `serve`, `http-server`, or Express)
- Update the container/Dockerfile to:
  1. Run `npm run build` during build phase
  2. Install a static file server
  3. Serve `dist/` on the PORT env var

Example Dockerfile:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
RUN npm install -g serve
CMD ["serve", "-s", "dist", "-l", "$PORT"]
```

Alternatively, use Vite's preview mode configured to use PORT:
```bash
vite preview --port $PORT --host 0.0.0.0
```

## File Organization

```
/
├── components/          # React UI components
│   ├── BatesBadge.tsx
│   ├── ChatInterface.tsx
│   ├── FilePreview.tsx
│   ├── TerminalInterface.tsx
│   └── Timeline.tsx
├── services/           # API integrations
│   └── geminiService.ts  # Gemini AI client + analysis functions
├── App.tsx            # Main application orchestrator
├── types.ts           # TypeScript type definitions
├── constants.ts       # System prompts and categories
├── index.tsx          # React entry point
├── vite.config.ts     # Vite configuration (dev server, env vars)
└── package.json       # Dependencies and scripts
```

## Important Notes

- **No backend**: This is a pure frontend app. All Gemini API calls happen client-side (API key exposed in bundle).
- **No persistence**: Files and analysis are stored only in React state. Refreshing loses everything.
- **Folder upload**: Uses non-standard `webkitdirectory` attribute (App.tsx:194) - works in Chrome/Edge, may not work in all browsers.
- **Blob URLs**: Files create blob URLs for preview (App.tsx:73). These consume memory and aren't cleaned up until page refresh.

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
