import { DiscoveryFile } from './types';
import { sha256FromFile } from './checksum';
import { authenticatedFetch } from './authenticatedFetch';

/**
 * Service layer for discovery operations with cloud storage
 */

// Project Operations
export async function createProject(name: string, description?: string, batesPrefix: string = 'DEF', caseId?: string | null) {
  const response = await authenticatedFetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, batesPrefix, caseId: caseId ?? null }),
  });

  if (!response.ok) {
    const error = await response.json();
    const errorMessage =
      typeof error === 'object' && error !== null
        ? error.details || error.error
        : undefined;
    throw new Error(errorMessage || 'Failed to create project');
  }

  return response.json();
}

export async function getProject(projectId: string) {
  const response = await authenticatedFetch(`/api/projects/${projectId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch project');
  }

  return response.json();
}

export async function updateProject(projectId: string, updates: { name?: string; description?: string; batesCounter?: number }) {
  const response = await authenticatedFetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update project');
  }

  return response.json();
}

/**
 * Atomically reserve a contiguous block of Bates numbers for a project
 * before assigning them to a batch of incoming files. Prevents the
 * race condition (and reload-resets-to-1 bug) that comes from tracking the
 * counter only in client-side React state.
 */
export async function reserveBatesNumbers(projectId: string, count: number): Promise<number> {
  const response = await authenticatedFetch(`/api/projects/${projectId}/reserve-bates`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to reserve Bates numbers' }));
    throw new Error(error.details ? `${error.error}: ${error.details}` : error.error || 'Failed to reserve Bates numbers');
  }

  const { startNumber } = await response.json();
  return startNumber as number;
}

export async function listProjects() {
  const response = await authenticatedFetch('/api/projects');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list projects');
  }

  return response.json();
}

// Document Operations
export async function saveDocumentToCloud(discoveryFile: DiscoveryFile, projectId: string, userId?: string) {
  try {
    if (!discoveryFile.file) {
      throw new Error('No local file handle available to upload');
    }
    const localFile = discoveryFile.file;
    const checksum = await sha256FromFile(localFile);
    const formData = new FormData();
    formData.append('file', localFile);
    formData.append('fileName', discoveryFile.name);
    formData.append('mimeType', discoveryFile.mimeType);
    formData.append('projectId', projectId);
    formData.append('batesNumber', discoveryFile.batesNumber.formatted);
    formData.append('checksum', checksum);

    const storageResponse = await authenticatedFetch('/api/storage/upload', {
      method: 'POST',
      body: formData,
    });

    if (!storageResponse.ok) {
      const error = await storageResponse.json().catch(() => ({ error: 'Failed to upload file to storage' }));
      const message = error.details ? `${error.error}: ${error.details}` : error.error || 'Failed to upload file to storage';
      throw new Error(message);
    }

    const { storagePath, signedUrl } = await storageResponse.json();

    // Step 2: Create document record in database
    const docResponse = await authenticatedFetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        name: discoveryFile.name,
        mimeType: discoveryFile.mimeType,
        fileType: discoveryFile.type,
        fileSize: localFile.size,
        batesPrefix: discoveryFile.batesNumber.prefix,
        batesNumber: discoveryFile.batesNumber.number,
        batesFormatted: discoveryFile.batesNumber.formatted,
        storagePath,
        analysis: discoveryFile.analysis,
        status: discoveryFile.isProcessing ? 'processing' : 'complete',
      }),
    });

    if (!docResponse.ok) {
      const errBody = await docResponse.json().catch(() => ({ error: 'Failed to create document record' }));
      const message = errBody.details ? `${errBody.error}: ${errBody.details}` : errBody.error || 'Failed to create document record';
      throw new Error(message);
    }

    const { document } = await docResponse.json();

    return {
      documentId: document.id,
      storagePath,
      signedUrl,
    };
  } catch (error) {
    console.error('Error saving document to cloud:', error);
    throw error;
  }
}

export async function updateDocumentAnalysis(documentId: string, analysis: any) {
  // Mirror key analysis fields into dedicated columns for CaseBuddy to query,
  // while also storing the full structured JSON in the analysis column.
  const response = await authenticatedFetch(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysis,
      status: 'complete',
      // Dedicated columns for easier querying from CaseBuddy and other consumers
      summary: analysis?.summary ?? null,
      keyFacts: analysis?.relevantFacts ?? null,
      extractedText: analysis?.transcription ?? null,
      evidenceType: analysis?.evidenceType ?? null,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update document');
  }

  return response.json();
}

export async function updateDocumentTags(documentId: string, tags: string[]) {
  const response = await authenticatedFetch(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tags }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Failed to update tags' }));
    throw new Error(error.details ? `${error.error}: ${error.details}` : error.error || 'Failed to update tags');
  }

  return response.json();
}

export async function updateDocumentStatus(documentId: string, status: 'processing' | 'complete' | 'failed', errorMessage?: string) {
  const response = await authenticatedFetch(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      status,
      errorMessage,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update document status');
  }

  return response.json();
}

export async function deleteDocument(documentId: string) {
  const response = await authenticatedFetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete document');
  }

  return response.json();
}
