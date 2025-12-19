# DiscoveryLens Firebase Infrastructure Guide

This document adapts the Firebase setup plan to the current DiscoveryLens codebase so you can run the pipeline on Firebase/Google Cloud while keeping secrets out of the client. All credentials should be injected with environment variables or Firebase config; never commit keys to the repo or expose them to the browser.

## Prerequisites
- Firebase CLI installed and logged in (`firebase login`).
- Google Cloud SDK installed for Cloud Run and API enablement (`gcloud init`).
- Algolia account with Admin/Search keys stored in Firebase Functions config (never in client code).
- Docker available locally for the Cloud Run image build.

## Phase 1: Initialize Firebase Project
1. From the project root, run `firebase init` and select your existing project **casebuddy-discoverylens**.
2. Enable the following features: **Firestore**, **Functions (TypeScript)**, **Hosting**, **Storage**, and **Emulators** for local tests if desired.
3. Configure Functions to use TypeScript and ESLint, and install dependencies via npm when prompted.
4. In the Firebase Console, enable Authentication providers:
   - **Email/Password** (for OTP/email-link flows implemented server-side).
   - **Google** OAuth.
5. Commit the generated `firebase.json`, `firestore.rules`, `storage.rules`, and the `functions/` scaffold. Keep any secrets (API keys, service credentials) in `.env` files that are *not* committed.

## Phase 2: Data Storage & Security Rules
### Firestore (metadata & sharing)
- Create the Firestore database in your preferred region (e.g., `us-east4`).
- Use rules that restrict access to owners or explicitly authorized users. Example baseline:

```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /discoveryFiles/{fileId} {
      allow read: if request.auth != null && (resource.data.ownerId == request.auth.uid || resource.data.authorizedUserIds.hasAny([request.auth.uid]));
      allow write: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
  }
}
```

- Deploy with `firebase deploy --only firestore:rules` after adapting the path names to match your schema.

### Cloud Storage (raw files)
- Keep uploaded evidence in a dedicated bucket path such as `discoveryFiles/{ownerId}/{fileId}`.
- Lock down access so only the owner can read/write by default:

```rules
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /discoveryFiles/{ownerId}/{fileId} {
      allow read, write: if request.auth != null && request.auth.uid == ownerId;
    }
  }
}
```

- Deploy with `firebase deploy --only storage` and rely on signed URLs or Function-side checks for shared access.

## Phase 3: Automated Processing Pipeline
### Enable Google Cloud APIs
Use the Cloud Console or `gcloud services enable` to turn on: Document AI, Cloud Speech-to-Text, Vertex AI, Cloud Vision (if needed), Cloud Build, and Cloud Run for **casebuddy-discoverylens**.

### Cloud Functions (TypeScript)
Implement Functions inside `functions/src/`:
- **`onFileUploadTrigger`**: Storage trigger on `/uploads/{userId}/{fileName}` to detect type, route to Document AI or Speech-to-Text, call Vertex AI for summarization, assign Bates numbers, update Firestore metadata, and push to Algolia.
- **`onShareFile` (callable)**: Updates an `authorizedUserIds` array in Firestore when users share files.

Install required libraries within `functions/`:
```bash
cd functions
npm install @google-cloud/documentai @google-cloud/speech @google-cloud/aiplatform algoliasearch
```
Keep third-party secrets in Functions config (e.g., `firebase functions:config:set algolia.app_id="..." algolia.admin_key="..."`).
Deploy with `firebase deploy --only functions` after testing locally via `firebase emulators:start --only functions,firestore,storage`.

### Cloud Run for FFmpeg (audio extraction)
- Create a minimal Docker image (Node/Express or Python/Flask) that accepts a Storage path, extracts audio with FFmpeg, and writes back to Storage.
- Build and push to Artifact Registry: `gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/discoverylens/ffmpeg-service`.
- Deploy to Cloud Run with authenticated or internal-only access and pass the service URL to your Functions.

## Phase 4: Algolia Search
1. Store Algolia credentials in Functions config (never in client-side env).
2. In `onFileUploadTrigger`, index processed documents with `algoliasearch` using the Admin key.
3. Expose search to the web client with the Search-only key via a secure endpoint or environment injection on the server side.

## Environment & Security Checklist
- Do **not** expose Firebase/Algolia admin keys in client code; keep them in Functions config or server-side environment variables.
- Enforce Auth checks in every Function that reads/writes Firestore or Storage.
- Parameterize all external requests and sanitize user-provided filenames before passing to FFmpeg or storage paths.
- Add monitoring and budgets in the Google Cloud Console to catch runaway costs during processing.

## Validation Steps
- Run `firebase emulators:start --only functions,firestore,storage` locally to test upload, processing, and sharing flows.
- Deploy rules and Functions to a test project first, then promote to production.
- Confirm that Firestore documents and Storage objects reflect Bates numbers and sharing metadata before enabling Algolia indexing.
