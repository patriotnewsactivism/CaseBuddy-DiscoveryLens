/**
 * IndexedDB-based local persistence for DiscoveryLens projects.
 * Stores project state (files metadata + analysis) so work survives page refresh.
 * File blobs are stored separately to keep the metadata payload lean.
 */

import { AnalysisData, BatesNumber, CasePerspective, FileType } from './types';

const DB_NAME = 'DiscoveryLensDB';
const DB_VERSION = 1;
const STORE_PROJECTS = 'projects';
const STORE_FILES = 'fileBlobs';

export interface LocalProjectSnapshot {
  id: string; // project slug or name
  projectName: string;
  casePerspective: CasePerspective;
  batesCounter: number;
  savedAt: string;
  files: LocalFileRecord[];
}

export interface LocalFileRecord {
  id: string;
  name: string;
  type: FileType;
  mimeType: string;
  batesNumber: BatesNumber;
  isProcessing: boolean;
  analysis: AnalysisData | null;
  analysisError?: string | null;
  tags?: string[];
  customFields?: Record<string, unknown>;
  cloudDocumentId?: string;
  storagePath?: string;
  signedUrl?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES); // keyed by fileId
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/** Save the full project snapshot (metadata only – no blobs). */
export async function saveProjectLocally(snapshot: LocalProjectSnapshot): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readwrite');
    tx.objectStore(STORE_PROJECTS).put(snapshot);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Save a single file blob by its id. */
export async function saveFileBlob(fileId: string, blob: Blob): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readwrite');
    tx.objectStore(STORE_FILES).put(blob, fileId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/** Load a file blob by its id. */
export async function loadFileBlob(fileId: string): Promise<Blob | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_FILES, 'readonly');
    const req = tx.objectStore(STORE_FILES).get(fileId);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

/** List all saved project snapshots (most recent first). */
export async function listLocalProjects(): Promise<LocalProjectSnapshot[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).getAll();
    req.onsuccess = () => {
      const results = (req.result as LocalProjectSnapshot[]) || [];
      results.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
      resolve(results);
    };
    req.onerror = () => reject(req.error);
  });
}

/** Load a specific project snapshot by id. */
export async function loadLocalProject(id: string): Promise<LocalProjectSnapshot | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROJECTS, 'readonly');
    const req = tx.objectStore(STORE_PROJECTS).get(id);
    req.onsuccess = () => resolve(req.result ?? undefined);
    req.onerror = () => reject(req.error);
  });
}

/** Delete a project and its associated file blobs. */
export async function deleteLocalProject(id: string): Promise<void> {
  const db = await openDB();
  // First load to get file ids
  const snapshot = await loadLocalProject(id);
  return new Promise((resolve, reject) => {
    const stores = [STORE_PROJECTS, STORE_FILES];
    const tx = db.transaction(stores, 'readwrite');
    tx.objectStore(STORE_PROJECTS).delete(id);
    if (snapshot) {
      const blobStore = tx.objectStore(STORE_FILES);
      for (const f of snapshot.files) {
        blobStore.delete(f.id);
      }
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
