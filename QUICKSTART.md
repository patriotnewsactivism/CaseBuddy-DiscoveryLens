# Quick Start Guide - Final Steps

## Your Status: Almost Ready! 🎯

✅ Gemini API configured
✅ Supabase credentials configured
✅ Dev server running on http://localhost:3000
⚠️ **NEXT STEP: Set up database schema (2 minutes)**

## Step 1: Run Database Schema

1. **Go to your Supabase dashboard**:
   - Visit https://supabase.com/dashboard
   - Select your project: `plcvjadartxntnurhcua`

2. **Open SQL Editor**:
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and paste the schema**:
   - Open the file `supabase/schema.sql` in this project
   - Copy ALL the contents (Ctrl+A, Ctrl+C)
   - Paste into the Supabase SQL Editor

4. **Run the schema**:
   - Click "Run" button (or press Ctrl+Enter)
   - Wait for success message: "Success. No rows returned"

This creates:
- `projects` table
- `documents` table
- `discovery-files` storage bucket
- Necessary indexes and security policies

## Step 2: Verify Storage Bucket

1. In Supabase dashboard, click **"Storage"** in sidebar
2. You should see a bucket named **`discovery-files`**
3. If it doesn't appear:
   - Click "New bucket"
   - Name: `discovery-files`
   - Public: OFF
   - Click "Create"

## Step 3: Test the Application

Your app is now ready! Test it:

1. **Open**: http://localhost:3000

2. **Upload test files**:
   - Click "Scrape Local Folder"
   - Select a folder with documents, images, or videos
   - Watch files appear with Bates numbers (DEF-0001, DEF-0002, etc.)

3. **Verify processing**:
   - Documents: Should show analysis (summary, entities, dates)
   - Audio/Video: Should show accurate transcription
   - All files: Should have status indicators

4. **Check cloud storage**:
   - Go to Supabase dashboard
   - **Table Editor** → `projects` - See your project
   - **Table Editor** → `documents` - See all uploaded files
   - **Storage** → `discovery-files` - See actual file data

## What Works Now

✅ **Document Analysis**: PDF, Word, text files analyzed by Gemini AI
✅ **Image Analysis**: Photos, screenshots analyzed for content
✅ **Audio Transcription**: Complete verbatim transcripts with timestamps
✅ **Video Transcription**: Audio extracted and transcribed
✅ **Bates Numbering**: Automatic sequential numbering (DEF-0001, DEF-0002...)
✅ **Cloud Storage**: All files saved to Supabase Storage
✅ **Database Persistence**: All metadata and analysis saved
✅ **Timeline View**: Chronological organization
✅ **AI Chat**: Query your evidence with Bates number citations
✅ **Search**: Find documents by content, entities, dates

## Features to Try

1. **Evidence Viewer**:
   - Click any file in the left sidebar
   - View analysis, transcription, entities
   - See preview of document/image

2. **Timeline**:
   - Click "TIMELINE" tab
   - View documents organized by date
   - Filter by time period

3. **AI Chat**:
   - Right sidebar - type questions like:
     - "Summarize all evidence"
     - "Who are the key witnesses?"
     - "Find contradictions"
     - "Create a timeline of events"
   - Responses cite Bates numbers [DEF-XXX]

4. **Terminal Mode**:
   - Click "TERMINAL_MODE"
   - Use CLI commands:
     - `hunt [keyword]` - Search for text
     - `ls` - List all files
     - `status` - Show processing status
     - `ask [question]` - Query evidence

## Troubleshooting

### "Failed to initialize cloud storage"
- Check that database schema was run successfully
- Verify Supabase credentials in `.env.local`
- Restart dev server: Stop (Ctrl+C) and run `npm run dev`

### Files upload but don't analyze
- Check browser console (F12) for errors
- Verify Gemini API key is correct
- Check terminal for API errors

### Storage bucket not found
- Verify bucket `discovery-files` exists in Supabase Storage
- If not, create it manually (see Step 2)
- Make sure schema.sql was run completely

### Analysis takes forever
- Large files (>10MB) take longer
- Video files need audio extraction first
- Check network connection to Gemini API
- Look for rate limit errors in console

## Production Deployment (Optional)

To deploy for real use:

1. **Deploy to Vercel**:
   ```bash
   npm install -g vercel
   vercel
   ```
   - Set environment variables in Vercel dashboard
   - Redeploy after setting vars

2. **Add Authentication** (recommended for multi-user):
   - Enable Supabase Auth (Email/Password or OAuth)
   - Update RLS policies to check user ID
   - Add login/signup UI

3. **Custom Domain**:
   - Add domain in Vercel settings
   - Update CORS settings in Supabase

## Next Features (Ideas)

- Export to PDF with Bates stamps
- Batch download signed URLs
- Advanced search with filters
- Document comparison
- OCR for scanned images
- Multi-project management UI
- Collaboration features
- Audit logs

## Support

- **Schema Issues**: See `SUPABASE_SETUP.md`
- **API Errors**: Check browser console and terminal
- **Supabase Docs**: https://supabase.com/docs
- **Gemini API Docs**: https://ai.google.dev/docs

---

**You're ready to go!** Run the schema, then start uploading evidence at http://localhost:3000
