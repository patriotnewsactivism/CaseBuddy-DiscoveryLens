<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/15dMUw2d8YVa0Z564KGHLU5NLSy6byhYu

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and fill in your own credentials (do **not** use the placeholders):
   - `GEMINI_API_KEY` (Gemini API access)
   - `ASSEMBLYAI_API_KEY` (AssemblyAI transcription)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Supabase database + storage)
   - `CLOUD_STORAGE_BUCKET`, `CLOUD_STORAGE_REGION`, `CLOUD_STORAGE_ACCESS_KEY`, `CLOUD_STORAGE_SECRET_KEY` (S3-compatible storage for uploads/manifests)
   - Optional S3 overrides for non-AWS providers:
     - `CLOUD_STORAGE_ENDPOINT` (e.g., `https://storage.googleapis.com` for GCS interop)
     - `CLOUD_STORAGE_FORCE_PATH_STYLE` (set to `true` for providers that require path-style URLs)
3. Run the app:
   `npm run dev`

## Firebase deployment (optional)

If you prefer to run DiscoveryLens on Firebase/Google Cloud instead of Supabase, follow [FIREBASE_SETUP.md](FIREBASE_SETUP.md) for a complete, security-focused checklist that covers Firestore, Storage, Cloud Functions, Cloud Run (FFmpeg), and Algolia indexing. Keep all keys in Firebase config or server-side environments; never expose admin credentials to the client.
