import { createHmac } from "node:crypto";

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
