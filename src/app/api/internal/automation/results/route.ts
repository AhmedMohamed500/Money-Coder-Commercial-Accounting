import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyBankCallback } from "@/integrations/n8n/client";
import { AutomationError, ingestBankResult } from "@/lib/accounting/bank-automation-service";
import { BankContractError } from "@/lib/accounting/bank-contract";

const headers = { "cache-control": "no-store" };
export async function POST(request: Request) {
  const max = 512_000;
  if (Number(request.headers.get("content-length") ?? 0) > max) return NextResponse.json({ error: "Payload too large" }, { status: 413, headers });
  const reader = request.body?.getReader();
  const parts: Uint8Array[] = []; let total = 0;
  if (reader) {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > max) { await reader.cancel(); return NextResponse.json({ error: "Payload too large" }, { status: 413, headers }); }
      parts.push(chunk.value);
    }
  }
  const body = Buffer.concat(parts).toString("utf8");
  const verified = verifyBankCallback(body, request.headers.get("x-mc-timestamp"), request.headers.get("x-mc-nonce"), request.headers.get("x-mc-signature"));
  if (!verified) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
  let raw: unknown;
  try { raw = JSON.parse(body); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers }); }
  const jobId = z.object({ jobId: z.uuid() }).safeParse(raw);
  if (!jobId.success) return NextResponse.json({ error: "Invalid job" }, { status: 400, headers });
  try { return NextResponse.json(await ingestBankResult(jobId.data.jobId, raw, verified), { headers }); }
  catch (error) {
    if (error instanceof AutomationError || error instanceof BankContractError) return NextResponse.json({ error: error.message }, { status: error.status, headers });
    throw error;
  }
}
