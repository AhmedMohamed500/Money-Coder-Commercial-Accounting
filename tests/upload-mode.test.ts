import { afterEach, describe, expect, it, vi } from "vitest";
import { privateStorageUploadMode } from "@/lib/config";

const previousMode = process.env.PRIVATE_STORAGE_UPLOAD_MODE;
afterEach(() => { if (previousMode === undefined) delete process.env.PRIVATE_STORAGE_UPLOAD_MODE; else process.env.PRIVATE_STORAGE_UPLOAD_MODE = previousMode; vi.unstubAllEnvs(); });

describe("fail-closed document upload mode", () => {
  it("defaults to disabled in production even when credentials are present", () => {
    vi.stubEnv("NODE_ENV", "production");
    delete process.env.PRIVATE_STORAGE_UPLOAD_MODE;
    process.env.PRIVATE_STORAGE_PROVIDER = "neon";
    expect(privateStorageUploadMode()).toBe("disabled");
    process.env.PRIVATE_STORAGE_UPLOAD_MODE = "unknown";
    expect(privateStorageUploadMode()).toBe("disabled");
    delete process.env.PRIVATE_STORAGE_PROVIDER;
  });
  it("recognizes the three explicit modes", () => {
    for (const mode of ["disabled", "drain", "enabled"]) { process.env.PRIVATE_STORAGE_UPLOAD_MODE = mode; expect(privateStorageUploadMode()).toBe(mode); }
  });
});
