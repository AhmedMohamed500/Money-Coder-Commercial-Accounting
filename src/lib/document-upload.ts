import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import type { FileKind } from "@prisma/client";
import type { AllowedDocumentMimeType } from "@/lib/document-files";

const uploadTicketSchema = z.object({
  v: z.literal(1),
  jti: z.string().uuid(),
  organizationId: z.string().uuid(),
  userId: z.string().uuid(),
  pendingKey: z.string().min(1).max(500),
  finalKey: z.string().min(1).max(500),
  originalName: z.string().min(1).max(180),
  mimeType: z.enum([
    "application/pdf",
    "image/png",
    "image/jpeg",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ]),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["LOGO", "LEGAL_DOCUMENT", "TAX_DOCUMENT", "OTHER"]),
  title: z.string().min(2).max(200),
  issuedAt: z.number().int().positive(),
  expiresAt: z.number().int().positive(),
});

export type DocumentUploadTicket = z.infer<typeof uploadTicketSchema>;

export class UploadTicketError extends Error {
  constructor(public readonly code: "invalid" | "expired") {
    super(code === "expired" ? "انتهت صلاحية تصريح الرفع." : "تصريح الرفع غير صالح.");
  }
}

function signingSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) throw new UploadTicketError("invalid");
  return secret;
}

function signature(encoded: string) {
  return createHmac("sha256", signingSecret()).update(`money-coder-document-upload.${encoded}`).digest();
}

export function uploadAuthorizationTtlSeconds() {
  const configured = Number(process.env.STORAGE_UPLOAD_TTL_SECONDS ?? 300);
  return Number.isInteger(configured) && configured >= 60 && configured <= 600 ? configured : 300;
}

export function createDocumentUploadTicket(input: {
  organizationId: string;
  userId: string;
  originalName: string;
  mimeType: AllowedDocumentMimeType;
  sizeBytes: number;
  kind: FileKind;
  title: string;
  now?: number;
  ttlSeconds?: number;
}) {
  const issuedAt = input.now ?? Math.floor(Date.now() / 1000);
  const ttlSeconds = input.ttlSeconds ?? uploadAuthorizationTtlSeconds();
  const jti = randomUUID();
  const payload: DocumentUploadTicket = {
    v: 1,
    jti,
    organizationId: input.organizationId,
    userId: input.userId,
    pendingKey: `organizations/${input.organizationId}/pending/${jti}`,
    finalKey: `organizations/${input.organizationId}/${randomUUID()}`,
    originalName: input.originalName,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
    kind: input.kind,
    title: input.title,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return { token: `${encoded}.${signature(encoded).toString("base64url")}`, payload };
}

export function verifyDocumentUploadTicket(token: string, options: { allowExpired?: boolean; now?: number } = {}) {
  if (!token || token.length > 4_096) throw new UploadTicketError("invalid");
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) throw new UploadTicketError("invalid");
  let supplied: Buffer;
  try { supplied = Buffer.from(suppliedSignature, "base64url"); } catch { throw new UploadTicketError("invalid"); }
  const expected = signature(encoded);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new UploadTicketError("invalid");
  let decoded: unknown;
  try { decoded = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")); } catch { throw new UploadTicketError("invalid"); }
  const parsed = uploadTicketSchema.safeParse(decoded);
  if (!parsed.success) throw new UploadTicketError("invalid");
  const now = options.now ?? Math.floor(Date.now() / 1000);
  const expired = parsed.data.expiresAt <= now;
  if (expired && !options.allowExpired) throw new UploadTicketError("expired");
  return { payload: parsed.data, expired };
}
