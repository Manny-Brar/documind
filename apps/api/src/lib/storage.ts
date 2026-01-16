import { Storage, GetSignedUrlConfig } from "@google-cloud/storage";

/**
 * Storage configuration
 */
interface StorageConfig {
  bucketName: string;
  projectId?: string;
  credentials?: object;
}

/**
 * Signed URL options
 */
interface SignedUrlOptions {
  /** Storage path within the bucket */
  storagePath: string;
  /** Content type for the upload */
  contentType: string;
  /** URL expiration time in minutes (default: 15) */
  expiresInMinutes?: number;
  /** File size limit in bytes */
  contentLengthLimit?: number;
}

/**
 * Signed URL result
 */
interface SignedUrlResult {
  uploadUrl: string;
  expiresAt: Date;
  headers: Record<string, string>;
}

/**
 * Download URL options
 */
interface DownloadUrlOptions {
  storagePath: string;
  expiresInMinutes?: number;
  responseDisposition?: string;
}

/**
 * Storage client singleton
 */
let storageClient: Storage | null = null;

/**
 * Get or create the GCS client
 */
function getStorageClient(): Storage | null {
  if (storageClient) {
    return storageClient;
  }

  // Check for credentials
  const credentialsJson = process.env.GCS_CREDENTIALS;
  const credentialsFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!credentialsJson && !credentialsFile) {
    console.warn("[Storage] No GCS credentials configured. File uploads will use fallback mode.");
    return null;
  }

  try {
    if (credentialsJson) {
      // Parse JSON credentials from environment variable
      const credentials = JSON.parse(credentialsJson);
      storageClient = new Storage({
        projectId: credentials.project_id,
        credentials,
      });
    } else {
      // Use default credentials file
      storageClient = new Storage();
    }

    console.log("[Storage] GCS client initialized successfully");
    return storageClient;
  } catch (error) {
    console.error("[Storage] Failed to initialize GCS client:", error);
    return null;
  }
}

/**
 * Get the configured bucket name
 */
export function getBucketName(): string {
  return process.env.GCS_BUCKET || "documind-documents";
}

/**
 * Check if GCS is properly configured
 */
export function isStorageConfigured(): boolean {
  return getStorageClient() !== null;
}

/**
 * Generate a signed URL for uploading a file to GCS
 */
export async function generateUploadUrl(options: SignedUrlOptions): Promise<SignedUrlResult | null> {
  const client = getStorageClient();

  if (!client) {
    // Return null to indicate fallback mode should be used
    return null;
  }

  const bucketName = getBucketName();
  const expiresInMinutes = options.expiresInMinutes ?? 15;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const signedUrlConfig: GetSignedUrlConfig = {
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType: options.contentType,
    // Allow browser to upload directly
    extensionHeaders: {
      "x-goog-content-length-range": `0,${options.contentLengthLimit ?? 100 * 1024 * 1024}`,
    },
  };

  try {
    const bucket = client.bucket(bucketName);
    const file = bucket.file(options.storagePath);

    const [url] = await file.getSignedUrl(signedUrlConfig);

    return {
      uploadUrl: url,
      expiresAt,
      headers: {
        "Content-Type": options.contentType,
      },
    };
  } catch (error) {
    console.error("[Storage] Failed to generate upload URL:", error);
    throw new Error("Failed to generate upload URL");
  }
}

/**
 * Generate a signed URL for downloading/viewing a file from GCS
 */
export async function generateDownloadUrl(options: DownloadUrlOptions): Promise<string | null> {
  const client = getStorageClient();

  if (!client) {
    return null;
  }

  const bucketName = getBucketName();
  const expiresInMinutes = options.expiresInMinutes ?? 60;
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);

  const signedUrlConfig: GetSignedUrlConfig = {
    version: "v4",
    action: "read",
    expires: expiresAt,
    ...(options.responseDisposition && {
      responseDisposition: options.responseDisposition,
    }),
  };

  try {
    const bucket = client.bucket(bucketName);
    const file = bucket.file(options.storagePath);

    const [url] = await file.getSignedUrl(signedUrlConfig);
    return url;
  } catch (error) {
    console.error("[Storage] Failed to generate download URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Delete a file from GCS
 */
export async function deleteFile(storagePath: string): Promise<boolean> {
  const client = getStorageClient();

  if (!client) {
    console.warn("[Storage] GCS not configured, skipping file deletion");
    return false;
  }

  const bucketName = getBucketName();

  try {
    const bucket = client.bucket(bucketName);
    const file = bucket.file(storagePath);

    await file.delete();
    console.log(`[Storage] Deleted file: ${storagePath}`);
    return true;
  } catch (error) {
    console.error("[Storage] Failed to delete file:", error);
    return false;
  }
}

/**
 * Check if a file exists in GCS
 */
export async function fileExists(storagePath: string): Promise<boolean> {
  const client = getStorageClient();

  if (!client) {
    return false;
  }

  const bucketName = getBucketName();

  try {
    const bucket = client.bucket(bucketName);
    const file = bucket.file(storagePath);

    const [exists] = await file.exists();
    return exists;
  } catch (error) {
    console.error("[Storage] Failed to check file existence:", error);
    return false;
  }
}

/**
 * Get file metadata from GCS
 */
export async function getFileMetadata(storagePath: string): Promise<{
  size: number;
  contentType: string;
  created: Date;
  updated: Date;
} | null> {
  const client = getStorageClient();

  if (!client) {
    return null;
  }

  const bucketName = getBucketName();

  try {
    const bucket = client.bucket(bucketName);
    const file = bucket.file(storagePath);

    const [metadata] = await file.getMetadata();

    return {
      size: parseInt(metadata.size as string, 10),
      contentType: metadata.contentType as string,
      created: new Date(metadata.timeCreated as string),
      updated: new Date(metadata.updated as string),
    };
  } catch (error) {
    console.error("[Storage] Failed to get file metadata:", error);
    return null;
  }
}

/**
 * Copy a file within GCS (useful for versioning)
 */
export async function copyFile(sourcePath: string, destinationPath: string): Promise<boolean> {
  const client = getStorageClient();

  if (!client) {
    return false;
  }

  const bucketName = getBucketName();

  try {
    const bucket = client.bucket(bucketName);
    const sourceFile = bucket.file(sourcePath);
    const destFile = bucket.file(destinationPath);

    await sourceFile.copy(destFile);
    console.log(`[Storage] Copied ${sourcePath} to ${destinationPath}`);
    return true;
  } catch (error) {
    console.error("[Storage] Failed to copy file:", error);
    return false;
  }
}

/**
 * Storage environment validation
 */
export function validateStorageEnv(): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for bucket name
  if (!process.env.GCS_BUCKET) {
    warnings.push("GCS_BUCKET not set, using default 'documind-documents'");
  }

  // Check for credentials
  const hasCredentials = process.env.GCS_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!hasCredentials) {
    warnings.push("No GCS credentials configured (GCS_CREDENTIALS or GOOGLE_APPLICATION_CREDENTIALS)");
    warnings.push("File uploads will use local fallback mode");
  } else if (process.env.GCS_CREDENTIALS) {
    // Validate JSON format
    try {
      const creds = JSON.parse(process.env.GCS_CREDENTIALS);
      if (!creds.project_id) {
        errors.push("GCS_CREDENTIALS missing 'project_id' field");
      }
      if (!creds.private_key) {
        errors.push("GCS_CREDENTIALS missing 'private_key' field");
      }
      if (!creds.client_email) {
        errors.push("GCS_CREDENTIALS missing 'client_email' field");
      }
    } catch {
      errors.push("GCS_CREDENTIALS is not valid JSON");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
