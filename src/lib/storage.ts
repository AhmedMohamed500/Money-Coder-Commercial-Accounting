import { mkdir, readFile, readdir, stat, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandOutput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { privateStorageConfiguration } from "@/lib/config";

export { validateUpload } from "@/lib/document-files";

export type StorageObjectMetadata = {
  organizationId: string;
  uploadedById: string;
  uploadId: string;
  declaredMime: string;
  declaredSize: string;
};

export type StoredObject = {
  bytes: Buffer;
  contentType: string;
  sizeBytes: number;
  metadata: StorageObjectMetadata;
};

export type UploadTarget = { url: string; method: "PUT"; headers: Record<string, string> };
export type StorageAvailability = { available: boolean; state: "connected" | "misconfigured" | "unavailable" | "development-only" };

export class StorageOperationError extends Error {
  constructor(
    public readonly code: "misconfigured" | "unavailable" | "not-found" | "conflict" | "quota" | "invalid-object" | "delete-pending",
    public readonly retryable = false,
  ) {
    super(code);
  }
}

export interface PrivateStorageAdapter {
  readonly provider: string;
  availability(): Promise<StorageAvailability>;
  createUploadTarget(key: string, contentType: string, metadata: StorageObjectMetadata, expiresIn: number): Promise<UploadTarget>;
  putObject(key: string, bytes: Buffer, contentType: string, metadata: StorageObjectMetadata): Promise<void>;
  headObject(key: string): Promise<Omit<StoredObject, "bytes"> | null>;
  readObject(key: string): Promise<StoredObject>;
  promoteObject(pendingKey: string, finalKey: string, contentType: string, metadata: StorageObjectMetadata): Promise<void>;
  deleteObject(key: string): Promise<void>;
  listPendingObjects(organizationId: string): Promise<Array<{ key: string; lastModified: Date }>>;
  createDownloadUrl(key: string, filename: string, contentType: string, expiresIn: number): Promise<string | null>;
}

const OBJECT_KEY = /^organizations\/([0-9a-f-]{36})\/(?:pending\/)?([0-9a-f-]{36})$/i;

export function assertOrganizationObjectKey(key: string, organizationId: string) {
  const match = OBJECT_KEY.exec(key);
  if (!match || match[1].toLowerCase() !== organizationId.toLowerCase()) throw new StorageOperationError("invalid-object");
}

function mapMetadata(metadata: Record<string, string> | undefined): StorageObjectMetadata {
  return {
    organizationId: metadata?.["organization-id"] ?? "",
    uploadedById: metadata?.["uploaded-by"] ?? "",
    uploadId: metadata?.["upload-id"] ?? "",
    declaredMime: metadata?.["declared-mime"] ?? "",
    declaredSize: metadata?.["declared-size"] ?? "",
  };
}

function s3Metadata(metadata: StorageObjectMetadata) {
  return {
    "organization-id": metadata.organizationId,
    "uploaded-by": metadata.uploadedById,
    "upload-id": metadata.uploadId,
    "declared-mime": metadata.declaredMime,
    "declared-size": metadata.declaredSize,
  };
}

function metadataHeaders(metadata: StorageObjectMetadata) {
  return Object.fromEntries(Object.entries(s3Metadata(metadata)).map(([key, value]) => [`x-amz-meta-${key}`, value]));
}

function statusCode(cause: unknown) {
  if (!cause || typeof cause !== "object" || !("$metadata" in cause) || !cause.$metadata || typeof cause.$metadata !== "object" || !("httpStatusCode" in cause.$metadata)) return 0;
  return Number(cause.$metadata.httpStatusCode);
}

function errorName(cause: unknown) {
  return cause && typeof cause === "object" && "name" in cause ? String(cause.name) : "";
}

function isNotFound(cause: unknown) {
  return statusCode(cause) === 404 || ["NotFound", "NoSuchKey"].includes(errorName(cause));
}

function mapStorageFailure(cause: unknown): StorageOperationError {
  if (cause instanceof StorageOperationError) return cause;
  if (isNotFound(cause)) return new StorageOperationError("not-found");
  if (["QuotaExceeded", "SlowDown"].includes(errorName(cause)) || statusCode(cause) === 507) return new StorageOperationError("quota", true);
  return new StorageOperationError("unavailable", statusCode(cause) >= 500 || statusCode(cause) === 0);
}

async function bodyToBuffer(body: GetObjectCommandOutput["Body"]) {
  if (!body || typeof body.transformToByteArray !== "function") throw new StorageOperationError("unavailable", true);
  return Buffer.from(await body.transformToByteArray());
}

class NeonStorageAdapter implements PrivateStorageAdapter {
  readonly provider = "neon";
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const config = privateStorageConfiguration();
    if (!config.configured || !config.details) throw new StorageOperationError("misconfigured");
    this.bucket = config.details.bucket;
    this.client = new S3Client({
      region: config.details.region,
      endpoint: config.details.endpoint,
      forcePathStyle: true,
      credentials: { accessKeyId: config.details.accessKeyId, secretAccessKey: config.details.secretAccessKey },
      maxAttempts: 3,
    });
  }

  private async run<T>(operation: (signal: AbortSignal) => Promise<T>) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    try { return await operation(controller.signal); }
    catch (cause) { throw mapStorageFailure(cause); }
    finally { clearTimeout(timeout); }
  }

  async availability(): Promise<StorageAvailability> {
    try {
      await this.run(signal => this.client.send(new HeadBucketCommand({ Bucket: this.bucket }), { abortSignal: signal }));
      return { available: true, state: "connected" };
    } catch (cause) {
      const error = mapStorageFailure(cause);
      return { available: false, state: error.code === "misconfigured" ? "misconfigured" : "unavailable" };
    }
  }

  async createUploadTarget(key: string, contentType: string, metadata: StorageObjectMetadata, expiresIn: number) {
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType, Metadata: s3Metadata(metadata), CacheControl: "private, no-store" });
    try {
      const url = await getSignedUrl(this.client, command, { expiresIn });
      return { url, method: "PUT" as const, headers: { "content-type": contentType, ...metadataHeaders(metadata) } };
    } catch (cause) { throw mapStorageFailure(cause); }
  }

  async putObject(key: string, bytes: Buffer, contentType: string, metadata: StorageObjectMetadata) {
    await this.run(signal => this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType, ContentLength: bytes.length, Metadata: s3Metadata(metadata), CacheControl: "private, no-store" }), { abortSignal: signal }));
  }

  async headObject(key: string) {
    try {
      const output = await this.run(signal => this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal }));
      return { contentType: output.ContentType ?? "", sizeBytes: output.ContentLength ?? 0, metadata: mapMetadata(output.Metadata) };
    } catch (cause) {
      if (cause instanceof StorageOperationError && cause.code === "not-found") return null;
      throw mapStorageFailure(cause);
    }
  }

  async readObject(key: string) {
    const output = await this.run(signal => this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal }));
    const bytes = await bodyToBuffer(output.Body);
    return { bytes, contentType: output.ContentType ?? "", sizeBytes: bytes.length, metadata: mapMetadata(output.Metadata) };
  }

  async promoteObject(pendingKey: string, finalKey: string, contentType: string, metadata: StorageObjectMetadata) {
    if (await this.headObject(finalKey)) throw new StorageOperationError("conflict");
    const encodedSource = `${this.bucket}/${pendingKey.split("/").map(encodeURIComponent).join("/")}`;
    await this.run(signal => this.client.send(new CopyObjectCommand({ Bucket: this.bucket, Key: finalKey, CopySource: encodedSource, ContentType: contentType, ContentDisposition: "attachment", CacheControl: "private, no-store", MetadataDirective: "REPLACE", Metadata: s3Metadata(metadata) }), { abortSignal: signal }));
  }

  async deleteObject(key: string) {
    await this.run(signal => this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }), { abortSignal: signal }));
    if (await this.headObject(key)) throw new StorageOperationError("delete-pending", true);
  }

  async listPendingObjects(organizationId: string) {
    const prefix = `organizations/${organizationId}/pending/`;
    const output = await this.run(signal => this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, Prefix: prefix, MaxKeys: 100 }), { abortSignal: signal }));
    return (output.Contents ?? []).flatMap(item => item.Key && item.LastModified ? [{ key: item.Key, lastModified: item.LastModified }] : []);
  }

  async createDownloadUrl(key: string, filename: string, contentType: string, expiresIn: number) {
    try {
      return await getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: key, ResponseContentType: contentType, ResponseContentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`, ResponseCacheControl: "private, no-store" }), { expiresIn });
    } catch (cause) { throw mapStorageFailure(cause); }
  }
}

const LOCAL_STORAGE_ROOT = path.join(process.cwd(), "storage");

function localStorageRoot() {
  if (process.env.NODE_ENV === "production") throw new StorageOperationError("misconfigured");
  return process.env.PRIVATE_STORAGE_PATH ? path.resolve(process.env.PRIVATE_STORAGE_PATH) : LOCAL_STORAGE_ROOT;
}

function safeLocalPath(key: string) {
  if (!OBJECT_KEY.test(key)) throw new StorageOperationError("invalid-object");
  const root = localStorageRoot();
  const target = path.resolve(root, ...key.split("/"));
  if (!target.startsWith(`${root}${path.sep}`)) throw new StorageOperationError("invalid-object");
  return target;
}

function sidecarPath(target: string) { return `${target}.metadata.json`; }

class LocalStorageAdapter implements PrivateStorageAdapter {
  readonly provider = "local-dev";
  async availability() { return { available: true, state: "development-only" as const }; }
  async createUploadTarget(_key: string, contentType: string) { return { url: "/api/private-storage/uploads", method: "PUT" as const, headers: { "content-type": contentType } }; }
  async putObject(key: string, bytes: Buffer, contentType: string, metadata: StorageObjectMetadata) {
    const target = safeLocalPath(key);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes, { flag: "wx" }).catch(cause => { throw cause && typeof cause === "object" && "code" in cause && cause.code === "EEXIST" ? new StorageOperationError("conflict") : mapStorageFailure(cause); });
    await writeFile(sidecarPath(target), JSON.stringify({ contentType, metadata }), { flag: "wx" }).catch(async cause => { await unlink(target).catch(() => undefined); throw mapStorageFailure(cause); });
  }
  async headObject(key: string) {
    const target = safeLocalPath(key);
    try {
      const [details, sidecar] = await Promise.all([stat(target), readFile(sidecarPath(target), "utf8")]);
      const parsed = JSON.parse(sidecar) as { contentType: string; metadata: StorageObjectMetadata };
      return { contentType: parsed.contentType, sizeBytes: details.size, metadata: parsed.metadata };
    } catch (cause) {
      if (cause && typeof cause === "object" && "code" in cause && cause.code === "ENOENT") return null;
      throw mapStorageFailure(cause);
    }
  }
  async readObject(key: string) {
    const head = await this.headObject(key);
    if (!head) throw new StorageOperationError("not-found");
    return { ...head, bytes: await readFile(safeLocalPath(key)) };
  }
  async promoteObject(pendingKey: string, finalKey: string, contentType: string, metadata: StorageObjectMetadata) {
    if (await this.headObject(finalKey)) throw new StorageOperationError("conflict");
    const target = safeLocalPath(finalKey);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, await readFile(safeLocalPath(pendingKey)), { flag: "wx" });
    await writeFile(sidecarPath(target), JSON.stringify({ contentType, metadata }), { flag: "wx" }).catch(async cause => { await unlink(target).catch(() => undefined); throw mapStorageFailure(cause); });
  }
  async deleteObject(key: string) {
    const target = safeLocalPath(key);
    await Promise.all([unlink(target).catch(cause => { if (!(cause && typeof cause === "object" && "code" in cause && cause.code === "ENOENT")) throw mapStorageFailure(cause); }), unlink(sidecarPath(target)).catch(() => undefined)]);
  }
  async listPendingObjects(organizationId: string) {
    const folder = path.join(localStorageRoot(), "organizations", organizationId, "pending");
    try {
      const names = await readdir(folder);
      return Promise.all(names.filter(name => /^[0-9a-f-]{36}$/i.test(name)).map(async name => ({ key: `organizations/${organizationId}/pending/${name}`, lastModified: (await stat(path.join(folder, name))).mtime })));
    } catch (cause) {
      if (cause && typeof cause === "object" && "code" in cause && cause.code === "ENOENT") return [];
      throw mapStorageFailure(cause);
    }
  }
  async createDownloadUrl() { return null; }
}

type MemoryObject = { bytes: Buffer; contentType: string; metadata: StorageObjectMetadata; lastModified: Date };
const memoryObjects = new Map<string, MemoryObject>();
const testFailures = { unavailable: false, failDelete: false, failPromote: false };

class TestMemoryStorageAdapter implements PrivateStorageAdapter {
  readonly provider = "test-memory";
  private check() { if (testFailures.unavailable) throw new StorageOperationError("unavailable", true); }
  async availability() { return testFailures.unavailable ? { available: false, state: "unavailable" as const } : { available: true, state: "connected" as const }; }
  async createUploadTarget(_key: string, contentType: string) { this.check(); return { url: "/api/private-storage/uploads", method: "PUT" as const, headers: { "content-type": contentType } }; }
  async putObject(key: string, bytes: Buffer, contentType: string, metadata: StorageObjectMetadata) { this.check(); if (memoryObjects.has(key)) throw new StorageOperationError("conflict"); memoryObjects.set(key, { bytes: Buffer.from(bytes), contentType, metadata, lastModified: new Date() }); }
  async headObject(key: string) { this.check(); const object = memoryObjects.get(key); return object ? { contentType: object.contentType, sizeBytes: object.bytes.length, metadata: object.metadata } : null; }
  async readObject(key: string) { this.check(); const object = memoryObjects.get(key); if (!object) throw new StorageOperationError("not-found"); return { bytes: Buffer.from(object.bytes), contentType: object.contentType, sizeBytes: object.bytes.length, metadata: object.metadata }; }
  async promoteObject(pendingKey: string, finalKey: string, contentType: string, metadata: StorageObjectMetadata) { this.check(); if (testFailures.failPromote) throw new StorageOperationError("unavailable", true); const pending = memoryObjects.get(pendingKey); if (!pending) throw new StorageOperationError("not-found"); if (memoryObjects.has(finalKey)) throw new StorageOperationError("conflict"); memoryObjects.set(finalKey, { ...pending, contentType, metadata, bytes: Buffer.from(pending.bytes), lastModified: new Date() }); }
  async deleteObject(key: string) { this.check(); if (testFailures.failDelete) throw new StorageOperationError("delete-pending", true); memoryObjects.delete(key); }
  async listPendingObjects(organizationId: string) { this.check(); const prefix = `organizations/${organizationId}/pending/`; return [...memoryObjects.entries()].flatMap(([key, value]) => key.startsWith(prefix) ? [{ key, lastModified: value.lastModified }] : []); }
  async createDownloadUrl() { this.check(); return null; }
}

export function resetTestStorage() {
  if (process.env.NODE_ENV !== "test" && process.env.STORAGE_TEST_MODE !== "1") throw new StorageOperationError("misconfigured");
  memoryObjects.clear();
  testFailures.unavailable = false;
  testFailures.failDelete = false;
  testFailures.failPromote = false;
}

export function configureTestStorageFailure(next: Partial<typeof testFailures>) {
  if (process.env.NODE_ENV !== "test" && process.env.STORAGE_TEST_MODE !== "1") throw new StorageOperationError("misconfigured");
  Object.assign(testFailures, next);
}

export function testStorageHas(key: string) {
  if (process.env.NODE_ENV !== "test" && process.env.STORAGE_TEST_MODE !== "1") return false;
  return memoryObjects.has(key);
}

export function getStorageAdapter(provider = process.env.PRIVATE_STORAGE_PROVIDER?.trim() || (process.env.NODE_ENV === "production" ? "" : "local-dev")): PrivateStorageAdapter {
  if (provider === "neon") return new NeonStorageAdapter();
  if (provider === "local-dev" && process.env.NODE_ENV !== "production") return new LocalStorageAdapter();
  if (provider === "test-memory" && (process.env.NODE_ENV === "test" || process.env.STORAGE_TEST_MODE === "1")) return new TestMemoryStorageAdapter();
  throw new StorageOperationError("misconfigured");
}

let availabilityCache: { value: StorageAvailability; expiresAt: number } | undefined;

export async function privateStorageAvailability() {
  if (process.env.NODE_ENV === "production" && availabilityCache && availabilityCache.expiresAt > Date.now()) return availabilityCache.value;
  try {
    const value = await getStorageAdapter().availability();
    if (process.env.NODE_ENV === "production") availabilityCache = { value, expiresAt: Date.now() + 30_000 };
    return value;
  } catch (cause) {
    const error = mapStorageFailure(cause);
    return { available: false, state: error.code === "misconfigured" ? "misconfigured" as const : "unavailable" as const };
  }
}

export async function cleanupAbandonedUploads(organizationId: string, olderThanMs = 60 * 60 * 1_000) {
  const adapter = getStorageAdapter();
  const threshold = Date.now() - olderThanMs;
  const objects = await adapter.listPendingObjects(organizationId);
  let deleted = 0;
  for (const object of objects) {
    assertOrganizationObjectKey(object.key, organizationId);
    if (object.lastModified.getTime() >= threshold) continue;
    await adapter.deleteObject(object.key);
    deleted += 1;
  }
  return deleted;
}
