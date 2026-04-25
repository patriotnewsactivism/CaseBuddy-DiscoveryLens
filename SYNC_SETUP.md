# DiscoveryLens ↔ Case Companion Sync Setup

Both apps share the **same Supabase project** (`jpzkumgndqsdwimbvjku`) and the same Azure resources.

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

### Azure OpenAI (synced with case-companion — all deployment name variants)
| Variable | Value |
|---|---|
| `AZURE_OPENAI_ENDPOINT` | `https://patri-moar8a1w-eastus2.services.ai.azure.com` |
| `AZURE_OPENAI_KEY` | *(new key — same as AZURE_OPENAI_API_KEY)* |
| `AZURE_OPENAI_API_KEY` | *(same as AZURE_OPENAI_KEY)* |
| `AZURE_OPENAI_DEPLOYMENT` | `gpt-oss-120b` |
| `AZURE_OPENAI_DEPLOYMENT_NAME` | `gpt-oss-120b` |
| `AZURE_OPENAI_DEPLOYMENT_ANALYSIS` | `gpt-oss-120b` |
| `AZURE_OPENAI_DEPLOYMENT_CHAT` | `gpt-oss-120b` |
| `AZURE_OPENAI_API_VERSION` | `2024-05-01-preview` |

> **Why all the deployment name variants?**
> case-companion's edge functions use `AZURE_OPENAI_DEPLOYMENT_NAME`.
> DiscoveryLens uses `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_DEPLOYMENT_ANALYSIS`, and `AZURE_OPENAI_DEPLOYMENT_CHAT`.
> All are set to the same value so both apps work identically.

> **Why is AZURE_OPENAI_ENDPOINT a base URL?**
> The Azure OpenAI SDK (used by DiscoveryLens) constructs the full path itself.
> The old `.env` had the full URL with `/models/chat/completions?api-version=...` — that was wrong and caused failures.

### Azure Document Intelligence (OCR)
| Variable | Value |
|---|---|
| `AZURE_DOC_INTELLIGENCE_ENDPOINT` | `https://casebuddy-ocr.cognitiveservices.azure.com/` |
| `AZURE_DOC_INTELLIGENCE_KEY` | *(from Azure portal → casebuddy-ocr resource)* |

### Azure Vision (image OCR fallback — synced with case-companion)
| Variable | Value |
|---|---|
| `AZURE_VISION_ENDPOINT` | `https://casebuddy.cognitiveservices.azure.com/` |
| `AZURE_VISION_KEY` | *(from Azure portal → casebuddy Vision resource)* |
| `AZURE_VISION_API_KEY` | *(same as AZURE_VISION_KEY)* |

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
