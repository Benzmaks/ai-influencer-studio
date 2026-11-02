export type StorageActor = { userId: string; projectId: string };
export type StoredObject = { key: string; mimeType: string; size: number; checksum: string };
export interface StorageProvider {
  put(actor: StorageActor, data: Uint8Array, mimeType: string): Promise<StoredObject>;
  read(actor: StorageActor, key: string): Promise<Uint8Array>;
  delete(actor: StorageActor, key: string): Promise<void>;
}
// Production adapter contract only; S3 transport is not implemented in Phase 1.
export interface S3StorageConfiguration {
  endpoint: string;
  region: string;
  bucket: string;
  credentials?: { accessKeyId: string; secretAccessKey: string };
}
export interface S3CompatibleStorageProvider extends StorageProvider {
  signedDownload(actor: StorageActor, key: string, expiresInSeconds: number): Promise<string>;
}
