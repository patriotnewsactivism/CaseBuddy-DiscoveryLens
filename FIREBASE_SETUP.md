# DiscoveryLens Firebase Infrastructure Guide

Use this guide to run DiscoveryLens on Firebase/Google Cloud with a secure, automated processing pipeline. Keep **all** secrets in Firebase config or server-side environment variables—never in client code or source control.

## Prerequisites
- Firebase CLI installed and logged in (`firebase login`).
- Google Cloud SDK installed (`gcloud init`).
- Algolia account (Admin/Search keys set via Functions config only).
- Docker available for building the Cloud Run image.

## Phase 1: Initialize the Firebase project
1. From the repo root, run `firebase init` and select the existing project **casebuddy-discoverylens**. Enable **Firestore**, **Functions (TypeScript + ESLint)**, **Hosting**, **Storage**, and optionally **Emulators** for local tests.
2. Commit generated scaffolding (`firebase.json`, `firestore.rules`, `storage.rules`, `functions/`, and `.firebaserc`). Keep secrets in untracked `.env` files and Firebase config.
3. Enable auth providers in the Firebase Console:
   - **Email/Password** for OTP/email-link flows handled server-side.
   - **Google** OAuth.

## Phase 2: Security rules for data and files
### Firestore rules (`firestore.rules`)
```rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /discoveryFiles/{fileId} {
      allow read: if request.auth != null && (
        resource.data.ownerId == request.auth.uid ||
        resource.data.authorizedUserIds.hasAny([request.auth.uid])
      );
      allow write: if request.auth != null && resource.data.ownerId == request.auth.uid;
    }
  }
}
```
Deploy after adapting collection names to your schema:
```bash
firebase deploy --only firestore:rules
```

### Storage rules (`storage.rules`)
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
Deploy:
```bash
firebase deploy --only storage
```
Use signed URLs or Function-side checks for shared access; do not grant public reads.

## Phase 3: Cloud Functions (TypeScript)
1. Install runtime dependencies inside `functions/`:
   ```bash
   cd functions
   npm install @google-cloud/documentai @google-cloud/speech @google-cloud/aiplatform algoliasearch
   ```
2. Store secrets in Functions config (never in client env):
   ```bash
   firebase functions:config:set \
     algolia.app_id="YOUR_APP_ID" \
     algolia.admin_key="YOUR_ADMIN_KEY" \
     services.ffmpeg_url="https://<cloud-run-service-url>" \
     services.documentai_processor="projects/.../locations/.../processors/..."
   ```
3. Implement triggers in `functions/src/`:
   - **`onFileUploadTrigger`** (Storage trigger on `/uploads/{userId}/{fileName}`): detect file type, route to Document AI or Speech-to-Text, call Vertex AI for summarization, assign Bates numbers, update Firestore, and push to Algolia.
   - **`onShareFile`** (callable): update `authorizedUserIds` in Firestore when sharing.
4. Test locally with emulators:
   ```bash
   firebase emulators:start --only functions,firestore,storage
   ```
5. Deploy after tests pass:
   ```bash
   firebase deploy --only functions
   ```

## Phase 4: Cloud Run service for FFmpeg
1. Create a minimal service (Node/Express or Python/Flask) that accepts a Storage path, extracts audio with FFmpeg, writes back to Storage, and validates an auth token from Functions.
2. Build and push to Artifact Registry:
   ```bash
   gcloud builds submit --tag REGION-docker.pkg.dev/PROJECT/discoverylens/ffmpeg-service
   ```
3. Deploy to Cloud Run with authenticated or internal-only access:
   ```bash
   gcloud run deploy discoverylens-ffmpeg \
     --image REGION-docker.pkg.dev/PROJECT/discoverylens/ffmpeg-service \
     --region REGION \
     --allow-unauthenticated=false
   ```
4. Store the Cloud Run URL in Functions config (`services.ffmpeg_url`).

## Phase 5: Enable required Google Cloud APIs
Enable the following for **casebuddy-discoverylens**:
```bash
gcloud services enable documentai.googleapis.com speech.googleapis.com aiplatform.googleapis.com \
  vision.googleapis.com cloudbuild.googleapis.com run.googleapis.com
gcloud services enable firebase.googleapis.com firestore.googleapis.com storage.googleapis.com
```

## Phase 6: Algolia search integration
1. Keep Algolia Admin/Search keys in Functions config only.
2. From `onFileUploadTrigger`, index processed records with `algoliasearch` using the Admin key.
3. Serve search results to the client via a secure endpoint or by injecting only the Search-only key from a trusted server context.

## Phase 7: Validation and safeguards
- Run the emulators to validate upload → processing → Firestore update → Algolia indexing end-to-end.
- Verify Firestore documents contain Bates numbers and sharing metadata before enabling search.
- Enforce auth checks in every Function; log and reject unauthenticated calls.
- Sanitize user-provided filenames/paths before using FFmpeg or Storage operations.
- Set budgets/alerts in Google Cloud to catch runaway costs during processing.
- Keep service account JSON and any private keys out of the repo; load them via env or workload identity.
