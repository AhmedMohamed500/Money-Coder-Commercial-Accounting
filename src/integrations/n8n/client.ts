import { createHmac, createHash, timingSafeEqual } from "node:crypto";

export type AutomationEvent = {
  event: "organization.created" | "engagement.accepted" | "document.uploaded";
  organizationId: string;
  entityId?: string;
  occurredAt: string;
};

export async function emitAutomationEvent(payload: AutomationEvent) {
  const url = process.env.N8N_WEBHOOK_URL;
  const secret = process.env.N8N_WEBHOOK_SECRET;
  if (!url || !secret) return { delivered: false, reason: "not-configured" as const };
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", secret).update(body).digest("hex");
  const response = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "x-money-coder-signature": signature }, body, signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error(`n8n webhook failed with ${response.status}`);
  return { delivered: true as const };
}

export type BankAutomationMode = "DISABLED" | "MOCK" | "REMOTE";

/** REMOTE stays closed until CLEAN-state scanning and durable dispatch are available. */
export function bankAutomationAvailability() {
  const requested = process.env.AUTOMATION_MODE?.trim().toUpperCase();
  const mode: BankAutomationMode = requested === "MOCK" || requested === "REMOTE" ? requested : "DISABLED";
  if (mode === "DISABLED") return { mode, available: false, reason: "خدمة معالجة المستندات غير مفعلة حاليًا." };
  if (mode === "MOCK") return process.env.NODE_ENV === "production"
    ? { mode, available: false, reason: "وضع العينات غير متاح في Production." }
    : { mode, available: true, reason: "عينات محلية اصطناعية فقط؛ لا يوجد اتصال بنكي أو PDF حقيقي." };
  const base = process.env.N8N_API_BASE_URL;
  const path = process.env.N8N_BANK_PROCESSOR_PATH;
  const auth = process.env.N8N_WEBHOOK_AUTH_KEY;
  const callback = process.env.AUTOMATION_CALLBACK_SECRET;
  let endpointValid = false;
  try {
    const url = new URL(base ?? "");
    endpointValid = url.protocol === "https:" && !!url.hostname && !["localhost", "127.0.0.1", "::1"].includes(url.hostname) && !!path?.startsWith("/");
  } catch { /* fail closed */ }
  if (!endpointValid || !auth || !callback || callback.length < 32) return { mode, available: false, reason: "إعداد الربط الحي أو سرّ الاستدعاء غير مكتمل." };
  return { mode, available: false, reason: "الربط الحي محجوب حتى اكتمال فحص الملفات والحجر ومفتاح الرفع وجدولة التنفيذ." };
}

export function signBankCallback(body: string, timestamp: string, nonce: string, secret: string) {
  return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${body}`).digest("hex");
}

export function verifyBankCallback(body: string, timestamp: string | null, nonce: string | null, signature: string | null, now = Date.now()) {
  const secret = process.env.AUTOMATION_CALLBACK_SECRET;
  const mode = bankAutomationAvailability();
  if (!mode.available || !secret || secret.length < 32 || !timestamp || !nonce || !signature) return null;
  if (!/^\d{13}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,96}$/.test(nonce) || !/^[a-f0-9]{64}$/i.test(signature)) return null;
  if (Math.abs(now - Number(timestamp)) > 5 * 60_000) return null;
  const expected = Buffer.from(signBankCallback(body, timestamp, nonce, secret), "hex");
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
  return { nonceHash: createHash("sha256").update(nonce).digest("hex"), expiresAt: new Date(Number(timestamp) + 5 * 60_000) };
}
