import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

interface StorageConfig {
  bucket: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
}

export const getStorageConfig = (): StorageConfig => {
  const bucket = process.env.CLOUD_STORAGE_BUCKET;
  const region = process.env.CLOUD_STORAGE_REGION;
  const accessKeyId = process.env.CLOUD_STORAGE_ACCESS_KEY;
  const secretAccessKey = process.env.CLOUD_STORAGE_SECRET_KEY;

  if (!bucket || !region || !accessKeyId || !secretAccessKey) {
    throw new Error('Missing cloud storage environment variables.');
  }

  return { bucket, region, accessKeyId, secretAccessKey };
};

export const createStorageClient = (config: StorageConfig) => {
  return new S3Client({
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
  });
};

export const getPresignedUploadUrl = async (
  client: S3Client,
  bucket: string,
  key: string,
  mimeType: string
) => {
  const command = new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: mimeType });
  return getSignedUrl(client, command, { expiresIn: 15 * 60 });
};

export const saveManifestObject = async (
  client: S3Client,
  bucket: string,
  key: string,
  manifest: unknown
) => {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: JSON.stringify(manifest, null, 2),
    ContentType: 'application/json',
  });

  await client.send(command);
};
