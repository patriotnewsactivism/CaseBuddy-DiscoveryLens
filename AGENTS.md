# AGENTS.md

This file provides guidance for AI coding agents working on the DiscoveryLens codebase.

## Build, Lint, and Test Commands

```bash
npm install                  # Install dependencies
npm run dev                  # Development server (localhost:3000)
npm run build                # Production build
npm start                    # Production server
npm run lint                 # Lint code
npm run test                 # Run all tests
npm run check:supabase-env   # Validate Supabase environment variables
npx vitest run lib/extractionService.test.ts  # Run single test file
npx vitest run -t "pattern"  # Run tests matching pattern
npx vitest watch             # Run tests in watch mode
```

## Environment Configuration

Create `.env.local` with:
- `GEMINI_API_KEY=your_api_key_here` (server-side only)
- `OPENAI_API_KEY=your_api_key_here` (optional, for OpenAI fallback)
- `ASSEMBLYAI_API_KEY=your_api_key_here` (optional, for transcription)
- `AZURE_FORM_RECOGNIZER_KEY=your_key_here` (optional, for OCR)
- `AZURE_FORM_RECOGNIZER_ENDPOINT=your_endpoint_here` (optional, for OCR)
- `SUPABASE_URL=your_supabase_url`
- `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`
- `SUPABASE_ANON_KEY=your_anon_key`

The API keys are server-side only—never use `NEXT_PUBLIC_` prefix for secrets.

## Project Architecture

**Tech Stack**: Next.js 16 + React 19 + TypeScript + TailwindCSS v4 + Google Generative AI SDK + Vitest + Supabase

### Directory Structure
- `app/` - Next.js App Router pages and API routes
- `app/components/` - React UI components (client-side with `'use client'`)
- `app/api/` - Server-side API routes (analyze, chat, projects, storage, transcribe)
- `lib/` - Shared utilities, types, constants, and services
- `tests/` - Test files
- `supabase/` - Database migrations and configuration

### Key Files
- `app/components/DiscoveryApp.tsx` - Main orchestrator with all state
- `lib/types.ts` - TypeScript type definitions and enums
- `lib/constants.ts` - System prompts and evidence categories
- `lib/geminiServer.ts` - Server-side Gemini SDK (uses API key)
- `lib/geminiService.ts` - Client-side service (calls API routes)
- `lib/discoveryService.ts` - Project and document management
- `lib/supabaseClient.ts` - Supabase client initialization

### Hybrid Client-Server Architecture
Files stay in browser. Gemini API calls are proxied through Next.js API routes to keep the API key secure. Supabase is used for persistent storage of projects and files.

## Code Style Guidelines

### TypeScript
- Strict mode enabled. Use explicit types for parameters and return values.
- Use interfaces for object shapes, enums for fixed sets of values.
- Avoid `any` - use `unknown` with type guards when needed.
- Use `@ts-ignore` only when absolutely necessary with explanatory comment.

### Imports Order
1. React hooks and React imports
2. External libraries (e.g., `@google/genai`, `@supabase/supabase-js`, `jszip`)
3. Internal imports using `@/` path alias

```typescript
'use client';

import React, { useState, useCallback } from 'react';
import { GoogleGenAI } from '@google/genai';
import { DiscoveryFile, FileType } from '@/lib/types';
```

### React Components
- Functional components with explicit TypeScript interface for props
- Use `'use client'` directive at top of client components
- Destructure props in function signature
- Use arrow functions for event handlers when appropriate

```typescript
interface FilePreviewProps {
  file: DiscoveryFile;
  onClose: () => void;
}

const FilePreview: React.FC<FilePreviewProps> = ({ file, onClose }) => {
  return <div>...</div>;
};

export default FilePreview;
```

### State Management
All state in `DiscoveryApp.tsx` using React hooks. No external state library.
Use `useState` for local state, `useReducer` for complex state logic.
Use `useMemo` and `useCallback` for performance optimization.

### Error Handling
- Use try/catch for async operations
- Log errors with `console.error()` including context
- API routes return JSON with `{ error: string, details?: string }`
- Validate environment variables at startup
- Show user-friendly error messages in UI

### Naming Conventions
- **Components**: PascalCase (`FilePreview`, `ChatInterface`)
- **Functions**: camelCase (`handleFileUpload`, `formatBates`)
- **Constants**: SCREAMING_SNAKE_CASE (`BATES_PREFIX_DEFAULT`)
- **Enums**: PascalCase name, SCREAMING_SNAKE_CASE values
- **Files**: PascalCase for components, camelCase for utilities
- **Variables**: camelCase (`isProcessing`, `batesCounter`)

### Styling
- TailwindCSS v4 utility classes
- Use semantic colors (slate, indigo, red, green, amber)
- Mobile-first responsive with `md:` and `lg:` breakpoints
- Dark mode support via `dark:` variants
- Use `transition-all` for smooth state changes
- Use `hover:` and `focus:` states for interactive elements

### Comments
Do NOT add comments unless explicitly requested. Code should be self-documenting.
Use JSDoc for complex functions when needed.

### Server vs Client Code
- **Server-side**: `app/api/*/route.ts`, `lib/*Server.ts` - can use `process.env`
- **Client-side**: `app/components/*`, `lib/*Service.ts` - cannot access env vars
- API routes use `NextRequest` and `NextResponse` from `next/server`
- Middleware in `middleware.ts` for route protection

### Testing
- Vitest with globals enabled
- Test files: `*.test.ts` alongside source files or in `tests/`
- Use `describe`, `it`, `expect` from vitest globals
- Mock external APIs and services
- Test both success and error cases
- Use `vi.mock()` for mocking modules

```typescript
import { describe, expect, it } from 'vitest';

describe('myFunction', () => {
  it('works correctly', async () => {
    expect(await myFunction('input')).toBe('output');
  });
});
```

## Common Tasks

| Task | Location |
|------|----------|
| Add evidence category | `EVIDENCE_CATEGORIES` in `lib/constants.ts` |
| Add API route | `app/api/<route>/route.ts` with `export async function POST` |
| Add component | Create in `app/components/`, add `'use client'`, export default |
| Modify AI prompts | `SYSTEM_INSTRUCTION_ANALYZER` / `SYSTEM_INSTRUCTION_CHAT` in `lib/constants.ts` |
| Add Supabase table | Update `supabase/schema.sql` and create migration |
| Add transcription service | Create in `lib/` and register in `aiProvider.ts` |
| Add OCR service | Create in `lib/` and integrate in analysis pipeline |
| Add file type support | Update `getFileType()` in `DiscoveryApp.tsx` |

## Important Reminders

- Never expose API keys to client-side code
- Never commit `.env.local` or secrets
- Files stored only in React state - no persistence (except via Supabase)
- Run `npm run lint` and `npm run test` before committing
- Validate Supabase connection with `npm run check:supabase-env`
- Keep components small and focused
- Use composition over inheritance
- Follow atomic design principles for UI components
- Handle file uploads with proper size limits and validation
- Implement proper loading and error states
- Use optimistic updates where appropriate
- Clean up object URLs with `URL.revokeObjectURL()`

## Bates Numbering Pattern

Bates numbers follow `{PREFIX}-{NNNN}` format (e.g., `DEF-0001`). The counter increments globally across all uploads in a project. Use the `formatBates()` helper function to generate formatted strings.

## File Type Detection

Simple MIME-type based detection in `DiscoveryApp.tsx`:
- `image/*` → IMAGE
- `video/*` → VIDEO
- `audio/*` → AUDIO
- Everything else → DOCUMENT

## AI Providers

The system supports multiple AI providers:
- Google Gemini (primary)
- OpenAI GPT (fallback)
- Configured via `AI_PROVIDER` environment variable
- See `lib/aiProvider.ts` for implementation
- API keys stored server-side only

## Supabase Integration

Projects and files can be persisted to Supabase:
- Projects table stores metadata and Bates counter
- Files table stores file information and analysis
- Storage buckets for actual file storage
- Real-time subscriptions for collaboration
- See `lib/supabaseClient.ts` and `lib/discoveryService.ts`