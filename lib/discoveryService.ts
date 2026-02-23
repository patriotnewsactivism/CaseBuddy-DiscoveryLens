import { DiscoveryFile } from './types';
import { sha256FromFile } from './checksum';

/**
 * Service layer for discovery operations with cloud storage
 */

// Project Operations
export async function createProject(name: string, description?: string, batesPrefix: string = 'DEF') {
  const response = await fetch('/api/projects', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description, batesPrefix }),
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
  const response = await fetch(`/api/projects/${projectId}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to fetch project');
  }

  return response.json();
}

export async function updateProject(projectId: string, updates: { name?: string; description?: string; batesCounter?: number }) {
  const response = await fetch(`/api/projects/${projectId}`, {
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

export async function listProjects() {
  const response = await fetch('/api/projects');

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to list projects');
  }

  return response.json();
}

// Document Operations
export async function saveDocumentToCloud(discoveryFile: DiscoveryFile, projectId: string) {
  try {
    const checksum = await sha256FromFile(discoveryFile.file);
    const formData = new FormData();
    formData.append('file', discoveryFile.file);
    formData.append('fileName', discoveryFile.name);
    formData.append('mimeType', discoveryFile.mimeType);
    formData.append('projectId', projectId);
    formData.append('batesNumber', discoveryFile.batesNumber.formatted);
    formData.append('checksum', checksum);

    const storageResponse = await fetch('/api/storage/upload', {
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
    const docResponse = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId,
        name: discoveryFile.name,
        mimeType: discoveryFile.mimeType,
        fileType: discoveryFile.type,
        fileSize: discoveryFile.file.size,
        batesPrefix: discoveryFile.batesNumber.prefix,
        batesNumber: discoveryFile.batesNumber.number,
        batesFormatted: discoveryFile.batesNumber.formatted,
        storagePath,
        analysis: discoveryFile.analysis,
        status: discoveryFile.isProcessing ? 'processing' : 'complete',
      }),
    });

    if (!docResponse.ok) {
      throw new Error('Failed to create document record');
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
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysis,
      status: 'complete',
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update document');
  }

  return response.json();
}

export async function updateDocumentStatus(documentId: string, status: 'processing' | 'complete' | 'failed', errorMessage?: string) {
  const response = await fetch(`/api/documents/${documentId}`, {
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
  const response = await fetch(`/api/documents/${documentId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete document');
  }

  return response.json();
}
