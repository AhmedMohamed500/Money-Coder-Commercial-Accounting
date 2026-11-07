import { NextResponse } from "next/server";
import { z } from "zod";
import { automationActor, automationBadOrigin, automationDenied, automationFailure, automationJson, automationSameOrigin, privateNoStore } from "@/lib/accounting/automation-api";
import { createSyntheticJob, listAutomationJobs } from "@/lib/accounting/bank-automation-service";

type Context = { params: Promise<{ id: string }> };
const createSchema = z.object({ bankAccountId: z.uuid(), idempotencyKey: z.string().min(16).max(120).regex(/^[a-zA-Z0-9_-]+$/) }).strict();

export async function GET(request: Request, { params }: Context) {
  const { id } = await params;
  if (!await automationActor(id, "automation:jobs:view")) return automationDenied();
  const url = new URL(request.url);
  const from = url.searchParams.get("from"); const to = url.searchParams.get("to");
  const parseDate = (value: string | null) => value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00.000Z`) : undefined;
  return NextResponse.json(await listAutomationJobs(id, { search: url.searchParams.get("search")?.slice(0, 120), status: url.searchParams.get("status") ?? undefined, from: parseDate(from), to: parseDate(to), page: Number(url.searchParams.get("page") ?? 1) || 1 }), { headers: privateNoStore });
}

export async function POST(request: Request, { params }: Context) {
  const { id } = await params;
  const actor = await automationActor(id, "automation:jobs:create");
  if (!actor) return automationDenied();
  if (!automationSameOrigin(request)) return automationBadOrigin();
  try {
    const parsed = createSchema.safeParse(await automationJson(request));
    if (!parsed.success) return NextResponse.json({ error: "طلب المعالجة غير صالح." }, { status: 400, headers: privateNoStore });
    const result = await createSyntheticJob(id, actor, parsed.data.bankAccountId, parsed.data.idempotencyKey);
    return NextResponse.json(result, { status: result.duplicate ? 200 : 201, headers: privateNoStore });
  } catch (error) { return automationFailure(error); }
}
