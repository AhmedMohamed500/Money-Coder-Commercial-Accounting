import { afterEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  query: vi.fn(async () => 1),
  storageAvailability: vi.fn(async () => ({ available: true, state: "connected" as const })),
}));

vi.mock("@/lib/db", () => ({ db: { $queryRaw: dependencies.query } }));
vi.mock("@/lib/storage", () => ({ privateStorageAvailability: dependencies.storageAvailability }));

import { GET as health } from "@/app/api/health/route";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe("health upload status", () => {
  it("reports connected storage separately from disabled document uploads", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgresql://health-user:fictional-password@db.example.com/app?sslmode=require");
    vi.stubEnv("SMTP_HOST", "smtp.example.com");
    vi.stubEnv("SMTP_USER", "health-user");
    vi.stubEnv("SMTP_PASSWORD", "fictional-smtp-password");
    vi.stubEnv("EMAIL_FROM", "health@example.com");
    vi.stubEnv("PRIVATE_STORAGE_UPLOAD_MODE", "disabled");

    const response = await health();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.privateStorage).toBe("connected");
    expect(body.documentUploads).toEqual({ mode: "disabled", acceptingNewUploads: false, acceptingFinalization: false });
    expect(JSON.stringify(body)).not.toContain("fictional-password");
    expect(JSON.stringify(body)).not.toContain("fictional-smtp-password");
  });
});
