# Supabase Setup Guide

This guide will walk you through setting up Supabase cloud storage for DiscoveryLens.

## Prerequisites

- A Supabase account (sign up at https://supabase.com)
- Node.js and npm installed
- Git (optional)

## Step 1: Create a Supabase Project

1. Go to https://supabase.com and sign in
2. Click "New Project"
3. Fill in:
   - **Name**: `discoverylens` (or any name you prefer)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to your location
4. Click "Create new project"
5. Wait 2-3 minutes for your project to be provisioned

## Step 2: Get Your Supabase Credentials

1. In your Supabase project dashboard, click on "Project Settings" (gear icon in sidebar)
2. Go to "API" section
3. You'll see:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`
   - **service_role key**: Another long string (click "Reveal" to see it)

## Step 3: Configure Environment Variables

1. Open `.env.local` in your project root
2. Replace the placeholder values with your actual Supabase credentials:

```env
GEMINI_API_KEY=AIzaSyDMZHIOMaIdvvm0n7NVi73O8HRmnY6THbY

# Supabase Configuration (client-side)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Supabase Service Role Key (server-side only - DO NOT expose to client)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**IMPORTANT**:
- Copy the **Project URL** to `NEXT_PUBLIC_SUPABASE_URL`
- Copy the **anon public** key to `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Copy the **service_role** key to `SUPABASE_SERVICE_ROLE_KEY`

## Step 4: Set Up Database Schema

1. In your Supabase dashboard, click on "SQL Editor" in the sidebar
2. Click "New Query"
3. Copy the contents of `supabase/schema.sql` in this project
4. Paste it into the SQL editor
5. Click "Run" to execute the schema

This will create:
- `projects` table - stores project metadata
- `documents` table - stores document metadata and analysis results
- `discovery-files` storage bucket - stores the actual files
- Necessary indexes and Row-Level Security policies

## Step 5: Verify Storage Bucket

1. In your Supabase dashboard, click on "Storage" in the sidebar
2. You should see a bucket named `discovery-files`
3. If it doesn't exist, create it manually:
   - Click "New bucket"
   - Name: `discovery-files`
   - Public: OFF (keep it private)
   - Click "Create bucket"

## Step 6: Test the Application

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open http://localhost:3000

3. Upload a test file:
   - Click "Scrape Local Folder"
   - Select a folder with some documents, images, or videos
   - Watch the console for success messages

4. Verify in Supabase:
   - Go to Supabase dashboard → "Table Editor"
   - Check `projects` table - you should see a new project
   - Check `documents` table - you should see your uploaded files
   - Go to "Storage" → `discovery-files` - you should see the files

## Troubleshooting

### Error: "Missing Supabase environment variables"

**Solution**: Make sure `.env.local` has the correct values and restart your dev server (`npm run dev`)

### Error: "Failed to initialize cloud storage"

**Solution**:
1. Check that your Supabase credentials are correct
2. Verify the project URL doesn't have a trailing slash
3. Make sure you're using the correct keys (anon vs service_role)

### Error: "Failed to upload file to storage"

**Solution**:
1. Verify the storage bucket `discovery-files` exists
2. Check that RLS policies are set up correctly (run `schema.sql` again)
3. Ensure the service role key is correct in `.env.local`

### Database schema not created

**Solution**:
1. Make sure you ran the `schema.sql` in the SQL Editor
2. Check for any SQL errors in the SQL Editor output
3. Try running the schema in sections if it fails

### Files uploaded but not visible in Storage

**Solution**:
1. Check the Storage bucket name is exactly `discovery-files`
2. Verify the RLS policies allow read/write access
3. Look at browser console for errors

## Security Notes

- **Never commit `.env.local`** to version control
- The `service_role` key bypasses Row-Level Security - keep it secret
- The `anon` key is safe to expose in the browser (it respects RLS policies)
- In production, implement proper authentication and user-based RLS policies

## Next Steps

Once Supabase is set up, you can:
- View all your projects at `/api/projects`
- Load a specific project with all its documents
- Files are automatically saved to cloud storage on upload
- Analysis results are persisted and can be retrieved later

## Advanced: Authentication (Optional)

To add user authentication:

1. In Supabase dashboard, go to "Authentication" → "Providers"
2. Enable Email/Password or other providers (Google, GitHub, etc.)
3. Update RLS policies in `schema.sql` to check for authenticated users
4. Add authentication to your Next.js app using Supabase Auth

See Supabase Auth docs: https://supabase.com/docs/guides/auth

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check the terminal where `npm run dev` is running
3. Check Supabase project logs (Settings → Logs)
4. Consult Supabase docs: https://supabase.com/docs
