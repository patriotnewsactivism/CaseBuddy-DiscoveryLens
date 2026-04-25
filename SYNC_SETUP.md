# DiscoveryLens ↔ Case Companion Sync Setup

This doc explains how to connect DiscoveryLens to the shared case-companion Supabase database.

## Step 1: Run the SQL Migration

Go to the Supabase SQL Editor:
👉 https://supabase.com/dashboard/project/jpzkumgndqsdwimbvjku/sql/new

Paste and run the file at: `supabase/migration_case_companion_sync.sql`

This will:
- Create the `projects` table
- Add missing columns to the `documents` table (project_id, bates_formatted, storage_path, etc.)
- Set up RLS policies for the `discovery-files` storage bucket

## Step 2: Create your .env.local file

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase — same project as case-companion
NEXT_PUBLIC_SUPABASE_URL=https://jpzkumgndqsdwimbvjku.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<service role key from Supabase dashboard>

# Azure OpenAI — base URL only (no path, no query string)
AZURE_OPENAI_ENDPOINT=https://patri-moar8a1w-eastus2.services.ai.azure.com
AZURE_OPENAI_KEY=<your azure openai key>
AZURE_OPENAI_API_KEY=<same key — both vars are read>
AZURE_OPENAI_DEPLOYMENT=gpt-oss-120b
AZURE_OPENAI_DEPLOYMENT_ANALYSIS=gpt-oss-120b
AZURE_OPENAI_DEPLOYMENT_CHAT=gpt-oss-120b
AZURE_OPENAI_API_VERSION=2024-05-01-preview

# Azure Document Intelligence (OCR)
AZURE_DOC_INTELLIGENCE_ENDPOINT=https://casebuddy-ocr.cognitiveservices.azure.com/
AZURE_DOC_INTELLIGENCE_KEY=<your doc intelligence key>

# Azure Vision (image OCR fallback)
AZURE_VISION_ENDPOINT=https://casebuddy.cognitiveservices.azure.com/
AZURE_VISION_KEY=<your vision key>

# AssemblyAI
ASSEMBLYAI_API_KEY=<your assemblyai key>
ASSEMBLYAI_SPEECH_MODEL=universal
```

## Key Notes

- **Storage bucket**: DiscoveryLens uses `discovery-files`, case-companion uses `case-documents`. Both now exist in the shared Supabase project.
- **Azure OpenAI endpoint**: Must be the BASE URL only (e.g. `https://patri-moar8a1w-eastus2.services.ai.azure.com`). Do NOT include `/models/chat/completions` or query strings — the SDK adds those automatically.
- **Both AZURE_OPENAI_KEY and AZURE_OPENAI_API_KEY** must be set — different parts of the codebase read different var names.
- **Documents table**: Now shared between both apps. DiscoveryLens documents get a `project_id` linking them to a DiscoveryLens project; case-companion documents have `case_id` instead.
