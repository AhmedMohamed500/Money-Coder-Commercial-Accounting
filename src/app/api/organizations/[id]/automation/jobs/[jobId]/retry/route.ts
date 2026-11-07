import { NextResponse } from "next/server";
import { z } from "zod";
import { automationActor, automationBadOrigin, automationDenied, automationFailure, automationJson, automationSameOrigin, privateNoStore } from "@/lib/accounting/automation-api";
import { retrySyntheticJob } from "@/lib/accounting/bank-automation-service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string; jobId: string }> }) {
  const { id, jobId } = await params;
  const actor = await automationActor(id, "automation:jobs:retry");
  if (!actor) return automationDenied();
  if (!automationSameOrigin(request)) return automationBadOrigin();
  try {
    const parsed = z.object({ revision: z.number().int().positive() }).strict().safeParse(await automationJson(request));
    if (!parsed.success || !z.uuid().safeParse(jobId).success) return NextResponse.json({ error: "طلب غير صالح." }, { status: 400, headers: privateNoStore });
    return NextResponse.json(await retrySyntheticJob(id, jobId, actor, parsed.data.revision), { headers: privateNoStore });
  } catch (error) { return automationFailure(error); }
}
