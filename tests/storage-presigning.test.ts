import { afterEach, describe, expect, it, vi } from "vitest";
import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getStorageAdapter, type StorageObjectMetadata } from "@/lib/storage";

const organizationId = "11111111-1111-4111-8111-111111111111";
const key = `organizations/${organizationId}/pending/33333333-3333-4333-8333-333333333333`;
const metadata: StorageObjectMetadata = {
  organizationId,
  uploadedById: "22222222-2222-4222-8222-222222222222",
  uploadId: "44444444-4444-4444-8444-444444444444",
  declaredMime: "application/pdf",
  declaredSize: "25",
};

function configureFictionalNeonStorage() {
  vi.stubEnv("PRIVATE_STORAGE_PROVIDER", "neon");
  vi.stubEnv("PRIVATE_STORAGE_BUCKET", "money-coder-test");
  vi.stubEnv("PRIVATE_STORAGE_ACCESS", "private");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "fictional-access-key");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "fictional-secret-key");
  vi.stubEnv("AWS_ENDPOINT_URL_S3", "https://fictional-storage.neon.tech");
  vi.stubEnv("AWS_REGION", "eu-central-1");
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("Neon presigned browser upload", () => {
  it("uses an exact-size POST policy with signed content type and metadata", async () => {
    configureFictionalNeonStorage();

    const target = await getStorageAdapter("neon").createUploadTarget(key, "application/pdf", metadata, 300);
    expect(target.method).toBe("POST");
    if (target.method !== "POST") throw new Error("Expected a presigned POST target");
    const policy = JSON.parse(Buffer.from(target.fields.Policy, "base64").toString("utf8")) as {conditions:unknown[]};

    expect(target.headers).toEqual({});
    expect(target.fields["Content-Type"]).toBe("application/pdf");
    expect(target.fields["x-amz-meta-organization-id"]).toBe(metadata.organizationId);
    expect(target.fields["x-amz-meta-uploaded-by"]).toBe(metadata.uploadedById);
    expect(target.fields["x-amz-meta-upload-id"]).toBe(metadata.uploadId);
    expect(target.fields["x-amz-meta-declared-mime"]).toBe(metadata.declaredMime);
    expect(target.fields["x-amz-meta-declared-size"]).toBe(metadata.declaredSize);
    expect(policy.conditions).toContainEqual(["content-length-range", 25, 25]);
    expect(policy.conditions).toContainEqual({ key });
    expect(policy.conditions).toContainEqual({ "Content-Type": "application/pdf" });
    expect(JSON.stringify(target)).not.toContain("fictional-secret-key");
  });

  it("paginates pending object listings without repeating continuation tokens", async () => {
    configureFictionalNeonStorage();
    const firstKey = `organizations/${organizationId}/pending/55555555-5555-4555-8555-555555555555`;
    const secondKey = `organizations/${organizationId}/pending/66666666-6666-4666-8666-666666666666`;
    const send = vi.spyOn(S3Client.prototype, "send");
    send.mockResolvedValueOnce({ Contents: [{ Key: firstKey, LastModified: new Date(1) }], NextContinuationToken: "page-2" } as never);
    send.mockResolvedValueOnce({ Contents: [{ Key: secondKey, LastModified: new Date(2) }] } as never);

    const objects = await getStorageAdapter("neon").listPendingObjects(organizationId);
    const secondCommand = send.mock.calls[1][0];

    expect(objects.map(object => object.key)).toEqual([firstKey, secondKey]);
    expect(secondCommand).toBeInstanceOf(ListObjectsV2Command);
    expect((secondCommand as ListObjectsV2Command).input.ContinuationToken).toBe("page-2");
  });
});
