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
2. Copy [.env.example](.env.example) to `.env.local` and fill in:
   - `GEMINI_API_KEY` (Gemini API access)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` (Supabase database + storage)
   - `CLOUD_STORAGE_BUCKET`, `CLOUD_STORAGE_REGION`, `CLOUD_STORAGE_ACCESS_KEY`, `CLOUD_STORAGE_SECRET_KEY` (S3-compatible storage for uploads/manifests)
3. Run the app:
   `npm run dev`
