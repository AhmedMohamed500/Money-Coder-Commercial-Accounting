import { afterEach, describe, expect, it, vi } from "vitest";
import { createHmac } from "node:crypto";
import { documentHash, documentIsClean } from "@/lib/document-gateway";
import { HttpDocumentScanner, ScannerUnavailableError } from "@/lib/document-scanner";

const bytes = Buffer.from("%PDF-1.7\nsynthetic scanner contract\n%%EOF");
const hash = documentHash(bytes);
const secret = "synthetic-test-scanner-secret-at-least-32-characters";

afterEach(() => { vi.unstubAllGlobals(); delete process.env.DOCUMENT_SCANNER_URL; delete process.env.DOCUMENT_SCANNER_SHARED_SECRET; delete process.env.DOCUMENT_SCANNER_PRIVATE_NETWORK_VERIFIED; });
function configure() { process.env.DOCUMENT_SCANNER_URL = "https://scanner.private.test/scan"; process.env.DOCUMENT_SCANNER_SHARED_SECRET = secret; process.env.DOCUMENT_SCANNER_PRIVATE_NETWORK_VERIFIED = "true"; }

describe("authenticated scanner contract", () => {
  it("fails closed when the private scanner has not been verified", async () => {
    process.env.DOCUMENT_SCANNER_URL = "https://scanner.private.test/scan";
    process.env.DOCUMENT_SCANNER_SHARED_SECRET = secret;
    await expect(new HttpDocumentScanner().scan(bytes, hash)).rejects.toBeInstanceOf(ScannerUnavailableError);
  });
  it("rejects an unauthenticated clean verdict", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ verdict: "CLEAN", sha256: hash, engine: "ClamAV", signatureVersion: "synthetic", signaturesUpdatedAt: new Date().toISOString(), engineReady: true }), { status: 200, headers: { "x-mc-signature": "0".repeat(64) } })));
    await expect(new HttpDocumentScanner().scan(bytes, hash)).rejects.toBeInstanceOf(ScannerUnavailableError);
  });
  it("rejects a scanner timeout", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async () => { throw new DOMException("timed out", "AbortError"); }));
    await expect(new HttpDocumentScanner().scan(bytes, hash)).rejects.toBeInstanceOf(ScannerUnavailableError);
  });
  it("accepts only a signed matching synthetic verdict", async () => {
    configure();
    vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
      const nonce = (init.headers as Record<string, string>)["x-mc-nonce"];
      const body = JSON.stringify({ verdict: "CLEAN", sha256: hash, engine: "synthetic-adapter", signatureVersion: "synthetic", signaturesUpdatedAt: new Date().toISOString(), engineReady: true });
      const signature = createHmac("sha256", secret).update(`v1\n${nonce}\n${body}`).digest("hex");
      return new Response(body, { status: 200, headers: { "x-mc-signature": signature } });
    }));
    expect((await new HttpDocumentScanner().scan(bytes, hash)).verdict).toBe("CLEAN");
  });
});

describe("central document release policy", () => {
  const clean = { scanStatus: "CLEAN", sha256: hash, scannedSha256: hash, releaseKey: "organizations/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222", scanValidUntil: new Date(Date.now() + 60_000), deletedAt: null };
  it("releases only a current matching clean verdict", () => {
    expect(documentIsClean(clean)).toBe(true);
    expect(documentIsClean({ ...clean, scanStatus: "PENDING_SCAN" })).toBe(false);
    expect(documentIsClean({ ...clean, scannedSha256: "0".repeat(64) })).toBe(false);
    expect(documentIsClean({ ...clean, scanValidUntil: new Date(0) })).toBe(false);
    expect(documentIsClean({ ...clean, deletedAt: new Date() })).toBe(false);
  });
});
