import { afterEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({
  getSessionUser: vi.fn(async () => ({ id: "22222222-2222-4222-8222-222222222222" })),
  authorizeOrganization: vi.fn(async () => true),
}));

vi.mock("@/lib/auth", () => auth);

import { privateStorageConfiguration, privateStorageUploadPolicy } from "@/lib/config";
import { POST as beginUpload } from "@/app/api/organizations/[id]/documents/uploads/route";
import { POST as finalizeUpload } from "@/app/api/organizations/[id]/documents/route";

const organizationId = "11111111-1111-4111-8111-111111111111";
const routeContext = { params: Promise.resolve({ id: organizationId }) };

function setProductionStorageCredentials() {
  vi.stubEnv("NODE_ENV", "production");
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
  vi.clearAllMocks();
});

describe("private storage upload mode", () => {
  it.each([
    ["disabled", false, false],
    ["drain", false, true],
    ["enabled", true, true],
  ] as const)("implements %s mode", (mode, acceptsNewUploads, acceptsFinalization) => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", mode);

    expect(privateStorageUploadPolicy()).toEqual({ mode, acceptsNewUploads, acceptsFinalization });
  });

  it.each([undefined, "", "unexpected", "ENABLED"])("fails closed in Production for %s", value => {
    vi.stubEnv("NODE_ENV", "production");
    if (value === undefined) vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", undefined);
    else vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", value);

    expect(privateStorageUploadPolicy()).toEqual({ mode: "disabled", acceptsNewUploads: false, acceptsFinalization: false });
  });

  it("does not enable uploads when valid Production storage credentials are added", () => {
    setProductionStorageCredentials();
    vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", "");

    expect(privateStorageConfiguration().configured).toBe(true);
    expect(privateStorageUploadPolicy().mode).toBe("disabled");
  });

  it("blocks direct API attempts while Production uploads are disabled", async () => {
    setProductionStorageCredentials();
    vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", "disabled");

    const initResponse = await beginUpload(new Request(`http://local.test/api/organizations/${organizationId}/documents/uploads`, { method: "POST" }), routeContext);
    const finalizeResponse = await finalizeUpload(new Request(`http://local.test/api/organizations/${organizationId}/documents`, { method: "POST" }), routeContext);

    expect(initResponse.status).toBe(503);
    expect(finalizeResponse.status).toBe(503);
    expect(auth.getSessionUser).toHaveBeenCalledTimes(2);
    expect(auth.authorizeOrganization).toHaveBeenCalledTimes(2);
  });
});
