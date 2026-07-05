# DiscoveryLens ↔ Case Companion Sync Setup

Both apps share the **same Supabase project** (`jpzkumgndqsdwimbvjku`). No Azure services are used.

---

## Step 1: Run the SQL Migration

Go to the Supabase SQL Editor:
👉 https://supabase.com/dashboard/project/jpzkumgndqsdwimbvjku/sql/new

Paste and run: `supabase/migration_case_companion_sync.sql`

---

## Step 2: Fill in your .env (or .env.local)

Copy the values below exactly into your local `.env` file.
The `.env` in the repo has the correct variable names but redacted values.

### Supabase (shared with case-companion)
| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jpzkumgndqsdwimbvjku.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Get from Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Get from Supabase dashboard → Project Settings → API |

### AI Providers (NO AZURE)

This project does not use Microsoft Azure. AI runs on free tiers first:
Cohere (256K context) > Gemini > OpenAI (optional paid last resort).
Set `COHERE_API_KEY` and `GEMINI_API_KEY`; see `.env.example`.

### AssemblyAI
| Variable | Value |
|---|---|
| `ASSEMBLYAI_API_KEY` | *(from assemblyai.com dashboard)* |
| `ASSEMBLYAI_SPEECH_MODEL` | `universal` |

---

## What was changed/fixed

- ✅ Created `discovery-files` storage bucket in Supabase
- ✅ Added SQL migration to create `projects` table + missing `documents` columns
- ✅ Fixed `AZURE_OPENAI_ENDPOINT` — was pointing to old resource with full path; now base URL of new resource
- ✅ Added all deployment name variants (`DEPLOYMENT`, `DEPLOYMENT_NAME`, `DEPLOYMENT_ANALYSIS`, `DEPLOYMENT_CHAT`)
- ✅ Added both `AZURE_VISION_KEY` and `AZURE_VISION_API_KEY` (different code paths read different names)
- ✅ Updated Vision endpoint from `wtpvision` to `casebuddy` (matches case-companion)
