/**
 * Google Drive Picker integration for DiscoveryLens.
 *
 * Uses the Google Picker API to let users select files/folders from their
 * Google Drive and download them as File objects that plug directly into
 * the existing processing pipeline.
 *
 * Required env vars (browser-safe, NEXT_PUBLIC_ prefixed):
 *   NEXT_PUBLIC_GOOGLE_CLIENT_ID   – OAuth 2.0 Client ID
 *   NEXT_PUBLIC_GOOGLE_API_KEY     – API key with Drive + Picker APIs enabled
 *   NEXT_PUBLIC_GOOGLE_APP_ID      – Google Cloud project number (for Picker)
 */

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY ?? '';
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID ?? '';
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let accessToken: string | null = null;

// ─── Script Loaders ──────────────────────────────────────────────────────────

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function ensureGapi(): Promise<void> {
  if (gapiLoaded) return;
  await loadScript('https://apis.google.com/js/api.js');
  await new Promise<void>((resolve) => gapi.load('picker', () => resolve()));
  gapiLoaded = true;
}

async function ensureGis(): Promise<void> {
  if (gisLoaded) return;
  await loadScript('https://accounts.google.com/gsi/client');
  gisLoaded = true;
}

// ─── Auth ────────────────────────────────────────────────────────────────────

function getAccessToken(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (accessToken) { resolve(accessToken); return; }
    if (!tokenClient) {
      tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response: google.accounts.oauth2.TokenResponse) => {
          if (response.error) { reject(new Error(response.error)); return; }
          accessToken = response.access_token;
          resolve(response.access_token);
        },
      });
    }
    tokenClient.requestAccessToken({ prompt: '' });
  });
}

// ─── Picker ──────────────────────────────────────────────────────────────────

export interface DrivePickerResult {
  files: File[];
}

/**
 * Open the Google Drive Picker and return selected files as File objects.
 * Supports selecting individual files or entire folders.
 */
export async function openGoogleDrivePicker(): Promise<DrivePickerResult> {
  if (!CLIENT_ID || !API_KEY) {
    throw new Error('Google Drive integration is not configured. Set NEXT_PUBLIC_GOOGLE_CLIENT_ID and NEXT_PUBLIC_GOOGLE_API_KEY in your environment.');
  }

  await Promise.all([ensureGapi(), ensureGis()]);
  const token = await getAccessToken();

  return new Promise((resolve, reject) => {
    const docsView = new google.picker.DocsView()
      .setIncludeFolders(true)
      .setSelectFolderEnabled(true)
      .setMimeTypes(''); // all file types

    const picker = new google.picker.PickerBuilder()
      .addView(docsView)
      .addView(new google.picker.DocsView().setIncludeFolders(true).setSelectFolderEnabled(false))
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(token)
      .setDeveloperKey(API_KEY)
      .setAppId(APP_ID)
      .setCallback(async (data: google.picker.ResponseObject) => {
        if (data.action === google.picker.Action.PICKED) {
          try {
            const files = await downloadPickedItems(data.docs, token);
            resolve({ files });
          } catch (err) {
            reject(err);
          }
        } else if (data.action === google.picker.Action.CANCEL) {
          resolve({ files: [] });
        }
      })
      .build();

    picker.setVisible(true);
  });
}

// ─── Download Helpers ────────────────────────────────────────────────────────

async function downloadPickedItems(docs: google.picker.DocumentObject[], token: string): Promise<File[]> {
  const allFiles: File[] = [];

  for (const doc of docs) {
    if (doc.mimeType === 'application/vnd.google-apps.folder') {
      const folderFiles = await listFolderFiles(doc.id, token);
      const downloaded = await Promise.all(folderFiles.map((f) => downloadDriveFile(f.id, f.name, f.mimeType, token)));
      allFiles.push(...downloaded.filter((f): f is File => f !== null));
    } else if (doc.mimeType?.startsWith('application/vnd.google-apps.')) {
      // Google Workspace file – export to a standard format
      const exported = await exportGoogleDoc(doc.id, doc.name, doc.mimeType, token);
      if (exported) allFiles.push(exported);
    } else {
      const file = await downloadDriveFile(doc.id, doc.name, doc.mimeType, token);
      if (file) allFiles.push(file);
    }
  }

  return allFiles;
}

interface DriveFileInfo {
  id: string;
  name: string;
  mimeType: string;
}

async function listFolderFiles(folderId: string, token: string): Promise<DriveFileInfo[]> {
  const files: DriveFileInfo[] = [];
  let pageToken = '';

  do {
    const url = new URL('https://www.googleapis.com/drive/v3/files');
    url.searchParams.set('q', `'${folderId}' in parents and trashed = false`);
    url.searchParams.set('fields', 'nextPageToken, files(id, name, mimeType)');
    url.searchParams.set('pageSize', '100');
    if (pageToken) url.searchParams.set('pageToken', pageToken);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) break;
    const data = await res.json();
    files.push(...(data.files || []));
    pageToken = data.nextPageToken || '';
  } while (pageToken);

  return files;
}

async function downloadDriveFile(fileId: string, name: string, mimeType: string, token: string): Promise<File | null> {
  try {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return new File([blob], name, { type: mimeType || 'application/octet-stream' });
  } catch {
    console.warn(`Failed to download ${name} from Drive`);
    return null;
  }
}

const EXPORT_MAP: Record<string, { mime: string; ext: string }> = {
  'application/vnd.google-apps.document': { mime: 'application/pdf', ext: '.pdf' },
  'application/vnd.google-apps.spreadsheet': { mime: 'text/csv', ext: '.csv' },
  'application/vnd.google-apps.presentation': { mime: 'application/pdf', ext: '.pdf' },
  'application/vnd.google-apps.drawing': { mime: 'image/png', ext: '.png' },
};

async function exportGoogleDoc(fileId: string, name: string, mimeType: string, token: string): Promise<File | null> {
  const mapping = EXPORT_MAP[mimeType];
  if (!mapping) return null;

  try {
    const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(mapping.mime)}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    const exportName = name.endsWith(mapping.ext) ? name : `${name}${mapping.ext}`;
    return new File([blob], exportName, { type: mapping.mime });
  } catch {
    console.warn(`Failed to export ${name} from Drive`);
    return null;
  }
}

// ─── Availability Check ──────────────────────────────────────────────────────

/** Returns true if Google Drive integration env vars are configured. */
export function isGoogleDriveConfigured(): boolean {
  return !!(CLIENT_ID && API_KEY);
}
