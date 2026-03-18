import { getSupabaseAdmin } from './supabaseClient';

const STORAGE_BUCKET = 'discovery-files';

/**
 * Storage client type for Supabase
 * Supabase Storage uses the same interface regardless of backend
 */
export type StorageClient = ReturnType<typeof getSupabaseAdmin>['storage'];

/**
 * Get storage config (now a no-op since Supabase is pre-configured)
 * Kept for API compatibility
 */
export const getStorageConfig = () => {
  return {
    bucket: STORAGE_BUCKET,
  };
};

/**
 * Create storage client (wraps Supabase client)
 * Kept for API compatibility
 */
export const createStorageClient = async (): Promise<StorageClient> => {
  const supabase = getSupabaseAdmin();
  return supabase.storage;
};

/**
 * Get presigned upload URL for a file
 * Note: Supabase doesn't support presigned PUT URLs like S3.
 * Instead, we return a token that the client can use with the Supabase SDK.
 * For backward compatibility, we return a special marker URL.
 * The client should send files to the server instead.
 */
export const getPresignedUploadUrl = async (
  _client: StorageClient,
  _bucket: string,
  key: string,
  _mimeType: string
): Promise<string> => {
  // Supabase doesn't support presigned PUT URLs like S3
  // Return a marker URL; client should upload via /api/projects/upload instead
  return `supabase://${STORAGE_BUCKET}/${key}`;
};

/**
 * Save manifest object (JSON) to storage
 */
export const saveManifestObject = async (
  _client: StorageClient,
  _bucket: string,
  key: string,
  manifest: unknown
): Promise<void> => {
  const supabase = getSupabaseAdmin();
  const manifestJson = JSON.stringify(manifest, null, 2);

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(key, manifestJson, {
      contentType: 'application/json',
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to save manifest: ${error.message}`);
  }
};
