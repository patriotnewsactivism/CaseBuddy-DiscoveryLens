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
 * Supabase generates signed URLs that expire in 15 minutes by default
 */
export const getPresignedUploadUrl = async (
  _client: StorageClient,
  _bucket: string,
  key: string,
  _mimeType: string
): Promise<string> => {
  const supabase = getSupabaseAdmin();

  // Create signed upload URL (15 minutes expiry)
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(key, 15 * 60, {
      upsert: true,
    });

  if (error) {
    throw new Error(`Failed to create signed upload URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error('No signed URL returned from Supabase');
  }

  return data.signedUrl;
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
